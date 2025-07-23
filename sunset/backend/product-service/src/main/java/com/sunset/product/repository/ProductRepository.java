package com.sunset.product.repository;

import com.sunset.product.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProductRepository extends JpaRepository<Product, UUID> {

    @Query("""
        SELECT DISTINCT p FROM Product p
        LEFT JOIN FETCH p.images pi
        LEFT JOIN FETCH pi.image
        LEFT JOIN FETCH p.productCategories pc
        LEFT JOIN FETCH pc.category
        LEFT JOIN FETCH p.productColors pcl
        LEFT JOIN FETCH pcl.color
        LEFT JOIN FETCH p.productStock ps
        LEFT JOIN FETCH ps.color
        LEFT JOIN FETCH ps.size
        ORDER BY p.createdAt DESC
    """)
    List<Product> findAllWithFullDetails();
}
