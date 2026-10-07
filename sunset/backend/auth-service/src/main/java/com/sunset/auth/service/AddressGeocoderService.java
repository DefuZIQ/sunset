package com.sunset.auth.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sunset.auth.dto.AddressLookup;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AddressGeocoderService {
    private static final URI ENDPOINT = URI.create("https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address");
    private static final int MAX_LOOKUPS_PER_MINUTE = 20;
    private final String apiKey;
    private final ObjectMapper mapper;
    private final HttpClient client;
    private final ConcurrentHashMap<UUID, ArrayDeque<Long>> recentLookups = new ConcurrentHashMap<>();

    public AddressGeocoderService(@Value("${DADATA_API_KEY:}") String apiKey, ObjectMapper mapper) {
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.mapper = mapper;
        this.client = this.apiKey.isBlank() ? null : HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build();
    }

    public boolean available() {
        return !apiKey.isBlank();
    }

    public AddressLookup.Result lookup(UUID userId, AddressLookup.Request request) {
        if (!available()) return new AddressLookup.Result(false, List.of());
        String query = request == null || request.query() == null ? "" : request.query().trim();
        if (query.length() < 5 || query.length() > 300)
            throw new IllegalArgumentException("Введите адрес длиной от 5 до 300 символов");
        enforceLimit(userId);
        try {
            String body = mapper.writeValueAsString(java.util.Map.of("query", query, "count", request.selected() ? 1 : 5));
            HttpRequest outbound = HttpRequest.newBuilder(ENDPOINT)
                    .timeout(Duration.ofSeconds(5))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .header("Authorization", "Token " + apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();
            HttpResponse<String> response = client.send(outbound, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200)
                throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Проверка адреса временно недоступна");
            return new AddressLookup.Result(true, parseCandidates(mapper.readTree(response.body())));
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Проверка адреса прервана");
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Проверка адреса временно недоступна");
        }
    }

    static List<AddressLookup.Candidate> parseCandidates(JsonNode root) {
        List<AddressLookup.Candidate> candidates = new ArrayList<>();
        for (JsonNode suggestion : root.path("suggestions")) {
            JsonNode data = suggestion.path("data");
            String city = text(data, "city");
            if (city == null) city = text(data, "settlement");
            String street = text(data, "street");
            String house = text(data, "house");
            if (city == null || street == null || house == null) continue;
            String query = text(suggestion, "unrestricted_value");
            if (query == null) continue;
            candidates.add(new AddressLookup.Candidate(text(suggestion, "value"), query, city, street, house,
                    text(data, "block"), text(data, "postal_code"), number(data, "geo_lat"), number(data, "geo_lon")));
        }
        return candidates;
    }

    private void enforceLimit(UUID userId) {
        long now = System.currentTimeMillis();
        ArrayDeque<Long> timestamps = recentLookups.computeIfAbsent(userId, ignored -> new ArrayDeque<>());
        synchronized (timestamps) {
            while (!timestamps.isEmpty() && timestamps.peekFirst() <= now - 60_000) timestamps.removeFirst();
            if (timestamps.size() >= MAX_LOOKUPS_PER_MINUTE)
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Слишком много запросов адреса. Повторите позже");
            timestamps.addLast(now);
        }
        if (recentLookups.size() > 5_000) recentLookups.clear();
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.path(field);
        return value.isMissingNode() || value.isNull() || value.asText().isBlank() ? null : value.asText();
    }

    private static Double number(JsonNode node, String field) {
        String value = text(node, field);
        if (value == null) return null;
        try { return Double.valueOf(value); } catch (NumberFormatException ignored) { return null; }
    }
}
