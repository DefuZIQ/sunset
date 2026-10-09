package com.sunset.product;

import com.sunset.product.controller.ProductController;
import com.sunset.product.dto.ProductDTO;
import com.sunset.product.dto.ProductUuidRequest;
import com.sunset.product.service.AdminProductService;
import com.sunset.product.service.ProductService;
import com.sunset.product.service.ReviewService;
import com.sunset.product.service.ReviewPhotoService;
import org.springframework.web.server.ResponseStatusException;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ProductControllerTest {
    private final ProductService products = mock(ProductService.class);
    private final ProductController controller = new ProductController(products, mock(AdminProductService.class), mock(ReviewService.class), mock(ReviewPhotoService.class));

    @Test void rejectsMissingProductId() {
        assertThrows(IllegalArgumentException.class, () -> controller.getProductByUuid(null));
        assertThrows(IllegalArgumentException.class, () -> controller.getProductByUuid(new ProductUuidRequest()));
    }

    @Test void returnsNotFoundForUnknownProduct() {
        UUID id = UUID.randomUUID();
        ProductUuidRequest request = new ProductUuidRequest();
        request.setId(id);
        when(products.getProductById(id)).thenReturn(Optional.empty());
        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> controller.getProductByUuid(request));
        assertEquals(404, error.getStatusCode().value());
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
