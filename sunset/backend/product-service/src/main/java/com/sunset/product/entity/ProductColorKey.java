package com.sunset.product.model;

import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

@Embeddable
public class ProductColorKey implements Serializable {

    private UUID productId;
    private UUID colorId;

    public ProductColorKey() {}

    public ProductColorKey(UUID productId, UUID colorId) {
        this.productId = productId;
        this.colorId = colorId;
    }

    public UUID getProductId() {
        return productId;
    }

    public void setProductId(UUID productId) {
        this.productId = productId;
    }

    public UUID getColorId() {
        return colorId;
    }

    public void setColorId(UUID colorId) {
        this.colorId = colorId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ProductColorKey that)) return false;
        return Objects.equals(productId, that.productId) && Objects.equals(colorId, that.colorId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(productId, colorId);
    }
}
