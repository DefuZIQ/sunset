package com.sunset.product.service;

import com.sunset.product.dto.ProductDTO;
import com.sunset.product.dto.ProductDTO.ColorDTO;
import com.sunset.product.dto.ProductDTO.StockDTO;
import com.sunset.product.model.Color;
import com.sunset.product.model.Product;
import com.sunset.product.repository.ProductCategoryRepository;
import com.sunset.product.repository.ProductColorRepository;
import com.sunset.product.repository.ProductRepository;
import com.sunset.product.repository.ProductStockRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductCategoryRepository productCategoryRepository;
    private final ProductColorRepository productColorRepository;
    private final ProductStockRepository productStockRepository;
    private final JdbcTemplate jdbc;

    public ProductService(
            ProductRepository productRepository,
            ProductCategoryRepository productCategoryRepository,
            ProductColorRepository productColorRepository,
            ProductStockRepository productStockRepository,
            JdbcTemplate jdbc
    ) {
        this.productRepository = productRepository;
        this.productCategoryRepository = productCategoryRepository;
        this.productColorRepository = productColorRepository;
        this.productStockRepository = productStockRepository;
        this.jdbc = jdbc;
    }

    public List<ProductDTO> getProducts() {
        List<Product> products = productRepository.findAllWithFullDetails();
        return products.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public Optional<ProductDTO> getProductById(UUID id) {
        return productRepository.findById(id)
                .map(this::mapToDTO);
    }

    private ProductDTO mapToDTO(Product product) {
        String imageUrl = product.getImages().stream()
                .map(pi -> pi.getImage().getUrl())
                .findFirst()
                .orElse(null);

        ProductDTO dto = new ProductDTO(
                product.getId(),
                product.getName(),
                product.getDescription(),
                product.getPrice(),
                imageUrl
        );
        dto.setGender(product.getGender());

        // Возвращаем полный путь от родительской категории до выбранной конечной
        // подкатегории. Корневой раздел пола не дублируем: он уже есть в gender.
        List<String> categories = jdbc.query("""
                WITH RECURSIVE category_path AS (
                    SELECT c.id,c.name,c.parent_id,0 AS depth
                    FROM categories c
                    JOIN product_categories pc ON pc.category_id=c.id
                    WHERE pc.product_id=?
                    UNION ALL
                    SELECT parent.id,parent.name,parent.parent_id,path.depth+1
                    FROM categories parent
                    JOIN category_path path ON path.parent_id=parent.id
                )
                SELECT name FROM category_path
                WHERE name NOT IN ('Для женщин','Для мужчин')
                GROUP BY name,depth
                ORDER BY depth DESC,name
                """, (rs,n) -> rs.getString("name"), product.getId());
        dto.setCategories(categories);

        // Добавляем цвета
        List<ColorDTO> colors = productColorRepository.findByProductId(product.getId())
                .stream()
                .map(rel -> {
                    Color color = rel.getColor();
                    ColorDTO colorDTO = new ColorDTO();
                    colorDTO.setId(color.getId());
                    colorDTO.setName(color.getName());
                    colorDTO.setHexCode(color.getHexCode());
                    return colorDTO;
                })
                .collect(Collectors.toList());
        dto.setColors(colors);

        // Добавляем наличие по размерам и цветам (склад)
        List<StockDTO> stockList = productStockRepository.findByProductId(product.getId())
                .stream()
                .map(stock -> {
                    StockDTO stockDTO = new StockDTO();
                    stockDTO.setSizeId(stock.getSize().getId());
                    stockDTO.setSizeName(stock.getSize().getName());
                    stockDTO.setSizeType(stock.getSize().getType());
                    stockDTO.setSizeGender(stock.getSize().getGender());
                    stockDTO.setSizeDescription(stock.getSize().getDescription());
                    stockDTO.setColorId(stock.getColor().getId());
                    stockDTO.setColorName(stock.getColor().getName());
                    stockDTO.setQuantity(stock.getQuantity());
                    return stockDTO;
                })
                .collect(Collectors.toList());
        dto.setStock(stockList);

        Map<String, Object> reviewStats = jdbc.queryForMap(
                "SELECT COALESCE(ROUND(AVG(rating)::numeric,1),0) AS rating, COUNT(*) AS count FROM product_reviews WHERE product_id=? AND NOT is_hidden",
                product.getId());
        dto.setRating(((Number) reviewStats.get("rating")).doubleValue());
        dto.setReviewCount(((Number) reviewStats.get("count")).intValue());

        return dto;
    }
}
