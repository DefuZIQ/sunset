package com.sunset.contract;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.sql.Date;
import java.util.UUID;

public final class LocalCustomerProfileReader implements CustomerProfileReader {
    private final JdbcTemplate jdbc;

    public LocalCustomerProfileReader(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Override public CustomerProfile get(UUID id) {
        return jdbc.query("SELECT id,email,first_name,last_name,phone,birthday FROM users WHERE id=?",
                (rs, row) -> {
                    Date birthday = rs.getDate("birthday");
                    return new CustomerProfile(rs.getObject("id", UUID.class), rs.getString("email"),
                            rs.getString("first_name"), rs.getString("last_name"), rs.getString("phone"),
                            birthday == null ? null : birthday.toLocalDate());
                }, id).stream().findFirst().orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Клиент не найден"));
    }
}
