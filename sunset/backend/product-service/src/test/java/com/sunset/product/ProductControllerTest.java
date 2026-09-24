package com.sunset.product;

import com.sunset.product.controller.ProductController;
import com.sunset.product.dto.ProductDTO;
import com.sunset.product.dto.ProductUuidRequest;
import com.sunset.product.service.AdminProductService;
import com.sunset.product.service.ProductService;
import com.sunset.product.service.ReviewService;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ProductControllerTest {
    private final ProductService products = mock(ProductService.class);
    private final ProductController controller = new ProductController(products, mock(AdminProductService.class), mock(ReviewService.class));

    @Test void rejectsMissingProductId() {
        assertEquals(400, controller.getProductByUuid(null).getStatusCode().value());
        assertEquals(400, controller.getProductByUuid(new ProductUuidRequest()).getStatusCode().value());
    }

    @Test void returnsNotFoundForUnknownProduct() {
        UUID id = UUID.randomUUID();
        ProductUuidRequest request = new ProductUuidRequest();
        request.setId(id);
        when(products.getProductById(id)).thenReturn(Optional.empty());
        assertEquals(404, controller.getProductByUuid(request).getStatusCode().value());
    }

    @Test void returnsExistingProduct() {
        UUID id = UUID.randomUUID();
        ProductUuidRequest request = new ProductUuidRequest();
        request.setId(id);
        ProductDTO product = new ProductDTO();
        when(products.getProductById(id)).thenReturn(Optional.of(product));
        var response = controller.getProductByUuid(request);
        assertEquals(200, response.getStatusCode().value());
        assertSame(product, response.getBody());
    }
}
