package com.sunset.product;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import com.sunset.product.controller.StoreController;
import com.sunset.product.model.Store;
import com.sunset.product.repository.StoreRepository;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class OrderServiceApplicationTests {
    @Autowired private StoreRepository stores;
    @Autowired private StoreController controller;

    @Test
    void contextLoads() {
    }

    @Test
    @Transactional
    void warehouseIsNotListedAsPickupStore() {
        Store warehouse = new Store();
        warehouse.setName("Тестовый склад");
        warehouse.setCity("Нижний Новгород");
        warehouse.setAddress("");
        warehouse.setKind("WAREHOUSE");
        stores.save(warehouse);

        assertThat(controller.list()).isNotEmpty().allMatch(store -> "STORE".equals(store.getKind()));
    }
}
