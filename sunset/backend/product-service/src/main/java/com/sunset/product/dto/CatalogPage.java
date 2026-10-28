package com.sunset.product.dto;

import java.util.List;

public record CatalogPage(List<ProductDTO> items, long total, int page, int pageSize) {}
