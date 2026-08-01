# Sunset Project

## Обзор

Sunset — это многомодульный проект на Java с фронтендом на React. 
Серверная часть реализована через Spring Boot и Spring Cloud Gateway. 
Фронтенд запускается отдельно как SPA на React.

## Структура

- `backend/api-gateway` — шлюз API на Spring Cloud Gateway
- `backend/auth-service` — сервис аутентификации и регистрации
- `backend/product-service` — сервис каталога товаров
- `backend/order-service` — модуль заказа (в текущей версии содержит только точку входа)
- `frontend` — React-приложение
- `docker-compose.yml` — локальная Docker-композиция для запуска backend и базы данных

## Требования

- Java 17 (можно использовать `./mvnw` / `./mvnw.cmd`)
- Node.js 18+ и npm
- Docker + Docker Compose (опционально)

## Сборка проекта

Откройте терминал в папке `sunset/sunset`.

### Maven (backend)

Unix / macOS:
```bash
./mvnw clean package -DskipTests
```

Windows:
```powershell
.\mvnw.cmd clean package -DskipTests
```

Если хотите прогнать тесты:
```bash
./mvnw clean test
```

### Сборка только одного модуля

Например, для `auth-service`:
```bash
./mvnw -pl backend/auth-service clean package -DskipTests
```

## Запуск через Docker Compose

Docker Compose запускает:
- PostgreSQL
- pgAdmin
- auth-service
- product-service
- order-service
- api-gateway

> В текущей конфигурации Dockerfiles копируют готовые JAR-файлы из `target`, поэтому перед первым запуском необходимо собрать backend-артефакты.

**Требования к окружению (.env и GitHub Secrets)**

Перед запуском Docker Compose локально создайте файл `.env` в папке `sunset/sunset` со следующими переменными (пример):

```
POSTGRES_USER=sunset
POSTGRES_PASSWORD=change_me
POSTGRES_DB=sunsetdb
PGADMIN_DEFAULT_EMAIL=admin@example.com
PGADMIN_DEFAULT_PASSWORD=change_me
```

Для корректной работы в GitHub Actions добавьте те же значения как Secrets в настройках репозитория (Settings → Secrets) с именами `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `PGADMIN_DEFAULT_EMAIL`, `PGADMIN_DEFAULT_PASSWORD`. Без этих значений шаги, разворачивающие PostgreSQL/pgAdmin в CI, могут завершиться с ошибкой.



Откройте терминал в папке `sunset/sunset` и выполните:

Unix / macOS:
```bash
./mvnw clean package -DskipTests
docker compose up --build
```

Windows PowerShell:
```powershell
.\mvnw.cmd clean package -DskipTests
docker compose up --build
```

Если контейнеры уже были собраны и нужно только запустить их снова:
```bash
docker compose up -d
```

Остановить контейнеры:
```bash
docker compose down
```

**Важно:** текущая Docker-композиция не включает frontend. Для запуска React-приложения используйте отдельную команду `npm start` в папке `sunset/frontend`.

## Запуск frontend

Перейдите в папку `sunset/sunset/frontend`.

Установка зависимостей:
```bash
npm install
```

Запуск приложения:
```bash
npm start
```

Обычно React-приложение будет доступно на `http://localhost:3000`.

## Конфигурация портов

- API Gateway: `http://localhost:8080`
- Auth Service: `http://localhost:8081`
- Product Service: `http://localhost:8082`
- Order Service: `http://localhost:8083`
- PostgreSQL: `5432`
- pgAdmin: `5050`
- Frontend: `http://localhost:3000`

## Особенности

- React использует `fetch` для обращения к `/auth/login` и `/products/all` через API Gateway.
- Auth Service выдаёт JWT-токены для защиты остальных возможностей.
- В `order-service` пока нет публичных контроллеров.
- Docker Compose управляет только backend и базой данных; frontend запускается отдельно.

## Полезные команды

### Запустить backend без Docker

Запустите модули через Maven отдельно:
```bash
./mvnw -pl backend/api-gateway spring-boot:run
./mvnw -pl backend/auth-service spring-boot:run
./mvnw -pl backend/product-service spring-boot:run
``` 

### Очистить собранные артефакты

```bash
./mvnw clean
```

## Примечания

- Убедитесь, что `JAVA_HOME` указывает на JDK 25, если вы не используете Maven wrapper.
- `docker compose up --build` пересобирает контейнеры при изменении кода.
- При запуске фронтенда и backend одновременно убедитесь, что CORS разрешает `http://localhost:3000`.

## CI/CD GitHub Actions

Этот репозиторий содержит GitHub Actions workflow в файле `.github/workflows/build-and-run.yml`.

В CI/CD пайплайне выполняются следующие шаги:

- checkout кода
- установка JDK 25
- сборка Maven-модулей в `sunset`
- установка зависимостей frontend и сборка `sunset/frontend`
- построение Docker-образов backend-сервисов
- запуск Docker Compose и проверка endpoint-а `http://localhost:8080/products/all`
- корректное завершение `docker compose down`

Это позволяет держать локальную документацию и GitHub Actions в одном стиле.

---

Этот README помогает быстро запустить проект локально и понять основные команды сборки.