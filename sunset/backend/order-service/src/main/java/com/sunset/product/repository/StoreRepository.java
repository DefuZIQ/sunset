package com.sunset.product.repository;
import com.sunset.product.model.Store;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;
public interface StoreRepository extends JpaRepository<Store, UUID> { List<Store> findByActiveTrueOrderByCityAscNameAsc(); }
