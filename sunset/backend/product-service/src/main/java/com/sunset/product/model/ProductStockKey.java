package com.sunset.product.model;

import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

@Embeddable
public class ProductStockKey implements Serializable {

    private UUID productId;
    private UUID sizeId;
    private UUID colorId;

    public ProductStockKey() {}

    public ProductStockKey(UUID productId, UUID sizeId, UUID colorId) {
        this.productId = productId;
        this.sizeId = sizeId;
        this.colorId = colorId;
    }

    public UUID getProductId() {
        return productId;
    }

    public void setProductId(UUID productId) {
        this.productId = productId;
    }

    public UUID getSizeId() {
        return sizeId;
    }

    public void setSizeId(UUID sizeId) {
        this.sizeId = sizeId;
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
        if (!(o instanceof ProductStockKey that)) return false;
        return Objects.equals(productId, that.productId)
                && Objects.equals(sizeId, that.sizeId)
                && Objects.equals(colorId, that.colorId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(productId, sizeId, colorId);
    }
}
