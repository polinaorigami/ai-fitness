# Деплой AI FITNESS: пошаговая инструкция

Код уже на GitHub: https://github.com/polinaorigami/ai-fitness

Схема: backend (FastAPI) + bot (aiogram) запускаются вместе в одном
Render **Web Service** (используют общий SQLite-файл — если развести их
по разным сервисам Render, у бота и API окажутся РАЗНЫЕ базы данных).
Frontend — отдельный Render **Static Site**.

## Шаг 1. Бот в @BotFather

1. Открой @BotFather в Telegram → `/newbot` (или используй уже созданный
   `@fitnessaipeiv_bot`) → получи **токен вида `123456:ABC...`**. Никому,
   кроме поля BOT_TOKEN в Render, его вставлять не нужно.
2. Пока не привязывай кнопку меню — сделаем это в Шаге 5, когда будет
   готов адрес фронтенда.

## Шаг 2. Render — Blueprint-деплой

1. Зайди на https://render.com и войди через GitHub (аккаунт с репозиторием
   `polinaorigami/ai-fitness`).
2. **New +** → **Blueprint**.
3. Выбери репозиторий `ai-fitness`. Render найдёт `render.yaml` в корне
   и предложит создать 2 сервиса: `ai-fitness-backend` (Web Service) и
   `ai-fitness-frontend` (Static Site).
4. На экране создания Render попросит заполнить переменные с `sync: false`:
   - `BOT_TOKEN` → вставь токен из Шага 1.
   - `WEBAPP_URL` и `VITE_API_URL` — на этом шаге ещё не знаем финальные
     адреса, можно временно поставить любое значение (например
     `https://example.com`), обновим в Шаге 4.
5. Нажми **Apply** и дождись, пока оба сервиса задеплоятся (первый билд
   фронтенда — пара минут, бэкенда — быстрее).

## Шаг 3. Узнать адреса сервисов

В дашборде Render у каждого сервиса под названием указан URL вида:
- `ai-fitness-backend` → `https://ai-fitness-backend-XXXX.onrender.com`
- `ai-fitness-frontend` → `https://ai-fitness-frontend-XXXX.onrender.com`

(Render иногда добавляет случайный суффикс, если имя занято — используй
то, что реально показано в дашборде.)

## Шаг 4. Прописать реальные адреса друг в друге

1. `ai-fitness-backend` → **Environment** → `WEBAPP_URL` = адрес
   `ai-fitness-frontend` из Шага 3 → **Save** (сервис перезапустится сам).
2. `ai-fitness-frontend` → **Environment** → `VITE_API_URL` = адрес
   `ai-fitness-backend` из Шага 3 → **Save**.
   ⚠️ Важно: `VITE_API_URL` "зашивается" в файлы фронтенда во время
   **сборки**, а не читается при старте. После сохранения зайди в
   `ai-fitness-frontend` → **Manual Deploy** → **Deploy latest commit**,
   чтобы фронтенд пересобрался с новым адресом.

## Шаг 5. Подключить Mini App в @BotFather

1. @BotFather → `/mybots` → выбери бота → **Bot Settings** → **Menu Button**
   (или `/newapp`) → вставь адрес `ai-fitness-frontend` из Шага 3.
2. Открой бота в Telegram → «ОТКРЫТЬ ПРИЛОЖЕНИЕ» → должен пройти онбординг.

## Известные ограничения бесплатного тарифа Render (важно!)

- **Данные не постоянны.** `ai-fitness-backend` на бесплатном плане не
  имеет постоянного диска — файл `aifitness.db` (SQLite) и загруженные
  фото сбрасываются при каждом редеплое и иногда при перезапуске сервиса
  после 15 минут простоя. Для реальных пользователей нужен один из
  вариантов:
  - Бесплатный Postgres на **Neon** (neon.tech) или **Supabase** — тогда
    в `DATABASE_URL` вставляется `postgresql+psycopg://...` вместо
    `sqlite:///...` (обе переменные BOT_TOKEN/DATABASE_URL — в Environment
    сервиса `ai-fitness-backend`; сам бот запускается в том же процессе,
    так что второй раз ничего настраивать не нужно).
  - Платный постоянный диск в Render (~$0.25/ГБ/мес).
  Могу настроить любой из вариантов по запросу — просто скажи.
- **Холодный старт.** Бесплатный Web Service «засыпает» после ~15 минут
  без запросов и просыпается ~30–60 секунд на первый запрос после этого.
