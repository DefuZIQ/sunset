package com.sunset.product.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public class ProductDTO {
    private UUID id;
    private String name;
    private String description;
    private BigDecimal price;
    private String gender;
    private String imageUrl;
    private double rating;
    private int reviewCount;

    private List<String> categories;
    private List<ColorDTO> colors;
    private List<StockDTO> stock;

    public ProductDTO() {}

    public ProductDTO(UUID id, String name, String description, BigDecimal price, String imageUrl) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.price = price;
        this.imageUrl = imageUrl;
    }

    // Геттеры и сеттеры
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public double getRating() { return rating; }
    public void setRating(double rating) { this.rating = rating; }
    public int getReviewCount() { return reviewCount; }
    public void setReviewCount(int reviewCount) { this.reviewCount = reviewCount; }

    public List<String> getCategories() { return categories; }
    public void setCategories(List<String> categories) { this.categories = categories; }

    public List<ColorDTO> getColors() { return colors; }
    public void setColors(List<ColorDTO> colors) { this.colors = colors; }

    public List<StockDTO> getStock() { return stock; }
    public void setStock(List<StockDTO> stock) { this.stock = stock; }

    public static class ColorDTO {
        private UUID id;
        private String name;
        private String hexCode;

        public UUID getId() { return id; }
        public void setId(UUID id) { this.id = id; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getHexCode() { return hexCode; }
        public void setHexCode(String hexCode) { this.hexCode = hexCode; }
    }

    public static class StockDTO {
        private UUID sizeId;
        private String sizeName;
        private String sizeType;
        private String sizeGender;
        private String sizeDescription;
        private UUID colorId;
        private String colorName;
        private int quantity;

        public UUID getSizeId() { return sizeId; }
        public void setSizeId(UUID sizeId) { this.sizeId = sizeId; }

        public String getSizeName() { return sizeName; }
        public void setSizeName(String sizeName) { this.sizeName = sizeName; }

        public String getSizeType() { return sizeType; }
        public void setSizeType(String sizeType) { this.sizeType = sizeType; }
        public String getSizeGender() { return sizeGender; }
        public void setSizeGender(String sizeGender) { this.sizeGender = sizeGender; }
        public String getSizeDescription() { return sizeDescription; }
        public void setSizeDescription(String sizeDescription) { this.sizeDescription = sizeDescription; }

        public UUID getColorId() { return colorId; }
        public void setColorId(UUID colorId) { this.colorId = colorId; }

        public String getColorName() { return colorName; }
        public void setColorName(String colorName) { this.colorName = colorName; }

        public int getQuantity() { return quantity; }
        public void setQuantity(int quantity) { this.quantity = quantity; }
    }
}
