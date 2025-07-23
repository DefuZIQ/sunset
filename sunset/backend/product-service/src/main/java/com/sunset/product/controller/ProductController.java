package com.sunset.product.controller;

import com.sunset.product.dto.ProductDTO;
import com.sunset.product.service.ProductService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.sunset.product.dto.ProductUuidRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;

@RestController
@RequestMapping("/products")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping("/all")
    public List<ProductDTO> getAllProducts() {
        return productService.getProducts();
    }

    @PostMapping("/by-uuid")
    public ResponseEntity<ProductDTO> getProductByUuid(@RequestBody ProductUuidRequest request) {
        if (request == null || request.getId() == null) {
            return ResponseEntity.badRequest().build();
        }

        return productService.getProductById(request.getId())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());

    }
}
