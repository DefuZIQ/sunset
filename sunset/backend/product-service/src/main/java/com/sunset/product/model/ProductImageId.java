package com.sunset.product.model;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

public class ProductImageId implements Serializable {

    private UUID productId;
    private UUID imageId;

    public ProductImageId() {}

    public ProductImageId(UUID productId, UUID imageId) {
        this.productId = productId;
        this.imageId = imageId;
    }

    // equals и hashCode

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ProductImageId)) return false;
        ProductImageId that = (ProductImageId) o;
        return Objects.equals(productId, that.productId) &&
                Objects.equals(imageId, that.imageId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(productId, imageId);
    }

    // Геттеры и сеттеры

    public UUID getProductId() {
        return productId;
    }

    public void setProductId(UUID productId) {
        this.productId = productId;
    }

    public UUID getImageId() {
        return imageId;
    }

    public void setImageId(UUID imageId) {
        this.imageId = imageId;
    }
}
