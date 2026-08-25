# AI FITNESS — Telegram Mini App (бесплатный MVP)

Персональный AI-тренер внутри Telegram. Весь интерфейс — на русском. Работает без единого платного сервиса.

## 1. Архитектура

```
Telegram-клиент
 ├── Bot (aiogram, long polling)  ── /start, напоминания, кнопки «Перенести / Оставить»
 └── Mini App (React + Vite, HTTPS)
        │  Authorization: tma <initData>  (подпись проверяется на бэкенде)
        ▼
 FastAPI (backend/app)
   ├── telegram_auth.py      — валидация initData по HMAC, автосоздание пользователя (без регистрации)
   ├── exercises.py + data/exercises.json — БАЗА УПРАЖНЕНИЙ (73 шт., 10 категорий)
   ├── program_generator.py  — детерминированный генератор программы (бесплатный fallback; работает всегда)
   ├── ai/provider.py        — интерфейс AIProvider: rules | ollama | openai_compat
   └── routers/api.py        — REST API
 SQLite (по умолчанию) / PostgreSQL (DATABASE_URL)
 uploads/<user_id>/…        — фото пользователя (только на вашем сервере)
```

Принцип: **AI выбирает и адаптирует, база отвечает за существование упражнения.** Генератор берёт упражнения только из `exercises.json`; AI-провайдер получает список и может лишь написать резюме/ответ в чате. Придумать упражнение он физически не может — данные не проходят через него.

## 2. Структура папок

```
ai-fitness/
├── backend/
│   ├── app/
│   │   ├── main.py, config.py, db.py, models.py, schemas.py
│   │   ├── telegram_auth.py, exercises.py, program_generator.py
│   │   ├── ai/provider.py
│   │   ├── routers/api.py
│   │   └── data/exercises.json
│   ├── bot/bot.py
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── index.html, vite.config.ts, package.json
    └── src/
        ├── App.tsx (роутинг по состоянию), api.ts, tg.ts, styles.css
        ├── components/UI.tsx
        └── screens/ Welcome · Onboarding · Photos · Analysis · Home · Schedule · Workout · Progress · Profile · Coach
```

## 3. Схема базы данных

| Таблица | Ключевые поля |
|---|---|
| `users` | id (= Telegram ID), first_name, username, photo_url, goal, days_per_week, location, minutes, level, age, height_cm, weight_kg, sex, equipment (JSON), onboarded, remind_* (4 флага), workout_time, timezone_offset |
| `programs` | user_id, strategy (JSON), week (JSON — 7 дней с упражнениями/подходами/весами), active |
| `sessions` | user_id, day_index, title, started_at, finished_at, duration_sec, exercises_total, sets_done, sets_total, rpe, too_hard, too_easy |
| `set_logs` | session_id, user_id, exercise_id, set_number, weight_kg, reps |
| `measurements` | user_id, date, weight, waist, hips, chest, arm, thigh |
| `photos` | user_id, kind (profile/progress), label («Неделя 4»), path |
| `chat` | user_id, role (user/ai), text, actions (JSON) |

Таблицы создаются автоматически при первом запуске (`Base.metadata.create_all`).

## 4. API (все — с заголовком `Authorization: tma <initData>`)

| Метод | Путь | Что делает |
|---|---|---|
| GET | /api/me | Профиль (создаётся автоматически) |
| POST | /api/onboarding | Сохранить анкету (8 шагов) |
| PATCH | /api/settings | Уведомления, время, часовой пояс |
| GET | /api/exercises | База упражнений |
| POST | /api/program/generate | Сгенерировать программу (+ AI-резюме) |
| GET | /api/program | Текущая программа |
| GET | /api/today | Главный экран: сегодня, серия, неделя, следующая |
| POST | /api/program/reschedule | Перенести сегодня на завтра |
| POST | /api/program/adjust?direction=up\|down | ±веса по программе |
| POST | /api/program/short | 20-минутная версия сегодняшней |
| POST | /api/session/start | Начать тренировку |
| POST | /api/session/{id}/finish | Завершить, записать подходы |
| POST | /api/session/{id}/feedback | RPE 1–10 + адаптация весов на этот день |
| GET | /api/progress | Серия, кол-во, время, веса, регулярность, замеры |
| POST | /api/measurements | Добавить замеры |
| GET/POST | /api/photos | Список / загрузка фото |
| GET | /api/photos/{id}/file | Файл фото (только владельцу) |
| DELETE | /api/photos, /api/history, /api/account | Удаление данных |
| GET/POST | /api/coach | История чата / сообщение AI-тренеру |

## 5. Экраны

Приветствие → Онбординг (8 шагов) → Фото → «Анализируем профиль» → «Твоя стратегия готова» (+ «Показать мою цель») → Главная → Расписание → Тренировка (обзор → упражнение → подход → таймер отдыха → …) → «Тренировка завершена» → Обратная связь → Прогресс (статистика / замеры / фото + сравнение) → Профиль (анкета, уведомления, удаление данных) → Мой AI-тренер (чат с кнопками действий).

Нижнее меню: Главная · Тренировка · Прогресс · Профиль.

## 6. Стек

Frontend: React 18 + Vite + TypeScript, Telegram WebApp SDK, шрифты Unbounded / Golos Text (Google Fonts, кириллица).
Backend: Python 3.11+, FastAPI, SQLAlchemy 2, aiogram 3, APScheduler.
БД: SQLite (по умолчанию) → PostgreSQL одной переменной.

## 7. Что бесплатно / что стоит денег

| Компонент | Бесплатно? | Как |
|---|---|---|
| Telegram Bot API + Mini App | ✅ | — |
| Хостинг backend + bot | ✅ | Oracle Cloud Always Free, Fly.io / Render free tier, любой VPS ~ $4 |
| Хостинг frontend (статика) | ✅ | GitHub Pages, Cloudflare Pages, Vercel, Netlify |
| HTTPS для Mini App | ✅ | Даётся хостингами статики; для разработки — `ngrok`/`cloudflared` |
| База данных | ✅ | SQLite на диске; Postgres — Neon / Supabase free tier |
| Генерация программы | ✅ | `program_generator.py`, без модели |
| AI-чат и резюме стратегии | ✅ при `AI_PROVIDER=rules` (правила) или `ollama` (локальная модель на вашем сервере, нужно ≥ 8 ГБ RAM) | — |
| AI через внешний API | ⚠️ **Для этой функции потребуется внешний платный API** (или бесплатный лимит провайдера). Бесплатная альтернатива: `rules` / `ollama` | `AI_PROVIDER=openai_compat` |
| Анализ фотографий моделью | ⚠️ **Для этой функции потребуется внешний платный API** (vision-модель). В MVP фото сохраняются и используются для сравнения прогресса; стратегия строится по анкете. Бесплатная альтернатива: локальная vision-модель в Ollama (llava) через тот же `AIProvider` | отключено |
| «Показать мою цель» с генерацией картинки | ⚠️ **Потребуется внешний платный API**. В MVP — текстовая мотивационная визуализация с обязательной пометкой | текст |
| YouTube-видео | ✅ | Прямые ссылки заполняются в `exercises.json` → `youtube_url`. Если ссылки нет — кнопка «Найти видео на YouTube» открывает поиск по названию упражнения (URL не выдумываются) |

Итого: MVP запускается за **$0**.

## 8. Пошаговый запуск

1. **Бот.** В @BotFather: `/newbot` → токен. Затем `/newapp` (или `/mybots → Bot Settings → Menu Button`) и укажите HTTPS-адрес фронтенда.
2. **Backend.**
   ```bash
   cd backend && cp .env.example .env   # вставьте BOT_TOKEN и WEBAPP_URL
   pip install -r requirements.txt
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
3. **Бот с напоминаниями** (отдельный процесс, та же папка):
   ```bash
   python -m bot.bot
   ```
4. **Frontend.**
   ```bash
   cd frontend && cp .env.example .env   # VITE_API_URL=https://ваш-backend
   npm install && npm run build           # dist/ — выложить на любой статический хостинг
   ```
5. **Локальная разработка без Telegram:** в `backend/.env` поставьте `DEV_SKIP_AUTH=true`, запустите `npm run dev` — фронтенд будет ходить как пользователь `dev:42`.
6. **Заполнить YouTube-ссылки** в `backend/app/data/exercises.json`.
7. **Включить локальный AI (опционально):** установить Ollama, `ollama pull qwen2.5:7b`, в `.env` → `AI_PROVIDER=ollama`.

## 9. Безопасность и данные

- Токен бота и ключи — только в `backend/.env`; во фронтенде нет ни одного секрета.
- Подпись `initData` проверяется на каждом запросе (HMAC-SHA256 по алгоритму Telegram).
- Фото доступны только владельцу, лежат на вашем сервере, не отправляются сторонним сервисам и не используются для обучения.
- Кнопки «Удалить фотографии / историю / аккаунт» реально удаляют данные.

## 10. Ограничения AI (зашиты в системный промпт и в правила)

Никаких диагнозов, процента жира по фото, обещаний внешнего вида или гарантированного результата. При словах «боль/травма» — совет обратиться к специалисту и предложение убрать нагрузку.
