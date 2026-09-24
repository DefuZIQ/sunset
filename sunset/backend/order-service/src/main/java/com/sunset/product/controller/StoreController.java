package com.sunset.product.controller;
import com.sunset.product.model.Store;
import com.sunset.product.repository.StoreRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/order/stores")
public class StoreController {
    private final StoreRepository repository;
    public StoreController(StoreRepository repository) { this.repository = repository; }
    @GetMapping public List<Store> list() { return repository.findByActiveTrueOrderByCityAscNameAsc(); }
    @PostMapping public Store create(@RequestBody Store store) { return repository.save(store); }
}
