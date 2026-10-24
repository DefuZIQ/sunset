package com.sunset.contract;

import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

/** Fail-closed IAM reader for Product/Order; no SQL access to staff identity. */
public final class RemoteIamAccess implements IamAuthorizer {
    private final RestClient client;
    private final JdbcTemplate jdbc;
    private final String secret;

    public RemoteIamAccess(String baseUrl, String secret, JdbcTemplate jdbc) {
        if (baseUrl == null || baseUrl.isBlank() || secret == null || secret.length() < 32) {
            throw new IllegalArgumentException("Для удалённого IAM нужен адрес Auth и сервисный секрет");
        }
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(2000);
        requestFactory.setReadTimeout(2000);
        this.client = RestClient.builder().baseUrl(baseUrl).requestFactory(requestFactory).build();
        this.jdbc = jdbc;
        this.secret = secret;
    }

    private IamIdentity identity(UUID userId) {
        if (userId == null) throw new SecurityException("Недостаточно прав");
        try {
            IamIdentity result = client.get().uri("/internal/iam/{id}", userId)
                    .header("X-Sunset-Service-Token", secret)
                    .retrieve().body(IamIdentity.class);
            if (result == null || result.role() == null || result.permissions() == null) {
                throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "IAM вернул неполные данные");
            }
            return result;
        } catch (RestClientException error) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "IAM недоступен", error);
        }
    }

    @Override public boolean isAdmin(UUID userId) {
        return "ADMIN".equals(identity(userId).role());
    }

    @Override public List<String> permissions(UUID userId) {
        return identity(userId).permissions();
    }

    @Override public String staffRole(UUID userId) {
        return identity(userId).staffRole();
    }

    @Override public UUID scopedLocation(UUID userId) {
        return identity(userId).locationId();
    }

    @Override public void require(UUID userId, String permission) {
        if (!IamAccess.PERMISSIONS.contains(permission)) throw new IllegalArgumentException("Неизвестное разрешение");
        if (!identity(userId).permissions().contains(permission)) {
            throw new SecurityException("Недостаточно прав: " + permission);
        }
    }

    @Override public void requireAdmin(UUID userId) {
        if (!isAdmin(userId)) throw new SecurityException("Требуются права администратора");
    }

    @Override public void requireLocation(UUID userId, String permission, UUID locationId) {
        IamIdentity identity = identity(userId);
        if (!identity.permissions().contains(permission)) throw new SecurityException("Недостаточно прав: " + permission);
        if ("ADMIN".equals(identity.role())) return;
        String role = identity.staffRole();
        if ("WAREHOUSE_ADMIN".equals(role) || "STORE_MANAGER".equals(role)) {
            if (locationId == null || !locationId.equals(identity.locationId())) {
                throw new SecurityException("Нет доступа к этой торговой точке или складу");
            }
            String kind = "WAREHOUSE_ADMIN".equals(role) ? "WAREHOUSE" : "STORE";
            Boolean active = jdbc.queryForObject(
                    "SELECT EXISTS(SELECT 1 FROM stores WHERE id=? AND kind=? AND active=TRUE)",
                    Boolean.class, locationId, kind);
            if (!Boolean.TRUE.equals(active)) throw new SecurityException("Назначенная точка больше не активна");
        }
    }
}
