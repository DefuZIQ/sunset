package com.sunset.contract;

import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;
import java.util.Arrays;
import java.util.List;

/** Internal-only, fail-closed lookup; no fallback to a shared database. */
public final class RemoteCustomerProfileReader implements CustomerProfileReader {
    private final RestClient client;
    private final String secret;

    public RemoteCustomerProfileReader(String baseUrl, String secret) {
        if (baseUrl == null || baseUrl.isBlank() || secret == null || secret.length() < 32)
            throw new IllegalArgumentException("Для профилей нужен адрес Auth и сервисный секрет");
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(2000);
        factory.setReadTimeout(2000);
        client = RestClient.builder().baseUrl(baseUrl).requestFactory(factory).build();
        this.secret = secret;
    }

    @Override public CustomerProfile get(UUID id) {
        if (id == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Клиент не найден");
        try {
            CustomerProfile profile = client.get().uri("/internal/customers/{id}", id)
                    .header("X-Sunset-Service-Token", secret).retrieve().body(CustomerProfile.class);
            if (profile == null || !id.equals(profile.id()))
                throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Неполный ответ сервиса клиентов");
            return profile;
        } catch (HttpClientErrorException.NotFound error) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Клиент не найден", error);
        } catch (RestClientException error) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Сервис клиентов недоступен", error);
        }
    }

    @Override public List<CustomerDirectoryEntry> list(int offset, int limit) {
        if (offset < 0 || limit < 1 || limit > 200) throw new IllegalArgumentException("Некорректная страница клиентов");
        try {
            CustomerDirectoryEntry[] entries = client.get()
                    .uri(uri -> uri.path("/internal/customers").queryParam("offset", offset)
                            .queryParam("limit", limit).build())
                    .header("X-Sunset-Service-Token", secret).retrieve().body(CustomerDirectoryEntry[].class);
            if (entries == null) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Неполный ответ сервиса клиентов");
            return Arrays.asList(entries);
        } catch (RestClientException error) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Сервис клиентов недоступен", error);
        }
    }
}
