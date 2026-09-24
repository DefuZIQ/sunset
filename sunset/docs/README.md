# Документация SUNSET

Этот каталог описывает текущее состояние интернет-магазина SUNSET на 24 сентября 2026 года. Документы фиксируют не только назначение компонентов, но и фактические ограничения реализации.

## Навигация

- [Общий спек проекта](PROJECT_SPEC.md)
- [Каталог файлов](FILE_CATALOG.md)
- [API и интеграции](API_SPEC.md)
- [Модель данных](DATA_MODEL.md)
- [Автоматическое тестирование](TESTING.md)
- [Отчёт о последнем прогоне](TEST_REPORT.md)
- [План улучшений](improvements/ROADMAP.md)
- [Полный аудит возможностей улучшения](improvements/IMPROVEMENT_AUDIT.md)
- [Спецификация релиза P0](improvements/P0_IMPLEMENTATION_SPEC.md)
- [Чек-лист проверки улучшений](improvements/VALIDATION_CHECKLIST.md)
- [Безопасность и эксплуатация](improvements/SECURITY_AND_OPERATIONS.md)

## Сервисы

- [Frontend](services/FRONTEND.md)
- [API Gateway и AI-помощник](services/API_GATEWAY.md)
- [Авторизация и профиль](services/AUTH_SERVICE.md)
- [Каталог товаров](services/PRODUCT_SERVICE.md)
- [Заказы и лояльность](services/ORDER_SERVICE.md)
- [Уведомления и рассылка](services/NOTIFICATION_SERVICE.md)
- [PostgreSQL и инфраструктура](services/INFRASTRUCTURE.md)

## Границы документации

Исходные, конфигурационные и миграционные файлы перечислены поштучно в `FILE_CATALOG.md`. Бинарные изображения описаны как наборы ресурсов: их назначение определяется каталогом и именем, а внутреннее устройство не содержит программной логики. Папки `node_modules`, `build`, Maven `target`, архивы обновлений и содержимое `.git` считаются производными артефактами и не являются частью поддерживаемого исходного кода.
