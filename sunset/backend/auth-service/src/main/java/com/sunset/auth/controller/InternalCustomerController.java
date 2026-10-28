package com.sunset.auth.controller;

import com.sunset.contract.CustomerProfile;
import com.sunset.contract.CustomerDirectoryEntry;
import com.sunset.contract.LocalCustomerProfileReader;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.UUID;
import java.util.List;
import org.springframework.web.bind.annotation.RequestParam;

/** Available only on customer Auth inside the service network. */
@RestController
@RequestMapping("/internal/customers")
public class InternalCustomerController {
    private final LocalCustomerProfileReader profiles;
    private final byte[] secret;
    private final String realm;

    public InternalCustomerController(JdbcTemplate jdbc,
                                      @Value("${internal.iam.secret:}") String secret,
                                      @Value("${auth.realm:CUSTOMER}") String realm) {
        this.profiles = new LocalCustomerProfileReader(jdbc);
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
        this.realm = realm;
    }

    @GetMapping("/{id}")
    public CustomerProfile get(@PathVariable("id") UUID id,
                               @RequestHeader(value = "X-Sunset-Service-Token", required = false) String token) {
        verifyToken(token);
        return profiles.get(id);
    }

    @GetMapping
    public List<CustomerDirectoryEntry> list(@RequestParam(value = "offset", defaultValue = "0") int offset,
                                             @RequestParam(value = "limit", defaultValue = "200") int limit,
                                             @RequestHeader(value = "X-Sunset-Service-Token", required = false) String token) {
        verifyToken(token);
        return profiles.list(offset, limit);
    }

    private void verifyToken(String token) {
        if (!"CUSTOMER".equalsIgnoreCase(realm) || secret.length < 32 || token == null ||
                !MessageDigest.isEqual(secret, token.getBytes(StandardCharsets.UTF_8)))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    }
}
