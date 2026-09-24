package com.sunset.product.controller;
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
    @GetMapping public List<Store> list() { return repository.findByActiveTrueOrderByCityAscNameAsc(); }
    @PostMapping public Store create(@RequestHeader("user-id") UUID userId, @RequestBody Store store) {
        String role = jdbc.query("SELECT role FROM users WHERE id=?", rs -> rs.next() ? rs.getString(1) : null, userId);
        if (!"ADMIN".equalsIgnoreCase(role)) throw new org.springframework.web.server.ResponseStatusException(HttpStatus.FORBIDDEN, "Требуются права администратора");
        return repository.save(store);
    }
}
