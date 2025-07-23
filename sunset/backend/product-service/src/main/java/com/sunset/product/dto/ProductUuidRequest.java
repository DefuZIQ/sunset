package com.sunset.product.dto;

import java.util.UUID;

public class ProductUuidRequest {
    private UUID id;

    public ProductUuidRequest() {}

    public ProductUuidRequest(UUID id) {
        this.id = id;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }
}
