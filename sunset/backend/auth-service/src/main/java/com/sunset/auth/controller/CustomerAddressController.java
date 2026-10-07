package com.sunset.auth.controller;

import com.sunset.auth.dto.CustomerAddress;
import com.sunset.auth.dto.AddressLookup;
import com.sunset.auth.service.AddressGeocoderService;
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
    private final AddressGeocoderService geocoder;

    public CustomerAddressController(CustomerAddressService addresses, AddressGeocoderService geocoder) {
        this.addresses = addresses;
        this.geocoder = geocoder;
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

    @GetMapping("/geocoder")
    public java.util.Map<String, Boolean> geocoderStatus() {
        return java.util.Map.of("available", geocoder.available());
    }

    @PostMapping("/geocoder")
    public AddressLookup.Result lookup(Authentication authentication, @RequestBody AddressLookup.Request request) {
        return geocoder.lookup(userId(authentication), request);
    }

    private static UUID userId(Authentication authentication) {
        return (UUID) authentication.getPrincipal();
    }
}
