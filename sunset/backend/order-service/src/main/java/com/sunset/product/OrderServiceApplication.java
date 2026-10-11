package com.sunset.product;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import com.sunset.product.model.Store;
import com.sunset.product.repository.StoreRepository;
import java.math.BigDecimal;
import java.util.List;

@SpringBootApplication
public class OrderServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(OrderServiceApplication.class, args);
    }
    @Bean CommandLineRunner seedStores(StoreRepository repository) {
        return args -> {
            List<Store> existing = repository.findAll();
            if (existing.stream().noneMatch(store ->
                    store.getCity().equalsIgnoreCase("Нижний Новгород")
                            && store.getAddress().equalsIgnoreCase("Большая Покровская, 34"))) {
                Store main = store("SUNSET Нижний Новгород", "Большая Покровская, 34", "56.3269", "44.0059");
                main.setPhone("+7 831 000-00-00");
                main.setHours("Ежедневно, 10:00–21:00");
                repository.save(main);
            }

            List<Store> shoppingCentres = List.of(
                    store("SUNSET в ТРК НЕБО", "Большая Покровская, 82", "56.308975", "43.987292"),
                    store("SUNSET в ТРЦ Седьмое небо", "Бетанкура, 1", "56.3393049", "43.9562271"),
                    store("SUNSET в ТРЦ Океанис", "проспект Гагарина, 35, корп. 1", "56.285355", "43.979388"),
                    store("SUNSET в ТРК Фантастика", "Родионова, 187", "56.307108", "44.074551")
            );
            for (Store candidate : shoppingCentres) {
                boolean alreadyExists = existing.stream().anyMatch(store ->
                        store.getCity().equalsIgnoreCase(candidate.getCity())
                                && store.getAddress().equalsIgnoreCase(candidate.getAddress()));
                if (!alreadyExists) repository.save(candidate);
            }
        };
    }

    private static Store store(String name, String address, String latitude, String longitude) {
        Store store = new Store();
        store.setName(name);
        store.setCity("Нижний Новгород");
        store.setAddress(address);
        store.setLatitude(new BigDecimal(latitude));
        store.setLongitude(new BigDecimal(longitude));
        return store;
    }
}
