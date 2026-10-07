# Этап эксплуатации и автоматизации

## Реализовано

- GitHub Actions запускает backend-тесты, frontend-тесты, production-сборку и сборку контейнеров.
- Все Spring-сервисы публикуют метрики в формате Prometheus.
- Prometheus собирает метрики пяти сервисов с интервалом 15 секунд.
- Grafana получает преднастроенный источник данных Prometheus.
- Подробные DEBUG-логи Gateway и Auth отключены в production-конфигурации.
- Скрипт PostgreSQL backup создаёт сжатую копию атомарно, проверяет gzip, сохраняет SHA-256 и удаляет копии старше заданного срока.
- Отдельный скрипт проверяет размер, gzip, checksum и сигнатуру PostgreSQL dump.
- Testcontainers поднимает временную PostgreSQL 16, применяет Liquibase и проверяет полный транзакционный цикл заказа без доступа к production-данным.
- Gateway создаёт `X-Request-Id` для каждого запроса; Auth, Product, Order и Notification добавляют тот же ID в свои логи и возвращают его в HTTP-ответе. Логи не содержат тело запроса, JWT, телефон или адрес.
- Пять backend-контейнеров пишут построчные JSON-логи в stdout с полями `service`, `level`, `message`, `requestId` (для HTTP-запросов), `method`, `path`, `status` и `durationMs`.

Для разбора ошибки возьмите `X-Request-Id` из ответа и найдите его в логах Gateway и целевого сервиса. Например, на сервере:

```sh
sudo docker compose -f docker-compose.prod.yml logs --no-log-prefix --since 30m api-gateway auth-service product-service order-service notification-service | jq -Rc 'fromjson? | select(.requestId == "UUID-ИЗ-ОТВЕТА")'
```

JSON-формат упрощает машинный поиск, но это всё ещё локальные Docker-логи: централизованное хранилище, сроки хранения и распределённая трассировка OpenTelemetry пока не реализованы. `requestId` не равен trace/span ID.

## Включение наблюдаемости

Наблюдаемость вынесена в Compose-профиль и не расходует память, пока не включена явно:

```sh
docker compose -f docker-compose.prod.yml -f docker-compose.observability.yml up -d
```

Grafana слушает только `127.0.0.1:3001`, поэтому не публикуется в локальную сеть без отдельного reverse proxy и авторизации.

## Backup

```sh
sudo ./scripts/backup-postgres.sh /home/defuziq/sunset /home/defuziq/backups
./scripts/verify-backup.sh /home/defuziq/backups/sunset-YYYYMMDDTHHMMSSZ.sql.gz
```

Периодичность задаётся системным таймером на сервере после успешной выкладки. По умолчанию копии хранятся 14 дней; срок меняется переменной `BACKUP_RETENTION_DAYS`.

## Что ещё требуется по большому плану

- реальная проверка адреса геокодером и синхронизация адресов между устройствами (браузерный checkout уже проверяется с тестовыми API-ответами);
- дашборды, alert rules и OpenTelemetry trace ID;
- реальный платёжный webhook и реальный логистический провайдер;
- transactional outbox для уведомлений;
- серверный поисковый индекс и полноценные фасеты;
- модернизация frontend, OpenAPI и общий формат ошибок (префикс `/api/v1` уже добавлен), изоляция баз сервисов.
