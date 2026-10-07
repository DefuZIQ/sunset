package com.sunset.auth.controller;

import com.sunset.auth.dto.CustomerAddress;
import com.sunset.auth.service.CustomerAddressService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/auth/addresses")
public class CustomerAddressController {
    private final CustomerAddressService addresses;

    public CustomerAddressController(CustomerAddressService addresses) {
        this.addresses = addresses;
    }

    @GetMapping
    public List<CustomerAddress> list(Authentication authentication) {
        return addresses.list(userId(authentication));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CustomerAddress create(Authentication authentication, @RequestBody CustomerAddress address) {
        return addresses.create(userId(authentication), address);
    }

    @PutMapping("/{id}")
    public CustomerAddress update(Authentication authentication, @PathVariable UUID id, @RequestBody CustomerAddress address) {
        return addresses.update(userId(authentication), id, address);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Authentication authentication, @PathVariable UUID id) {
        addresses.delete(userId(authentication), id);
    }

    private static UUID userId(Authentication authentication) {
        return (UUID) authentication.getPrincipal();
    }
}
