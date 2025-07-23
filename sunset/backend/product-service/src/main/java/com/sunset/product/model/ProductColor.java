package com.sunset.product.model;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "product_colors")
public class ProductColor {

    @EmbeddedId
    private ProductColorKey id;

    @ManyToOne
    @MapsId("productId")
    @JoinColumn(name = "product_id")
    private Product product;

    @ManyToOne
    @MapsId("colorId")
    @JoinColumn(name = "color_id")
    private Color color;

    // геттеры и сеттеры

    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    public Color getColor() {
        return color;
    }

    public void setColor(Color color) {
        this.color = color;
    }
}
