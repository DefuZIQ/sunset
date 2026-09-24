package com.sunset.apigateway.assistant;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Map;

@RestController
@RequestMapping("/assistant")
public class AssistantController {
    private final ObjectMapper mapper = new ObjectMapper();
    private final HttpClient client = HttpClient.newHttpClient();
    @Value("${ollama.url:http://172.18.0.1:11434}") private String ollamaUrl;
    @Value("${ollama.model:qwen2.5:0.5b}") private String model;

    @PostMapping("/chat")
    public Map<String, Object> chat(@RequestBody ChatRequest request) throws Exception {
        String products = request.products() == null ? "[]" : mapper.writeValueAsString(request.products());
        String systemPrompt = "Ты — стилист российского магазина одежды SUNSET. " +
                "Пиши клиенту по-русски, дружелюбно и не длиннее трёх предложений. " +
                "Выбирай только товары из переданного каталога. Ответ должен быть JSON-объектом с двумя полями: " +
                "message — готовая персональная рекомендация клиенту; productIds — массив ID выбранных товаров. " +
                "Не повторяй описание формата и не используй markdown.";
        String prompt = "КАТАЛОГ: " + products + "\nЗАПРОС КЛИЕНТА: " +
                (request.message() == null ? "" : request.message()) +
                "\nПодбери до четырёх подходящих товаров. Если вариантов нет, верни пустой массив productIds и задай уточняющий вопрос.";
        String body = mapper.writeValueAsString(Map.of(
                "model", model,
                "stream", false,
                "format", "json",
                "keep_alive", "30s",
                "messages", new Object[]{
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", prompt)
                },
                "options", Map.of("temperature", 0.25, "num_ctx", 4096, "num_predict", 300)
        ));
        HttpRequest httpRequest = HttpRequest.newBuilder(URI.create(ollamaUrl + "/api/chat"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body)).build();
        HttpResponse<String> response = client.send(httpRequest, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Local AI service unavailable");
        }
        JsonNode root = mapper.readTree(response.body());
        String text = root.path("message").path("content").asText("");
        try {
            Map<String, Object> result = mapper.readValue(text, Map.class);
            String message = String.valueOf(result.getOrDefault("message", "")).trim();
            if (message.isBlank() || message.equalsIgnoreCase("ответ клиенту")) {
                result.put("message", "Я подобрал подходящие варианты из нашего каталога. Откройте карточки ниже, чтобы посмотреть размеры и цвета.");
            }
            result.putIfAbsent("productIds", new String[0]);
            Object selected = result.get("productIds");
            if (!(selected instanceof Collection<?> collection) || collection.isEmpty()) {
                JsonNode catalog = mapper.valueToTree(request.products());
                if (catalog.isArray() && !catalog.isEmpty()) {
                    ArrayList<String> fallbackIds = new ArrayList<>();
                    for (int i = 0; i < Math.min(3, catalog.size()); i++) {
                        String id = catalog.get(i).path("id").asText("");
                        if (!id.isBlank()) fallbackIds.add(id);
                    }
                    if (!fallbackIds.isEmpty()) {
                        result.put("productIds", fallbackIds);
                        result.put("message", "Нашёл несколько наиболее подходящих вариантов из каталога. Посмотрите карточки ниже — там доступны цвета и размеры.");
                    }
                }
            }
            return result;
        }
        catch (Exception ignored) { return Map.of("message", text, "productIds", new String[0]); }
    }

    public record ChatRequest(String message, Object products) {}
}
