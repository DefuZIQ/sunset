package com.sunset.order.service;

import com.sunset.order.dto.ProductRequest;
import com.sunset.order.dto.ProductResponse;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class ProductService {

    private Map<String, ProductResponse> products = new HashMap<>();

    // Пример добавления нового продукта
    public ProductResponse addProduct(ProductRequest productRequest) {
        String productId = UUID.randomUUID().toString();
        ProductResponse productResponse = new ProductResponse(
                productId,
                productRequest.getName(),
                productRequest.getDescription(),
                productRequest.getPrice(),
                productRequest.getQuantity()
        );
        products.put(productId, productResponse);
        return productResponse;
    }

    // Пример получения продукта по ID
    public ProductResponse getProduct(String productId) {
        return products.get(productId);
    }

    // Пример обновления продукта
    public ProductResponse updateProduct(String productId, ProductRequest productRequest) {
        ProductResponse productResponse = products.get(productId);
        if (productResponse != null) {
            productResponse.setName(productRequest.getName());
            productResponse.setDescription(productRequest.getDescription());
            productResponse.setPrice(productRequest.getPrice());
            productResponse.setQuantity(productRequest.getQuantity());
        }
        return productResponse;
    }

    // Пример удаления продукта
    public boolean deleteProduct(String productId) {
        return products.remove(productId) != null;
    }
}
