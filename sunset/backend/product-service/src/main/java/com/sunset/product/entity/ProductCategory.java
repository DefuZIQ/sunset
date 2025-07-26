package com.sunset.product.model;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "product_categories")
public class ProductCategory {

    @EmbeddedId
    private ProductCategoryKey id; // составной ключ (productId, categoryId)

    @ManyToOne
    @MapsId("productId")
    @JoinColumn(name = "product_id")
    private Product product;

    @ManyToOne
    @MapsId("categoryId")
    @JoinColumn(name = "category_id")
    private Category category;

    // геттеры и сеттеры

    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    public Category getCategory() {
        return category;
    }

    public void setCategory(Category category) {
        this.category = category;
    }
}
