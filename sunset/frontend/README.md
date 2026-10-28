# SUNSET Frontend

Клиентская часть магазина построена на React 19, React Router 7 и Vite 7. Тесты выполняются Vitest и Testing Library.

## Команды

```bash
npm ci
npm start
```

Dev-сервер Vite по умолчанию доступен на `http://localhost:5173`.
Отдельная точка входа администрации доступна по `http://localhost:5173/admin/`.
Она использует собственный сеанс вкладки, но пока не является отдельным доменом или сервисом.

```bash
npm test
npm run build
npm run test:e2e
```

Production-сборка создаётся в каталоге `dist` с двумя HTML-входами (`index.html` и `admin/index.html`); контейнер копирует её в Caddy.
E2E-набор Playwright проверяет Chromium в настольном и мобильном режимах. Перед первым локальным запуском установите браузер командой `npx playwright install chromium`.

## Проверка зависимостей

```bash
npm audit
```

После миграции с Create React App полный аудит зависимостей не содержит известных уязвимостей.
