# SUNSET Frontend

Клиентская часть магазина построена на React 19, React Router 7 и Vite 7. Тесты выполняются Vitest и Testing Library.

## Команды

```bash
npm ci
npm start
```

Dev-сервер Vite по умолчанию доступен на `http://localhost:5173`.

```bash
npm test
npm run build
```

Production-сборка создаётся в каталоге `dist`; контейнер копирует её в Caddy.

## Проверка зависимостей

```bash
npm audit
```

После миграции с Create React App полный аудит зависимостей не содержит известных уязвимостей.
