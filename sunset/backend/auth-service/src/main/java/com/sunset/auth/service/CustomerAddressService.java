package com.sunset.auth.service;

import com.sunset.auth.dto.CustomerAddress;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.UUID;

@Service
public class CustomerAddressService {
    private static final String FIELDS = "id,label,city,street,house,building,structure,entrance,floor,apartment,intercom,postal_code,comment,lat,lon";
    private static final RowMapper<CustomerAddress> MAPPER = (rs, row) -> map(rs);
    private final JdbcTemplate jdbc;

    public CustomerAddressService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<CustomerAddress> list(UUID userId) {
        return jdbc.query("SELECT " + FIELDS + " FROM customer_addresses WHERE user_id=? ORDER BY created_at,id", MAPPER, userId);
    }

    @Transactional
    public CustomerAddress create(UUID userId, CustomerAddress request) {
        validate(request);
        Integer count = jdbc.queryForObject("SELECT count(*) FROM customer_addresses WHERE user_id=?", Integer.class, userId);
        if (count != null && count >= 20) throw new IllegalArgumentException("Можно сохранить не больше 20 адресов");
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO customer_addresses (id,user_id,label,city,street,house,building,structure,entrance,floor,apartment,intercom,postal_code,comment,lat,lon) " +
                        "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                id, userId, required(request.label(), 60), required(request.city(), 120),
                required(request.street(), 160), required(request.house(), 40),
                optional(request.building(), 40), optional(request.structure(), 40), optional(request.entrance(), 40),
                optional(request.floor(), 40), optional(request.apartment(), 40), optional(request.intercom(), 60),
                optional(request.postalCode(), 20), optional(request.comment(), 500), request.lat(), request.lon());
        return get(userId, id);
    }

    @Transactional
    public CustomerAddress update(UUID userId, UUID id, CustomerAddress request) {
        validate(request);
        int changed = jdbc.update("UPDATE customer_addresses SET label=?,city=?,street=?,house=?,building=?,structure=?,entrance=?,floor=?,apartment=?,intercom=?,postal_code=?,comment=?,lat=?,lon=?,updated_at=NOW() WHERE id=? AND user_id=?",
                required(request.label(), 60), required(request.city(), 120), required(request.street(), 160), required(request.house(), 40),
                optional(request.building(), 40), optional(request.structure(), 40), optional(request.entrance(), 40),
                optional(request.floor(), 40), optional(request.apartment(), 40), optional(request.intercom(), 60),
                optional(request.postalCode(), 20), optional(request.comment(), 500), request.lat(), request.lon(), id, userId);
        if (changed == 0) throw notFound();
        return get(userId, id);
    }

    public void delete(UUID userId, UUID id) {
        if (jdbc.update("DELETE FROM customer_addresses WHERE id=? AND user_id=?", id, userId) == 0) throw notFound();
    }

    private CustomerAddress get(UUID userId, UUID id) {
        return jdbc.query("SELECT " + FIELDS + " FROM customer_addresses WHERE id=? AND user_id=?", MAPPER, id, userId)
                .stream().findFirst().orElseThrow(CustomerAddressService::notFound);
    }

    private static CustomerAddress map(ResultSet rs) throws SQLException {
        return new CustomerAddress(rs.getObject("id", UUID.class), rs.getString("label"), rs.getString("city"),
                rs.getString("street"), rs.getString("house"), rs.getString("building"), rs.getString("structure"),
                rs.getString("entrance"), rs.getString("floor"), rs.getString("apartment"), rs.getString("intercom"),
                rs.getString("postal_code"), rs.getString("comment"),
                (Double) rs.getObject("lat"), (Double) rs.getObject("lon"));
    }

    private static void validate(CustomerAddress address) {
        if (address == null) throw new IllegalArgumentException("Заполните адрес");
        required(address.label(), 60);
        required(address.city(), 120);
        required(address.street(), 160);
        required(address.house(), 40);
        if (address.lat() != null && (!Double.isFinite(address.lat()) || address.lat() < -90 || address.lat() > 90))
            throw new IllegalArgumentException("Некорректная широта");
        if (address.lon() != null && (!Double.isFinite(address.lon()) || address.lon() < -180 || address.lon() > 180))
            throw new IllegalArgumentException("Некорректная долгота");
    }

    private static String required(String value, int max) {
        String trimmed = optional(value, max);
        if (trimmed == null) throw new IllegalArgumentException("Заполните обязательные поля адреса");
        return trimmed;
    }

    private static String optional(String value, int max) {
        if (value == null || value.isBlank()) return null;
        String trimmed = value.trim();
        if (trimmed.length() > max) throw new IllegalArgumentException("Поле адреса слишком длинное");
        return trimmed;
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Адрес не найден");
    }
}
