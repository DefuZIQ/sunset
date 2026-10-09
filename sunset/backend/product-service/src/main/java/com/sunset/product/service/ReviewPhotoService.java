package com.sunset.product.service;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ReviewPhotoService {
    private static final int MAX_BYTES = 5 * 1024 * 1024;
    private static final int MAX_PIXELS = 16_000_000;
    private static final int MAX_SIDE = 2_400;
    private static final String PATH_PREFIX = "/api/v1/products/review-photos/";
    private final JdbcTemplate jdbc;

    public ReviewPhotoService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public static String path(UUID id) { return PATH_PREFIX + id; }

    @Transactional
    public Map<String, String> upload(UUID userId, UUID productId, MultipartFile file) throws IOException {
        if (file == null || file.isEmpty() || file.getSize() > MAX_BYTES) {
            throw new IllegalArgumentException("Выберите фото размером до 5 МБ");
        }
        if (jdbc.queryForObject("SELECT COUNT(*) FROM products WHERE id=?", Integer.class, productId) == 0) {
            throw new IllegalArgumentException("Товар не найден");
        }
        Integer pending = jdbc.queryForObject("SELECT COUNT(*) FROM product_review_photos p WHERE p.user_id=? AND NOT EXISTS (SELECT 1 FROM product_reviews r WHERE r.product_id=p.product_id AND r.user_id=p.user_id AND r.photo_url=CONCAT(?,p.id::text))",
                Integer.class, userId, PATH_PREFIX);
        if (pending != null && pending >= 5) throw new IllegalArgumentException("Слишком много несохранённых фото. Сохраните отзыв перед новой загрузкой");
        byte[] source = file.getBytes();
        String format = format(source);
        byte[] normalized;
        try { normalized = normalize(source, format); }
        catch (IOException error) { throw new IllegalArgumentException("Файл не является корректным изображением", error); }
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO product_review_photos(id,product_id,user_id,content_type,image_data) VALUES (?,?,?,?,?)",
                id, productId, userId, format.equals("jpeg") ? "image/jpeg" : "image/png", normalized);
        return Map.of("photoUrl", path(id));
    }

    public boolean ownedBy(UUID userId, UUID productId, UUID photoId) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS(SELECT 1 FROM product_review_photos WHERE id=? AND user_id=? AND product_id=?)",
                Boolean.class, photoId, userId, productId));
    }

    public Photo readPublished(UUID photoId) {
        List<Photo> rows = jdbc.query("SELECT p.content_type,p.image_data FROM product_review_photos p JOIN product_reviews r ON r.product_id=p.product_id AND r.user_id=p.user_id WHERE p.id=? AND r.photo_url=CONCAT(?,p.id::text) AND NOT r.is_hidden",
                (rs, row) -> new Photo(rs.getString(1), rs.getBytes(2)), photoId, PATH_PREFIX);
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Фото не найдено");
        return rows.get(0);
    }

    public void removeUnused(UUID userId, UUID productId, String retainedUrl) {
        jdbc.update("DELETE FROM product_review_photos WHERE user_id=? AND product_id=? AND CONCAT(?,id::text)<>?",
                userId, productId, PATH_PREFIX, retainedUrl);
    }

    @Scheduled(initialDelay = 3_600_000, fixedDelay = 86_400_000)
    @Transactional
    public void cleanupOrphans() {
        jdbc.update("DELETE FROM product_review_photos p WHERE p.created_at < NOW() - INTERVAL '1 day' AND NOT EXISTS (SELECT 1 FROM product_reviews r WHERE r.product_id=p.product_id AND r.user_id=p.user_id AND r.photo_url=CONCAT(?,p.id::text))",
                PATH_PREFIX);
    }

    private static String format(byte[] bytes) {
        if (bytes.length >= 3 && (bytes[0] & 0xff) == 0xff && (bytes[1] & 0xff) == 0xd8 && (bytes[2] & 0xff) == 0xff) return "jpeg";
        if (bytes.length >= 8 && (bytes[0] & 0xff) == 0x89 && bytes[1] == 'P' && bytes[2] == 'N' && bytes[3] == 'G'
                && bytes[4] == 13 && bytes[5] == 10 && bytes[6] == 26 && bytes[7] == 10) return "png";
        throw new IllegalArgumentException("Поддерживаются только файлы JPEG и PNG");
    }

    private static byte[] normalize(byte[] source, String format) throws IOException {
        try (ImageInputStream input = ImageIO.createImageInputStream(new ByteArrayInputStream(source))) {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) throw new IllegalArgumentException("Файл не является изображением");
            ImageReader reader = readers.next();
            try {
                reader.setInput(input, true, true);
                if (!format.equalsIgnoreCase(reader.getFormatName())) throw new IllegalArgumentException("Тип файла не совпадает с содержимым");
                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                if (width < 1 || height < 1 || (long) width * height > MAX_PIXELS) {
                    throw new IllegalArgumentException("Разрешение фотографии слишком большое");
                }
                BufferedImage image = reader.read(0);
                double scale = Math.min(1.0, (double) MAX_SIDE / Math.max(width, height));
                int targetWidth = Math.max(1, (int) Math.round(width * scale));
                int targetHeight = Math.max(1, (int) Math.round(height * scale));
                BufferedImage clean = new BufferedImage(targetWidth, targetHeight,
                        format.equals("jpeg") ? BufferedImage.TYPE_INT_RGB : BufferedImage.TYPE_INT_ARGB);
                Graphics2D graphics = clean.createGraphics();
                try {
                    graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
                    graphics.drawImage(image, 0, 0, targetWidth, targetHeight, null);
                } finally { graphics.dispose(); }
                ByteArrayOutputStream output = new ByteArrayOutputStream();
                if (!ImageIO.write(clean, format, output)) throw new IllegalArgumentException("Не удалось обработать фото");
                byte[] normalized = output.toByteArray();
                if (normalized.length > MAX_BYTES) throw new IllegalArgumentException("После обработки фото превышает 5 МБ");
                return normalized;
            } finally { reader.dispose(); }
        }
    }

    public record Photo(String contentType, byte[] bytes) {}
}
