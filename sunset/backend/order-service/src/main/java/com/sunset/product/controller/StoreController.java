package com.sunset.product.controller;
import com.sunset.contract.IamAccess;
import com.sunset.product.model.Store;
import com.sunset.product.repository.StoreRepository;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/order/stores")
public class StoreController {
    private final StoreRepository repository;
    private final JdbcTemplate jdbc;
    public StoreController(StoreRepository repository, JdbcTemplate jdbc) { this.repository = repository; this.jdbc = jdbc; }
    @GetMapping public List<Store> list() { return repository.findByActiveTrueAndKindOrderByCityAscNameAsc("STORE"); }
    @GetMapping("/admin") public List<Store> listAdmin(@RequestHeader("user-id") UUID userId) {
        List<String> permissions = new IamAccess(jdbc).permissions(userId);
        if (!permissions.contains("stores:manage") && !permissions.contains("stock:write"))
            throw new SecurityException("Недостаточно прав для просмотра точек");
        return repository.findAllByOrderByKindAscCityAscNameAsc();
    }
    @PostMapping public Store create(@RequestHeader("user-id") UUID userId, @RequestBody Store store) {
        new IamAccess(jdbc).require(userId, "stores:manage");
        if (!"STORE".equals(store.getKind()) && !"WAREHOUSE".equals(store.getKind())) {
            throw new IllegalArgumentException("Тип точки должен быть STORE или WAREHOUSE");
        }
        return repository.save(store);
    }
}
