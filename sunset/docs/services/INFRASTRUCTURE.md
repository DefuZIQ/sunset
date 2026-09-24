# PostgreSQL и инфраструктура

## Контейнеры

Production Compose поднимает `postgres`, `api-gateway`, `auth-service`, `product-service`, `order-service`, `notification-service` и `web`. Постоянные данные находятся в именованных volumes `postgres_data`, `caddy_data`, `caddy_config`.

## Сеть и порты

Наружу публикуется только `web:80`. Caddy обслуживает SPA и проксирует backend. Внутренние порты: Gateway 8080, Auth 8081, Product 8082, Order 8083, Notification 8084, PostgreSQL 5432.

## Конфигурация

Обязательные production-переменные: `POSTGRES_PASSWORD`, `JWT_SECRET`. Дополнительные: `POSTGRES_USER`, `POSTGRES_DB`, `OLLAMA_URL`, `OLLAMA_MODEL`. `.env` не должен попадать в Git.

## База данных

Используется один PostgreSQL 16. Auth, product и order управляют схемами Liquibase. Notification сейчас полагается на Hibernate. Общая БД упрощает локальный запуск, но снижает автономность сервисов.

## Развёртывание

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

Перед обновлением БД требуется backup. После запуска проверяются healthcheck PostgreSQL, состояние контейнеров, главная страница и критические API.

## Эксплуатационные пробелы

- Нет healthcheck приложений, централизованных логов, метрик, трассировки и alerting.
- Нет автоматической ротации и проверки резервных копий.
- Нет CI/CD и стратегии отката образов.
- Образы собираются локально и не версионируются в registry.
