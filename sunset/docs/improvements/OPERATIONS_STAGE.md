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
- Grafana автоматически загружает обзорный дашборд SUNSET: доступность пяти сервисов, запросы в секунду, доля HTTP 5xx, средняя задержка и Java heap. Prometheus оценивает правила `SunsetServiceDown`, `SunsetMetricsMissing` и `SunsetHighServerErrorRate`.
- При `TRACING_ENABLED=true` пять Spring-сервисов создают W3C trace/span ID через Micrometer/OpenTelemetry и отправляют выбранные трассы по OTLP HTTP в Tempo. Grafana получает источник данных `SUNSET Tempo`; трассы хранятся локально не дольше 72 часов. По умолчанию трассировка отключена, чтобы магазин не зависел от профиля мониторинга.

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

Для просмотра с рабочего компьютера откройте SSH-туннель `ssh -L 3001:127.0.0.1:3001 defuziq@192.168.1.186`, затем `http://127.0.0.1:3001/d/sunset-overview`. Логин Grafana задаётся в Compose, пароль берётся из серверного `.env`. Правила Prometheus видны в разделе Alerting Grafana/Prometheus, но **пока не отправляют сообщения наружу**: Alertmanager и канал доставки ещё не настроены. Не принимайте наличие правил за работающие SMS/email-оповещения.

Для трассировки запустите профиль с Tempo, затем установите в серверном `.env` `TRACING_ENABLED=true` и пересоздайте пять Spring-сервисов. Выборка задаётся `TRACING_SAMPLING_PROBABILITY` (по умолчанию 0.1). В Grafana откройте Explore → `SUNSET Tempo`: поиск по сервису или trace ID покажет переход от Gateway к целевому сервису. `X-Request-Id` остаётся отдельным идентификатором для сопоставления JSON-логов; он не равен trace ID. Не включайте 100% выборку без оценки объёма трафика и места на диске.

После изменения конфигурации проверьте `promtool check config /etc/prometheus/prometheus.yml` внутри контейнера Prometheus и перезапустите контейнеры `prometheus` и `grafana` через Compose. Убедитесь, что все пять `up{job="sunset-services"}` равны 1, правила загружены, а дашборд виден по указанному UID.

## Backup

```sh
sudo ./scripts/backup-postgres.sh /home/defuziq/sunset /home/defuziq/backups
./scripts/verify-backup.sh /home/defuziq/backups/sunset-YYYYMMDDTHHMMSSZ.sql.gz
```

Периодичность задаётся системным таймером на сервере после успешной выкладки. По умолчанию копии хранятся 14 дней; срок меняется переменной `BACKUP_RETENTION_DAYS`.

## Что ещё требуется по большому плану

- реальная проверка адреса геокодером и синхронизация адресов между устройствами (браузерный checkout уже проверяется с тестовыми API-ответами);
- доставка тревог через Alertmanager, централизованное хранилище логов и проверка трассировки до отдельных вызовов БД;
- реальный платёжный webhook и реальный логистический провайдер;
- transactional outbox для уведомлений;
- серверный поисковый индекс и полноценные фасеты;
- модернизация frontend, OpenAPI и общий формат ошибок (префикс `/api/v1` уже добавлен), изоляция баз сервисов.
