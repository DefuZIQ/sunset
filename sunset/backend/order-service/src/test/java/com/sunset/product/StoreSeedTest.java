package com.sunset.product;

import com.sunset.product.model.Store;
import com.sunset.product.repository.StoreRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.CommandLineRunner;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class StoreSeedTest {
    @Test
    void addsFourShoppingCentresWithoutDuplicatingExistingStores() throws Exception {
        StoreRepository repository = mock(StoreRepository.class);
        List<Store> saved = new ArrayList<>();
        when(repository.findAll()).thenAnswer(invocation -> new ArrayList<>(saved));
        when(repository.save(any(Store.class))).thenAnswer(invocation -> {
            Store store = invocation.getArgument(0);
            saved.add(store);
            return store;
        });

        CommandLineRunner seed = new OrderServiceApplication().seedStores(repository);
        seed.run();
        assertThat(saved).hasSize(5);
        assertThat(saved).extracting(Store::getName).contains(
                "SUNSET в ТРК НЕБО", "SUNSET в ТРЦ Седьмое небо",
                "SUNSET в ТРЦ Океанис", "SUNSET в ТРК Фантастика");

        seed.run();
        assertThat(saved).hasSize(5);
    }
}
