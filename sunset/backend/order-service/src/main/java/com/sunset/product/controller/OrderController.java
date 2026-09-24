package com.sunset.product.controller;

import com.sunset.product.dto.OrderDtos.CreateOrderRequest;
import com.sunset.product.dto.OrderDtos.PromotionRequest;
import com.sunset.product.dto.OrderDtos.StatusRequest;
import com.sunset.product.dto.OrderDtos.BonusAdjustmentRequest;
import com.sunset.product.service.OrderService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/order")
public class OrderController {
    private final OrderService service;
    public OrderController(OrderService service) { this.service = service; }

    @PostMapping public ResponseEntity<?> create(@RequestHeader("user-id") UUID userId, @RequestBody CreateOrderRequest request) { return ResponseEntity.status(HttpStatus.CREATED).body(service.create(userId, request)); }
    @GetMapping("/my") public Object my(@RequestHeader("user-id") UUID userId) { return service.myOrders(userId); }
    @GetMapping("/my/{id}") public Object one(@RequestHeader("user-id") UUID userId, @PathVariable("id") UUID id) { return service.myOrder(userId, id); }
    @PostMapping("/my/{id}/cancel") public Object cancel(@RequestHeader("user-id") UUID userId, @PathVariable("id") UUID id) { return service.cancel(userId, id); }
    @PutMapping("/my/{id}") public Object update(@RequestHeader("user-id") UUID userId, @PathVariable("id") UUID id, @RequestBody Map<String,Object> request) { return service.updatePending(userId, id, request); }
    @GetMapping("/loyalty") public Object loyalty(@RequestHeader("user-id") UUID userId) { return service.loyalty(userId); }
    @GetMapping("/promotions") public Object promotions() { return service.activePromotions(); }
    @PostMapping("/promo/validate") public Object validate(@RequestHeader(value="user-id", required=false) UUID userId, @RequestBody Map<String,Object> request) { return service.validatePromo((String)request.get("code"), request.get("subtotal") == null ? BigDecimal.ZERO : new BigDecimal(request.get("subtotal").toString()), userId); }
    @GetMapping("/admin/orders") public Object adminOrders(@RequestHeader("user-id") UUID userId) { return service.adminOrders(userId); }
    @PatchMapping("/admin/orders/{id}/status") public Object status(@RequestHeader("user-id") UUID userId, @PathVariable("id") UUID id, @RequestBody StatusRequest request) { return service.updateStatus(userId,id,request.status()); }
    @GetMapping("/admin/users") public Object users(@RequestHeader("user-id") UUID userId) { return service.adminUsers(userId); }
    @PostMapping("/admin/users/{id}/bonuses") public Object bonuses(@RequestHeader("user-id") UUID userId, @PathVariable("id") UUID id, @RequestBody BonusAdjustmentRequest request) { return service.adjustBonuses(userId,id,request); }
    @GetMapping("/admin/promotions") public Object promos(@RequestHeader("user-id") UUID userId) { return service.adminPromotions(userId); }
    @PostMapping("/admin/promotions") public ResponseEntity<?> promo(@RequestHeader("user-id") UUID userId, @RequestBody PromotionRequest request) { return ResponseEntity.status(HttpStatus.CREATED).body(service.createPromotion(userId,request)); }

    @ExceptionHandler(IllegalArgumentException.class) ResponseEntity<?> badRequest(IllegalArgumentException e) { return ResponseEntity.badRequest().body(Map.of("message",e.getMessage())); }
    @ExceptionHandler(SecurityException.class) ResponseEntity<?> forbidden(SecurityException e) { return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message",e.getMessage())); }
}
