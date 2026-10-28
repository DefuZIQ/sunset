package com.sunset.product.controller;
import com.sunset.contract.IamAccess;
import com.sunset.contract.IamAuthorizer;
import com.sunset.product.model.Store;
import com.sunset.product.repository.StoreRepository;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/order/stores")
public class StoreController {
    private final StoreRepository repository;
    private final IamAuthorizer access;
    public StoreController(StoreRepository repository, JdbcTemplate jdbc) { this(repository, new IamAccess(jdbc)); }
    @Autowired
    public StoreController(StoreRepository repository, IamAuthorizer access) { this.repository = repository; this.access = access; }
    @GetMapping public List<Store> list() { return repository.findByActiveTrueAndKindOrderByCityAscNameAsc("STORE"); }
    @GetMapping("/admin") public List<Store> listAdmin(@RequestHeader("user-id") UUID userId) {
        List<String> permissions = access.permissions(userId);
        if (!permissions.contains("stores:manage") && !permissions.contains("stock:write"))
            throw new SecurityException("Недостаточно прав для просмотра точек");
        if (access.isAdmin(userId)) return repository.findAllByOrderByKindAscCityAscNameAsc();
        String role = access.staffRole(userId);
        if ("WAREHOUSE_ADMIN".equals(role) || "STORE_MANAGER".equals(role)) {
            UUID locationId = access.scopedLocation(userId);
            return locationId == null ? List.of() : repository.findById(locationId)
                    .filter(Store::isActive).filter(store -> ("WAREHOUSE_ADMIN".equals(role) ? "WAREHOUSE" : "STORE").equals(store.getKind()))
                    .map(List::of).orElseGet(List::of);
        }
        return repository.findAllByOrderByKindAscCityAscNameAsc();
    }
    @PostMapping public Store create(@RequestHeader("user-id") UUID userId, @RequestBody Store store) {
        access.require(userId, "stores:manage");
        if (!"STORE".equals(store.getKind()) && !"WAREHOUSE".equals(store.getKind())) {
            throw new IllegalArgumentException("Тип точки должен быть STORE или WAREHOUSE");
        }
        return repository.save(store);
    }
}
