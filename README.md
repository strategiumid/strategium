# StrategiumID

StrategiumID разделён на независимый Java backend и отдельный frontend.

- `src/main/java` и `src/main/resources` содержат Spring Boot 3 REST API.
- `frontend/` содержит текущий статический интерфейс. В будущем его можно заменить на Vite, React, Vue или другой стек без переноса backend-кода.

## Технологии

- Java 17+
- Maven 3.9+
- PostgreSQL для production-подобного запуска

По умолчанию локальный профиль использует H2 в `./data/strategium`, поэтому PostgreSQL не нужен для первого старта.

## Запуск Backend

```bash
mvn spring-boot:run
```

Backend будет доступен на [http://localhost:8080](http://localhost:8080).

Тесты:

```bash
mvn test
```

## Запуск Frontend

Запустите `frontend/index.html` через любой статический сервер:

```bash
cd frontend
python -m http.server 5173
```

Откройте [http://localhost:5173](http://localhost:5173).

По умолчанию frontend обращается к API по адресу `http://localhost:8080`. Если backend находится по другому адресу, задайте переменную перед подключением `app.js`:

```html
<script>
  window.STRATEGIUM_API_BASE_URL = "http://localhost:8080";
</script>
```

На production-домене frontend по умолчанию обращается к API на том же origin, поэтому отдельная переменная не нужна, если frontend и backend развернуты одним приложением.

## Деплой На Amvera

Для Amvera подготовлены:

- `Dockerfile` — собирает Spring Boot jar, копирует `frontend/` в static-ресурсы на этапе Docker-сборки и запускает backend.
- `amvera.yml` — указывает Amvera использовать `Dockerfile`, порт `8080` и постоянное хранилище `/data`.

Такой вариант сохраняет разделение исходников на `frontend/` и backend, но деплоит их как один HTTP-сервис. Это удобно для первого запуска: frontend открывается с того же домена, а API доступно по `/api/...`.

Шаги:

1. Создайте приложение в Amvera.
2. Подключите Git-репозиторий или загрузите код.
3. Убедитесь, что в корне репозитория есть `Dockerfile` и `amvera.yml`.
4. Запустите сборку в интерфейсе Amvera.
5. После деплоя откройте публичный домен приложения.

Для обычного dev-login дополнительных переменных не требуется.

Для реального Steam-входа в переменных Amvera нужно задать:

- `STRATEGIUM_PUBLIC_BASE_URL` — публичный URL backend на Amvera, например `https://your-app.amvera.io`.

Опционально:

- `VK_ACCESS_TOKEN` — token VK API, если прямой доступ к `wall.get` без token перестанет работать.

В контейнере данные H2 сохраняются в `/data/strategium`, а `/data` подключен как persistent storage через `amvera.yml`.

## Конфигурация

Основные переменные окружения:

- `SERVER_PORT` — HTTP-порт backend, по умолчанию `8080`.
- `STRATEGIUM_PUBLIC_BASE_URL` — публичный URL backend для Steam OpenID callback, по умолчанию `http://localhost:8080`.
- `STRATEGIUM_FRONTEND_URL` — URL frontend, куда backend вернёт пользователя после Steam-входа, по умолчанию `http://localhost:5173`.
- `STRATEGIUM_CORS_ALLOWED_ORIGINS` — список разрешённых origin для frontend через запятую, по умолчанию `http://localhost:5173,http://localhost:3000,http://127.0.0.1:5500,null`.
- `PARADOX_NEWS_ENABLED` — включает автоматическую загрузку новостей Paradox, по умолчанию `true`.
- `PARADOX_NEWS_CACHE_TTL_MINUTES` — время кэширования новостей Paradox в минутах, по умолчанию `30`.
- `PARADOX_NEWS_SOURCES` — список официальных страниц Paradox `/games/.../news` через запятую.
- `VK_ACCESS_TOKEN` — необязательный VK API token для `wall.get`.
- `VK_CLIENT_ID` — ID VK OAuth-приложения для привязки VK-аккаунта пользователя.
- `VK_CLIENT_SECRET` — защищённый ключ VK OAuth-приложения.
- `VK_REDIRECT_URI` — callback URL VK OAuth, например `https://your-domain.amvera.io/api/auth/vk/callback`. Если пусто, backend соберёт URL из текущего запроса.
- `VK_OAUTH_SCOPE` — права user token для действий с постами, по умолчанию `wall,offline`.
- `VK_GROUP_DOMAIN` — короткое имя VK-группы для ленты, по умолчанию `strategium`.
- `VK_POST_COUNT` — количество постов VK, по умолчанию `8`, максимум `25`.
- `VK_SOURCE_NAME` — имя источника в карточках VK, по умолчанию `Strategium`.
- `VK_SOURCE_AVATAR_URL` — URL аватара источника для карточек VK.
- `STEAM_WEB_API_KEY` — ключ Steam Web API для загрузки достижений пользователя. Получается на https://steamcommunity.com/dev/apikey.
- `STEAM_LANGUAGE` — язык названий и описаний достижений Steam, по умолчанию `russian`.

Для действий с VK-постами пользователю нужно войти на сайт и привязать VK в настройках. `VK_ACCESS_TOKEN` используется для чтения ленты, а лайки и комментарии отправляются через user token конкретного пользователя после VK OAuth.

Для достижений, часов и лидерборда Steam пользователь должен войти через Steam, а его профиль, игровые данные и библиотека должны быть доступны настройками приватности Steam. Часы берутся из `GetOwnedGames`, достижения — из `GetPlayerAchievements`; лидерборд строится по кэшу пользователей сайта после обновления Steam-статистики.

Запуск с PostgreSQL-профилем:

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=postgres
```

Переменные для PostgreSQL:

- `SPRING_DATASOURCE_URL`, по умолчанию `jdbc:postgresql://localhost:5432/strategium`
- `SPRING_DATASOURCE_USERNAME`, по умолчанию `strategium`
- `SPRING_DATASOURCE_PASSWORD`, по умолчанию `strategium`

## Git Convention

В проекте используется формат Conventional Commits:

```text
type(scope): краткое описание на русском
```

Рекомендуемые типы:

- `feat` — новая функциональность.
- `fix` — исправление ошибки.
- `refactor` — изменение структуры без изменения поведения.
- `test` — тесты.
- `docs` — документация.
- `chore` — инфраструктура, настройки, служебные изменения.

Примеры:

```text
feat(auth): добавить вход через Steam
fix(feed): обработать пустой ответ VK
docs(readme): описать локальный запуск
```

## API

- `GET /api/news` — список новостей Strategium/Paradox. Backend автоматически подтягивает официальные новости Paradox Interactive и использует локальные seed-новости как fallback.
- `GET /api/feed/vk/strategium` — backend-прокси VK-ленты с текстом постов, вложениями, метриками и fallback-ответом.
- `POST /api/feed/vk/posts/{ownerId}_{postId}/like` — поставить лайк VK-посту от имени привязанного VK-пользователя.
- `POST /api/feed/vk/posts/{ownerId}_{postId}/comments` — оставить комментарий VK-посту от имени привязанного VK-пользователя, тело: `{ "message": "Текст" }`.
- `GET /api/steam/games` — публичный каталог поддерживаемых игр в Steam: Paradox Interactive и дополнительные игры сообщества.
- `GET /api/steam/achievements` — достижения и часы текущего Steam-пользователя только по поддерживаемым играм, отсортированные по доступности и прогрессу.
- `GET /api/steam/achievements?game=hearts-of-iron-iv` — достижения текущего пользователя по одной игре.
- `POST /api/steam/stats/refresh` — обновить кэш Steam-статистики текущего пользователя для лидерборда.
- `GET /api/steam/leaderboard?scope=pdx&sort=achievements` — публичный лидерборд по достижениям или часам; `scope=pdx|all`, `sort=achievements|hours`.
- `GET /api/me` — текущий пользователь сессии или гость.
- `POST /api/auth/dev-login` — локальный dev-вход, тело: `{ "displayName": "Tester" }`.
- `GET /api/auth/steam/start` — начало Steam OpenID входа.
- `GET /api/auth/steam/callback` — Steam OpenID callback.
- `GET /api/auth/vk/start` — начало VK OAuth для привязки VK к текущему аккаунту.
- `GET /api/auth/vk/callback` — VK OAuth callback.
- `POST /api/auth/vk/unlink` — отвязать VK от текущего аккаунта.
- `POST /api/auth/logout` — выход и очистка сессии.
- `GET /api/division-templates` — список шаблонов текущего пользователя.
- `POST /api/division-templates` — создание шаблона.
- `PUT /api/division-templates/{id}` — обновление шаблона.
- `DELETE /api/division-templates/{id}` — удаление шаблона.

Пример тела для шаблона дивизии:

```json
{
  "name": "Пехотный шаблон",
  "lineSlots": ["infantry", "infantry", "artillery", null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
  "supportSlots": ["eng", "recon", null, null, null]
}
```

Backend сам пересчитывает боевую ширину, организацию, атаки, количество батальонов/рот поддержки и стоимость опыта перед сохранением.
