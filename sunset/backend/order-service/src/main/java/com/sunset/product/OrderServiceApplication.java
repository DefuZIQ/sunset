package com.sunset.product;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import com.sunset.product.model.Store;
import com.sunset.product.repository.StoreRepository;
import java.math.BigDecimal;

@SpringBootApplication
public class OrderServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(OrderServiceApplication.class, args);
    }
    @Bean CommandLineRunner seedStores(StoreRepository repository) { return args -> { if (repository.count() == 0) { Store store = new Store(); store.setName("SUNSET Нижний Новгород"); store.setCity("Нижний Новгород"); store.setAddress("Большая Покровская, 34"); store.setPhone("+7 831 000-00-00"); store.setHours("Ежедневно, 10:00–21:00"); store.setLatitude(new BigDecimal("56.3269")); store.setLongitude(new BigDecimal("44.0059")); repository.save(store); } }; }
}
