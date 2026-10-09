package com.sunset.product.controller;

import com.sunset.product.dto.ProductDTO;
import com.sunset.product.service.ProductService;
import com.sunset.product.service.AdminProductService;
import com.sunset.product.service.ReviewService;
import com.sunset.product.service.ReviewPhotoService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.sunset.product.dto.ProductUuidRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.io.IOException;

@RestController
@RequestMapping("/products")
public class ProductController {

    private final ProductService productService;
    private final AdminProductService adminProductService;
    private final ReviewService reviewService;
    private final ReviewPhotoService reviewPhotoService;

    public ProductController(ProductService productService, AdminProductService adminProductService, ReviewService reviewService, ReviewPhotoService reviewPhotoService) {
        this.productService = productService;
        this.adminProductService = adminProductService;
        this.reviewService = reviewService;
        this.reviewPhotoService = reviewPhotoService;
    }

    @GetMapping("/all")
    public List<ProductDTO> getAllProducts() {
        return productService.getProducts();
    }

    @PostMapping("/by-uuid")
    public ResponseEntity<ProductDTO> getProductByUuid(@RequestBody ProductUuidRequest request) {
        if (request == null || request.getId() == null) {
            throw new IllegalArgumentException("Укажите UUID товара");
        }

        return productService.getProductById(request.getId())
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Товар не найден"));

    }

    @PostMapping("/admin")
    public ResponseEntity<?> create(@RequestHeader("user-id") UUID userId, @RequestBody Map<String,Object> request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminProductService.create(userId, request));
    }

    @GetMapping("/admin/variants")
    public Object variants(@RequestHeader("user-id") UUID userId) {
        return adminProductService.variants(userId);
    }

    @DeleteMapping("/admin/{id}")
    public ResponseEntity<?> delete(@RequestHeader("user-id") UUID userId, @PathVariable("id") UUID id) {
        adminProductService.delete(userId,id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/admin/{id}")
    public Object update(@RequestHeader("user-id") UUID userId, @PathVariable("id") UUID id, @RequestBody Map<String,Object> request) {
        return adminProductService.update(userId,id,request);
    }

    @PutMapping("/admin/{id}/stock")
    public Object updateStock(@RequestHeader("user-id") UUID userId, @PathVariable("id") UUID id, @RequestBody Map<String,Object> request) {
        return adminProductService.updateStock(userId,id,request);
    }

    @GetMapping("/reviews/{id}")
    public Object reviews(@PathVariable("id") UUID id) { return reviewService.list(id); }

    @PostMapping("/review/{id}")
    public Object saveReview(@RequestHeader("user-id") UUID userId, @PathVariable("id") UUID id, @RequestBody Map<String,Object> request) { return reviewService.save(userId,id,request); }

    @PostMapping("/review/{id}/photo")
    public Object uploadReviewPhoto(@RequestHeader("user-id") UUID userId, @PathVariable("id") UUID id, @RequestParam("file") MultipartFile file) throws IOException {
        return reviewPhotoService.upload(userId, id, file);
    }

    @GetMapping("/review-photos/{id}")
    public ResponseEntity<byte[]> reviewPhoto(@PathVariable("id") UUID id) {
        ReviewPhotoService.Photo photo = reviewPhotoService.readPublished(id);
        return ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL, "no-store")
                .header("X-Content-Type-Options", "nosniff")
                .contentType(MediaType.parseMediaType(photo.contentType())).body(photo.bytes());
    }

    @PutMapping("/reviews/{id}/helpful")
    public Object markReviewHelpful(@RequestHeader("user-id") UUID userId, @PathVariable("id") UUID id) { return reviewService.markHelpful(userId,id); }

    @GetMapping("/admin/reviews")
    public Object adminReviews(@RequestHeader("user-id") UUID userId) { return reviewService.adminList(userId); }

    @PutMapping("/admin/reviews/{id}/reply")
    public Object saveStoreReply(@RequestHeader("user-id") UUID userId, @PathVariable("id") UUID id, @RequestBody Map<String,Object> request) { return reviewService.saveStoreReply(userId,id,request); }

    @PutMapping("/admin/reviews/{id}/moderation")
    public Object moderateReview(@RequestHeader("user-id") UUID userId, @PathVariable("id") UUID id, @RequestBody Map<String,Object> request) { return reviewService.setHidden(userId,id,request); }

    @GetMapping("/categories/tree")
    public Object categoryTree() { return reviewService.categoryTree(); }

}
