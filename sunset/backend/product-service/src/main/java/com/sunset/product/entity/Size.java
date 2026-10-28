package com.sunset.product.model;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "sizes")
public class Size {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private String label; // Например: "S", "M", "L", "XL"

    @Column(nullable = false)
    private String type;

    private String gender;
    private String description;

    // Геттеры и сеттеры
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    // 🔧 Добавляем метод getName(), чтобы не менять остальной код
    public String getName() {
        return this.label;
    }

    public String getType() { return type; }
    public String getGender() { return gender; }
    public String getDescription() { return description; }
}
