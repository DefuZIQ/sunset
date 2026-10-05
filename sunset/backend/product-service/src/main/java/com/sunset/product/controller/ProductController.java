package com.sunset.product.controller;

import com.sunset.product.dto.ProductDTO;
import com.sunset.product.service.ProductService;
import com.sunset.product.service.AdminProductService;
import com.sunset.product.service.ReviewService;
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
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/products")
public class ProductController {

    private final ProductService productService;
    private final AdminProductService adminProductService;
    private final ReviewService reviewService;

    public ProductController(ProductService productService, AdminProductService adminProductService, ReviewService reviewService) {
        this.productService = productService;
        this.adminProductService = adminProductService;
        this.reviewService = reviewService;
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

    @GetMapping("/categories/tree")
    public Object categoryTree() { return reviewService.categoryTree(); }

}
