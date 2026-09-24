# Каталог файлов проекта

Каталог описывает поддерживаемые файлы репозитория. Пути указаны относительно корня проекта. Производные папки `node_modules`, `build`, `target`, `.git` не документируются поэлементно.

## Корень и развёртывание

| Файл | Назначение |
|---|---|
| `pom.xml` | Родительский Maven POM: модули, Java 17, управление версиями Spring и плагинами |
| `mvnw`, `mvnw.cmd` | Maven Wrapper для Linux/macOS и Windows |
| `Dockerfile.backend` | Универсальная многостадийная сборка выбранного Maven-модуля |
| `docker-compose.yml` | Локальная конфигурация контейнеров разработки |
| `docker-compose.prod.yml` | Production-топология: PostgreSQL, Gateway, четыре backend-сервиса и web |
| `*.tar.gz` в корне | Исторические архивы ручных обновлений; не являются источником истины и должны быть вынесены из репозитория/удалены после проверки |

## Frontend: конфигурация и точки входа

| Файл | Назначение |
|---|---|
| `frontend/package.json` | npm-зависимости и команды start/build/test |
| `frontend/package-lock.json` | Точная фиксация дерева npm-зависимостей |
| `frontend/Dockerfile` | Production-образ web на базе Caddy |
| `frontend/Caddyfile` | Раздача SPA и reverse proxy API |
| `frontend/README.md` | Стандартная памятка Create React App; требует замены ссылкой на `docs` |
| `frontend/public/index.html` | HTML-шаблон SPA |
| `frontend/public/manifest.json` | PWA/метаданные приложения |
| `frontend/public/robots.txt` | Правила поисковых роботов |
| `frontend/public/favicon.ico`, `logo192.png`, `logo512.png` | Иконки сайта и manifest |
| `frontend/src/index.js` | Монтирование React-приложения |
| `frontend/src/index.css` | Глобальные стили и базовые сбросы |
| `frontend/src/App.js` | Маршрутизация, сессия пользователя, провайдеры и общий layout |
| `frontend/src/App.css` | Общие стили приложения |
| `frontend/src/App.test.js` | Базовый тест приложения |
| `frontend/src/setupTests.js` | Настройка Jest DOM |
| `frontend/src/reportWebVitals.js` | Необязательная отправка web-vitals |
| `frontend/src/logo.svg` | Стандартный/служебный SVG CRA, в продуктовой логике не используется |

## Frontend: страницы

| Файл | Назначение |
|---|---|
| `pages/Main.jsx`, `Main.css` | Главная: баннер, категории, новинки и блоки бренда |
| `pages/MainCatalog.jsx`, `MainCatalog.css` | Каталог, пол, дерево категорий, фасеты, цена, размеры и рейтинг |
| `pages/ProductPage.jsx`, `ProductPage.css` | Детали товара, выбор цвета/размера, остаток, корзина и отзывы |
| `pages/Cart.jsx` | Большая корзина, адреса, доставка/самовывоз, промокод, бонусы и оформление |
| `pages/Profile.jsx`, `Profile.css` | Кабинет: сводка, настройки, аватар, пароль, адреса, способы оплаты, заказы, лояльность, избранное, уведомления и подписка |
| `pages/OrderDetail.jsx` | Детальная страница заказа, состав, получение, получатель, редактирование и отмена |
| `pages/Admin.jsx`, `Admin.css` | Админ-панель: товары, остатки, заказы, пользователи, бонусы и промоакции |
| `pages/SearchResults.jsx` | Поиск по каталогу |
| `pages/NewArrivals.jsx` | Срез новых товаров |
| `pages/Promotions.jsx` | Активные акции и промокоды |
| `pages/Favorites.jsx` | Ранний отдельный экран избранного; фактический маршрут перенаправлен в профиль |
| `pages/About.jsx` | Страница о бренде |
| `pages/Contacts.jsx` | Контакты и карта |
| `pages/ContentPages.css` | Общие стили контентных страниц, корзины, заказов и форм |

## Frontend: авторизация, контексты и общие компоненты

| Файл | Назначение |
|---|---|
| `components/Login.jsx` | Вход, сохранение JWT и профиля |
| `components/Registration.jsx` | Регистрация клиента |
| `components/Auth.css` | Общий дизайн форм входа и регистрации |
| `contexts/StoreContext.jsx` | Получение и предоставление каталога |
| `contexts/FavoritesContext.jsx` | Избранное и локальная персистентность |
| `components/BrandLogo.jsx`, `BrandLogo.css` | Переиспользуемый логотип SUNSET |
| `components/AssistantWidget.jsx`, `AssistantWidget.css` | Плавающий чат/голосовой AI-помощник |
| `components/AdminCategoryTree.jsx` | Выбор только конечной подкатегории в админке |
| `components/Admin/AdminProductForm.jsx` | Форма создания и редактирования товара |

## Frontend: шапка

| Файл | Назначение |
|---|---|
| `HeaderParts/Header.jsx`, `Header.css` | Верхняя навигация, адаптивное меню и точки размещения popup |
| `HeaderParts/SearchButton.jsx`, `SearchButton.css` | Поисковая кнопка и popup |
| `HeaderParts/LikesButton.jsx`, `LikesButton.css` | Индикатор избранного и переход в кабинет |
| `HeaderParts/BasketButton.jsx`, `BasketButton.css` | Мини-корзина с фото, вариантами, количеством и переходом в карточку |
| `HeaderParts/AvatarMenu.jsx`, `AvatarMenu.css` | Popup пользователя, аватар, ссылки профиля и выход |
| `HeaderParts/CartContext.jsx` | Ключ варианта товара, количество, удаление, очистка и localStorage |

## Frontend: главная и подвал

| Файл | Назначение |
|---|---|
| `Main/MainBanner.jsx`, `MainBanner.css` | Главный промобаннер |
| `Main/Categories.jsx`, `Categories.css` | Секция категорий |
| `Main/CategoryCard.jsx`, `CategoryCard.css` | Карточка категории |
| `Main/NewProducts.jsx`, `NewProducts.css` | Секция новых товаров |
| `Main/ProductCard.jsx`, `ProductCard.css` | Карточка товара, размер, цена, корзина и избранное |
| `FooterParts/Footer.jsx`, `Footer.css` | Контейнер подвала |
| `FooterParts/FooterBlock.jsx`, `FooterBlock.css` | Навигационный блок подвала |
| `FooterParts/FooterLogo.jsx`, `FooterLogo.css` | Логотип и бренд-блок подвала |
| `FooterParts/SubscribeSection.jsx`, `SubscribeSection.css` | Форма скидки за подписку и обращение к subscription API |

## Frontend: статические данные и ресурсы

| Путь | Назначение |
|---|---|
| `src/data/products.js` | Резервные/демонстрационные данные товаров |
| `src/data/categories.js` | Локальное описание категорий для UI |
| `src/images/**` | Импортируемые React-сборкой изображения, иконки, фон, категории и первые десять товаров |
| `public/images/**` | Те же/совместимые ресурсы, доступные по статическому URL |
| `frontend/sunset-variants-ui-final.tar.gz` | Исторический архив UI-обновления, не исходный файл |

## API Gateway

| Файл | Назначение |
|---|---|
| `backend/api-gateway/pom.xml` | Зависимости Gateway, WebFlux, Security и JWT |
| `backend/api-gateway/Dockerfile` | Устаревшая самостоятельная сборка модуля; production использует корневой Dockerfile |
| `.../ApiGatewayApplication.java` | Точка запуска Gateway |
| `.../security/JwtFilter.java` | Проверка JWT и добавление identity-заголовков |
| `.../config/SecurityConfig.java` | Reactive Security и правила доступа |
| `.../config/WhitelistConfig.java` | Загрузка списка публичных путей |
| `.../config/BlacklistConfig.java` | Конфигурационная заготовка запрещённых путей |
| `.../assistant/AssistantController.java` | Проксирование диалога и контекста каталога в Ollama |
| `.../resources/application.yml` | Порты, маршруты, CORS, JWT, whitelist и Ollama |
| `.../ApiGatewayApplicationTests.java` | Smoke-тест Spring-контекста |

`...` в этом и следующих разделах означает `src/main/java/<package>` или `src/test/java/<package>` внутри указанного модуля.

## Auth Service

| Файл | Назначение |
|---|---|
| `backend/auth-service/pom.xml`, `Dockerfile` | Сборка, зависимости и самостоятельный образ |
| `.../AuthServiceApplication.java` | Точка запуска |
| `.../controller/AuthController.java` | HTTP API регистрации, входа, профиля и пароля |
| `.../service/AuthService.java` | Бизнес-правила пользователей и аутентификации |
| `.../config/SecurityConfig.java` | Servlet Security, password encoder и доступ к endpoints |
| `.../security/JwtUtil.java` | Выпуск и проверка JWT |
| `.../security/JwtFilter.java` | Извлечение Bearer-токена в auth-service |
| `.../filter/LoggingFilter.java` | Логирование HTTP-запросов |
| `.../filter/CachedBodyHttpServletRequest.java` | Повторно читаемое тело запроса для фильтра |
| `.../model/User.java` | JPA-сущность пользователя |
| `.../repository/UserRepository.java` | Доступ к пользователям |
| `.../dto/AuthResponse.java` | JWT и профиль в ответе входа |
| `.../dto/LoginRequest.java` | Входные данные входа |
| `.../dto/RegisterRequest.java` | Входные данные регистрации |
| `.../dto/UserDTO.java` | Безопасное представление профиля |
| `.../dto/UpdateProfileRequest.java` | Изменение профиля |
| `.../dto/ChangePasswordRequest.java` | Текущий и новый пароль |
| `.../dto/ErrorResponse.java` | Представление ошибки |
| `.../exceptions/GlobalExceptionHandler.java` | Преобразование исключений в HTTP-ответы |
| `.../exceptions/UserNotFoundException.java` | Ошибка отсутствующего пользователя |
| `.../exceptions/InvalidPasswordException.java` | Ошибка неверного пароля |
| `.../resources/application.properties` | Порт, БД, JPA, Liquibase, JWT и логи |
| `.../resources/application-test.yml` | H2/тестовая конфигурация |
| `.../db/changelog/changelog-master.xml` | Порядок Liquibase-миграций |
| `.../db/migrations/V1__init.sql` | Таблицы users, roles и user_roles |
| `.../db/migrations/V2__add_user_phone.sql` | Телефон пользователя |
| `.../db/migrations/V3__add_user_role.sql` | Поле роли CUSTOMER/ADMIN |
| `.../AuthServiceApplicationTests.java` | Smoke-тест контекста |

## Product Service: web и бизнес-слой

| Файл | Назначение |
|---|---|
| `backend/product-service/pom.xml`, `Dockerfile` | Сборка и зависимости каталога |
| `.../ProductServiceApplication.java` | Точка запуска |
| `.../controller/ProductController.java` | Публичное и административное API товаров, остатков, отзывов и категорий |
| `.../controller/CategoryController.java` | Пустая/резервная заготовка контроллера категорий |
| `.../controller/ColorController.java` | Пустая/резервная заготовка контроллера цветов |
| `.../controller/SizeController.java` | Пустая/резервная заготовка контроллера размеров |
| `.../service/ProductService.java` | Чтение каталога и сборка ответа товара |
| `.../service/AdminProductService.java` | Создание, изменение, удаление и варианты/остатки |
| `.../service/ReviewService.java` | Получение, добавление и агрегация отзывов |
| `.../service/CategoryService.java` | Неиспользуемая заготовка |
| `.../service/ColorService.java` | Неиспользуемая заготовка |
| `.../service/SizeService.java` | Неиспользуемая заготовка |
| `.../service/impl/CategoryServiceImpl.java` | Неиспользуемая заготовка реализации |

## Product Service: DTO, сущности, repository и mapper

| Группа файлов | Назначение |
|---|---|
| `dto/ProductDTO.java`, `ProductResponse.java` | Выходные модели каталога и карточки |
| `dto/ProductRequest.java`, `ProductUuidRequest.java` | Создание/изменение и запрос по UUID |
| `dto/CategoryDTO.java`, `CategoryRequest.java` | Модели категорий |
| `dto/ColorDTO.java`, `SizeDTO.java`, `StockDTO.java` | Справочники вариантов и остатки |
| `entity/Product.java` | Товар |
| `entity/Category.java` | Узел дерева категорий |
| `entity/Color.java`, `Size.java`, `Image.java` | Справочники цвета, размера и изображения |
| `entity/ProductCategory.java`, `ProductCategoryKey.java` | Связь товара и категории с составным ключом |
| `entity/ProductColor.java`, `ProductColorKey.java` | Связь товара и цвета |
| `entity/ProductStock.java`, `ProductStockKey.java` | Остаток конкретного варианта |
| `entity/ProductImage.java`, `ProductImageId.java` | Связь товара и изображения |
| `repository/ProductRepository.java` | Поиск и сохранение товаров |
| `repository/ProductCategoryRepository.java` | Связи категорий |
| `repository/ProductColorRepository.java` | Связи цветов |
| `repository/ProductStockRepository.java` | Остатки вариантов |
| `repository/CategoryRepository.java`, `ColorRepository.java`, `SizeRepository.java` | Сейчас пустые заготовки и кандидаты на реализацию/удаление |
| `mapper/CategoryMapper.java`, `SizeMapper.java` | Сейчас пустые заготовки преобразований |

## Product Service: конфигурация и миграции

| Файл | Назначение |
|---|---|
| `.../resources/application.properties` | Порт, PostgreSQL, JPA, Liquibase и JWT-параметры |
| `.../resources/application-test.yml` | Тестовая H2-конфигурация |
| `.../db/changelog/changelog-master.xml` | Порядок миграций V1–V13 |
| `V1__init.sql` | Базовая схема каталога |
| `V2__seed_catalog.sql` | Первые 10 товаров и базовые варианты |
| `V3__seed_extended_catalog.sql` | Расширение каталога до массового набора |
| `V4__reviews_category_tree.sql` | Отзывы и иерархия категорий |
| `V5__unique_catalog_photos.sql` | Уникализация фото каталога |
| `V6__proxy_catalog_photos.sql` | Проксируемые URL фото |
| `V7__unique_photo_variants.sql` | Разнообразие изображений вариантов |
| `V8__gender_catalog_sizes_and_matching_photos.sql` | Пол, гендерные разделы, размеры и соответствующие фото |
| `V9__curated_product_photos.sql` | Курируемые изображения по типу товара |
| `V10__remove_legacy_seed_sizes.sql` | Удаление устаревших размеров |
| `V11__align_original_products_with_photos.sql` | Исправление первых товаров и категорий |
| `V12__complete_variant_dictionary.sql` | Полные справочники цветов/размеров и остатки |
| `V13__category_subtrees.sql` | Дополнительные подкатегории |
| `.../ProductServiceApplicationTests.java` | Smoke-тест контекста |

## Order Service

| Файл | Назначение |
|---|---|
| `backend/order-service/pom.xml`, `Dockerfile` | Сборка и зависимости сервиса заказов |
| `.../OrderServiceApplication.java` | Точка запуска и дополнительные JPA-модели/repository текущей реализации |
| `.../controller/OrderController.java` | Клиентские и административные endpoints заказов, бонусов и промо |
| `.../controller/StoreController.java` | Список и создание магазинов |
| `.../service/OrderService.java` | Основная бизнес-логика заказов, расчётов, статусов, отмен и лояльности |
| `.../dto/OrderDtos.java` | Record-модели запросов позиций, заказа, статуса, бонусов и промо |
| `.../model/Store.java` | JPA-сущность магазина/пункта самовывоза |
| `.../repository/StoreRepository.java` | Доступ к активным магазинам |
| `.../resources/application.properties` | Порт, БД, JPA, Liquibase и JWT |
| `.../resources/application-test.yml` | Тестовая H2-конфигурация |
| `.../db/changelog/changelog-master.xml` | Порядок миграций заказов |
| `V1__init.sql` | Заказы, позиции, платежи и доставки |
| `V2__loyalty_promotions.sql` | Суммы заказа, промокоды, бонусы, транзакции и акции |
| `.../OrderServiceApplicationTests.java` | Smoke-тест контекста |

## Notification Service

| Файл | Назначение |
|---|---|
| `backend/notification-service/pom.xml` | Web, JPA, PostgreSQL и validation |
| `.../NotificationServiceApplication.java` | Точка запуска |
| `.../Notification.java` | JPA-сущность уведомления |
| `.../NotificationRepository.java` | Список и число непрочитанных уведомлений |
| `.../NotificationController.java` | Получение, создание и прочтение уведомлений |
| `.../NewsletterSubscription.java` | JPA-сущность подписки |
| `.../NewsletterSubscriptionRepository.java` | Поиск подписки по email/userId |
| `.../NewsletterController.java` | Подписка, статус и отписка |
| `.../resources/application.properties` | Порт, БД и JPA; миграции пока отсутствуют |

## Что следует удалить или перенести

- Архивы `*.tar.gz` — в release storage с контрольными суммами.
- Дубли `src/images` и `public/images` — оставить один способ доставки ресурсов.
- Пустые Java-заготовки — реализовать либо удалить после проверки ссылок.
- Стандартный `frontend/README.md` — заменить краткой инструкцией, ведущей в этот каталог.
- Пароли и секреты в `application.properties`/`application.yml` — заменить переменными окружения и ротировать.
