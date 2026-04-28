# StrategiumID Frontend

Этот каталог намеренно отделён от Spring Boot backend. Сейчас интерфейс написан на обычных HTML/CSS/JavaScript, но дальше его можно развить в Vite/React/Vue-приложение без переноса backend-кода.

## Запуск

```bash
python -m http.server 5173
```

Откройте [http://localhost:5173](http://localhost:5173).

По умолчанию `app.js` обращается к backend по адресу `http://localhost:8080`. Если нужен другой API URL, задайте переменную в `index.html` перед подключением `app.js`:

```html
<script>
  window.STRATEGIUM_API_BASE_URL = "https://api.example.com";
</script>
```

На Amvera frontend будет отдаваться Spring Boot приложением из того же контейнера, поэтому API вызывается с текущего домена автоматически.

## Steam-достижения

Модалка «Достижения» использует backend endpoints `/api/steam/games` и `/api/steam/achievements`. Для реальных данных backend должен быть запущен с `STEAM_WEB_API_KEY`, а пользователь должен войти через Steam. В каталоге отображаются только поддерживаемые игры, включая Paradox Interactive и «Бесконечное лето».

## VK-привязка

Модалка «Настройки» позволяет привязать VK через `/api/auth/vk/start`. После привязки в карточках VK-ленты становятся доступны лайк и отправка комментария через backend endpoints `/api/feed/vk/posts/{postId}/like` и `/api/feed/vk/posts/{postId}/comments`.
