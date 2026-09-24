# Сервис API Gateway

## Ответственность

Единая точка входа backend на порту 8080. Маршрутизирует запросы, применяет CORS и проверяет JWT. Также содержит endpoint AI-помощника.

## Маршрутизация

| Префикс | Назначение |
|---|---|
| `/auth/**` | auth-service |
| `/products/**` | product-service |
| `/order/**` | order-service |
| `/notifications/**` | notification-service |
| `/subscriptions/**` | notification-service |
| `/assistant/chat` | локальный AssistantController и Ollama |

## Безопасность

`JwtFilter` извлекает Bearer-токен, проверяет подпись и передаёт downstream-сервису идентификатор пользователя. `WhitelistConfig` определяет публичные маршруты. Blacklist-конфигурация предназначена для запретов маршрутов, но требует явных тестов.

## AI-помощник

`AssistantController` принимает сообщение и контекст товаров, формирует запрос к Ollama и возвращает ответ. URL и модель задаются `OLLAMA_URL` и `OLLAMA_MODEL`. Текущая интеграция синхронная и не хранит историю диалога на сервере.

## Риски

- Версии Spring Boot/Cloud в модуле расходятся с родительским POM.
- Публичный endpoint помощника нуждается в rate limit и ограничении размера контекста.
- Значение JWT в `application.yml` не должно иметь production-default.
- Для CORS сейчас указан только localhost, production-поведение зависит от проксирования Caddy.
