package com.sunset.product.service;

import com.sunset.product.dto.ProductDTO;
import com.sunset.product.dto.ProductDTO.ColorDTO;
import com.sunset.product.dto.ProductDTO.StockDTO;
import com.sunset.product.model.Color;
import com.sunset.product.model.Product;
import com.sunset.product.repository.ProductCategoryRepository;
import com.sunset.product.repository.ProductColorRepository;
import com.sunset.product.repository.ProductRepository;
import com.sunset.product.repository.ProductStockRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductCategoryRepository productCategoryRepository;
    private final ProductColorRepository productColorRepository;
    private final ProductStockRepository productStockRepository;

    public ProductService(
            ProductRepository productRepository,
            ProductCategoryRepository productCategoryRepository,
            ProductColorRepository productColorRepository,
            ProductStockRepository productStockRepository
    ) {
        this.productRepository = productRepository;
        this.productCategoryRepository = productCategoryRepository;
        this.productColorRepository = productColorRepository;
        this.productStockRepository = productStockRepository;
    }

    public List<ProductDTO> getProducts() {
        List<Product> products = productRepository.findAllWithFullDetails();
        return products.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public Optional<ProductDTO> getProductById(UUID id) {
        return productRepository.findById(id)
                .map(this::mapToDTO);
    }

    private ProductDTO mapToDTO(Product product) {
        String imageUrl = product.getImages().stream()
                .map(pi -> pi.getImage().getUrl())
                .findFirst()
                .orElse(null);

        ProductDTO dto = new ProductDTO(
                product.getId(),
                product.getName(),
                product.getDescription(),
                product.getPrice(),
                imageUrl
        );

        // Добавляем категории
        List<String> categories = productCategoryRepository.findByProductId(product.getId())
                .stream()
                .map(rel -> rel.getCategory().getName())
                .collect(Collectors.toList());
        dto.setCategories(categories);

        // Добавляем цвета
        List<ColorDTO> colors = productColorRepository.findByProductId(product.getId())
                .stream()
                .map(rel -> {
                    Color color = rel.getColor();
                    ColorDTO colorDTO = new ColorDTO();
                    colorDTO.setId(color.getId());
                    colorDTO.setName(color.getName());
                    colorDTO.setHexCode(color.getHexCode());
                    return colorDTO;
                })
                .collect(Collectors.toList());
        dto.setColors(colors);

        // Добавляем наличие по размерам и цветам (склад)
        List<StockDTO> stockList = productStockRepository.findByProductId(product.getId())
                .stream()
                .map(stock -> {
                    StockDTO stockDTO = new StockDTO();
                    stockDTO.setSizeId(stock.getSize().getId());
                    stockDTO.setSizeName(stock.getSize().getName());
                    stockDTO.setColorId(stock.getColor().getId());
                    stockDTO.setColorName(stock.getColor().getName());
                    stockDTO.setQuantity(stock.getQuantity());
                    return stockDTO;
                })
                .collect(Collectors.toList());
        dto.setStock(stockList);

        return dto;
    }
}
