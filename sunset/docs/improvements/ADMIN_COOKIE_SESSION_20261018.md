# Административная cookie-сессия — 18 октября 2026

## Контракт

Пароль сотрудника по-прежнему возвращает только MFA-challenge. После TOTP или резервного кода Auth Service создаёт 15-минутный серверный сеанс и устанавливает `SUNSET_ADMIN_SESSION` с `HttpOnly`, `SameSite=Strict`, `Path=/api/v1`; для публичного HTTPS добавляется `Secure`. JWT не возвращается в JSON и не сохраняется в `sessionStorage`. Покупательский bearer/JWT-поток не меняется.

Ответ входа содержит `csrfToken`, но не JWT. После обновления страницы админка получает новый CSRF-токен через `GET /api/v1/auth/admin/session`. Для любого изменяющего запроса, авторизованного cookie, Gateway требует `X-SUNSET-CSRF`: HMAC-SHA256 с серверным ключом и привязкой к конкретному сеансу. Gateway проверяет подпись постоянным по времени сравнением, дополнительно спрашивает Auth Service о действующей MFA-сессии с ролью `ADMIN` или `STAFF`, затем удаляет внешнюю cookie и CSRF-заголовок при передаче во внутренний сервис. Выход отзывает сеанс в PostgreSQL и удаляет cookie.

CSRF-токен не следует трактовать как замену защиты от XSS. Пока магазин и админка живут на одном origin, код магазина, исполняемый в том же origin, может вызывать админское API от имени вошедшего администратора. Следующий этап — отдельный `admin.t3ch.pro` с host-only cookie, отдельной публикацией интерфейса и запретом credentialed CORS со стороны магазина.

## Проверки выпуска

- Unit: cookie атрибуты и отсутствие JWT в ответе; Gateway отклоняет изменяющие запросы без/с неверным CSRF, принимает корректный и не пересылает cookie.
- HTTP-контракт Gateway: cookie для чтения, обязательный CSRF для записи, предыдущие bearer-маршруты.
- PostgreSQL integration: покупательский сеанс не elevated; MFA-сеанс сотрудника elevated.
- Frontend: отсутствие JWT в `sessionStorage`, успешный вход по MFA, восстановление после обновления, админские действия и выход; unit/typecheck/build; Playwright desktop и mobile.
- После установки: health Auth/Gateway, `401` без cookie на `/auth/admin/session`, корректные атрибуты cookie на локальном HTTP и публичном HTTPS, `403` без CSRF на пробном изменяющем запросе без побочных эффектов.

## Откат

Перед установкой сохранить предыдущие Docker-образы Auth/Gateway/web и статический релиз на VDS. Откатывать эти три компонента согласованно: старая админка ожидает JWT в `sessionStorage`, новый Auth его не возвращает. База не меняется, миграции и отката схемы нет. Существующие cookie-сеансы после отката не используются старой админкой; пользователям потребуется войти повторно.

Ориентиры: [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).
