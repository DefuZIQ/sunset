# SUNSET

SUNSET — интернет-магазин одежды с покупательским сайтом, отдельной панелью сотрудников и Android-приложением. В проекте есть каталог с фильтрами и отзывами, корзина, оформление доставки и самовывоза, заказы, бонусы, промокоды, уведомления и помощник для подбора вещей.

- Витрина: [t3ch.pro](https://t3ch.pro/)
- Панель сотрудников: [admin.t3ch.pro](https://admin.t3ch.pro/)
- Подробная документация: [sunset/docs/README.md](sunset/docs/README.md)
- Задачи и релизы: [RELEASE_PROCESS.md](RELEASE_PROCESS.md)

## Архитектура

| Компонент | Назначение |
| --- | --- |
| `frontend` | React 19, React Router и Vite; покупательский и административный интерфейсы |
| `api-gateway` | Единая точка входа для API и помощника |
| `auth-service` | Покупатели, профили и адреса; отдельный экземпляр `staff-auth-service` обслуживает сотрудников, роли и MFA |
| `product-service` | Товары, категории, варианты, остатки по магазинам и отзывы |
| `order-service` | Заказы, получение, оплата, бонусы, акции и возвраты |
| `notification-service` | Уведомления и подписки |
| `android-app` | Android-клиент на базе WebView для мобильной витрины |

Backend — многомодульный проект Maven на Java и Spring Boot; данные хранятся в PostgreSQL, миграции выполняет Liquibase. В рабочем окружении используются три логически разделённые базы: `sunset` для покупателей и уведомлений, `sunset_staff` для сотрудников, `sunset_commerce` для торговли. Витрина и админка опубликованы на VDS, а API и базы работают на частной VM и доступны через защищённый обратный SSH-туннель. Подробнее: [схема публикации](sunset/deploy/vds/README.md) и [разделение баз](sunset/docs/improvements/COMMERCE_DATABASE_EXTRACTION.md).

## Структура репозитория

```text
sunset/
├── README.md              # этот файл
├── .github/               # CI
├── java_core/             # отдельные Java-материалы
└── sunset/
    ├── android-app/       # Android-приложение
    ├── backend/           # API и сервисы
    ├── frontend/          # веб-интерфейсы
    ├── deploy/            # конфигурация публикации
    ├── docs/              # спецификации и планы
    ├── scripts/           # проверки и эксплуатационные сценарии
    └── docker-compose.prod.yml
```

## Разработка и проверка

Нужны JDK 17+, Node.js и npm; для полного локального окружения также нужен Docker с Compose. Команды ниже выполняются из внутреннего каталога `sunset/`, если не указано иное.

```powershell
cd sunset
Copy-Item .env.example .env
# Задайте в .env собственные секреты и параметры баз. Не коммитьте этот файл.
cd frontend
npm ci
npm run dev
```

Frontend обращается к `/api/v1`; для работы функций сайта нужен запущенный backend или настроенный прокси API. Production Compose включает раздельную авторизацию сотрудников и требует подготовленных баз `sunset_staff` и, при раздельном развёртывании, `sunset_commerce`, а также переменных `STAFF_DB_USER`, `STAFF_DB_PASSWORD` и других секретов. Не используйте старый `docker-compose.yml` как описание текущего production-развёртывания. Перед первым запуском backend сверяйтесь с [инструкцией по разделению баз](sunset/docs/improvements/COMMERCE_DATABASE_EXTRACTION.md) и [конфигурацией Compose](sunset/docker-compose.prod.yml).

Проверки:

```powershell
cd sunset
.\mvnw.cmd test
cd frontend
npm test
npm run build
npm run test:e2e
```

Общий PowerShell-сценарий: `sunset/scripts/test-all.ps1` (необязательные флаги `-WithE2E` и `-WithSmoke`). Дополнительные сведения: [тестирование](sunset/docs/TESTING.md).

## Android

Приложение открывает мобильную витрину `https://t3ch.pro/`, поддерживает выбор фото и голосовой ввод помощника. Для отладочной сборки из `sunset/android-app` выполните `gradlew.bat assembleDebug` на Windows или `./gradlew assembleDebug` на Linux/macOS. Нужны Android SDK и принятые лицензии. Инструкция по SDK, установке APK и ограничениям первого выпуска: [README Android-приложения](sunset/android-app/README.md). Для публикации требуется отдельная подписанная release-сборка и проверка на устройствах.

## Безопасность

Не сохраняйте в Git `.env`, пароли, токены, дампы баз и ключи подписи Android. Образец переменных находится в [`sunset/.env.example`](sunset/.env.example); реальные значения задаются только в окружении развёртывания. Административный доступ проверяется на сервере и защищён MFA.
