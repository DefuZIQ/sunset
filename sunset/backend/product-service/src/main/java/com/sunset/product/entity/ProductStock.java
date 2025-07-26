package com.sunset.product.model;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "product_stock")
public class ProductStock {

    @EmbeddedId
    private ProductStockKey id;

    @ManyToOne
    @MapsId("productId")
    @JoinColumn(name = "product_id")
    private Product product;

    @ManyToOne
    @MapsId("sizeId")
    @JoinColumn(name = "size_id")
    private Size size;

    @ManyToOne
    @MapsId("colorId")
    @JoinColumn(name = "color_id")
    private Color color;

    @Column(nullable = false)
    private Integer quantity;

    // геттеры и сеттеры

    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    public Size getSize() {
        return size;
    }

    public void setSize(Size size) {
        this.size = size;
    }

    public Color getColor() {
        return color;
    }

    public void setColor(Color color) {
        this.color = color;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }
}
