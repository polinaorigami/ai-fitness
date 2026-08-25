#!/usr/bin/env bash
# Запускает Telegram-бота в фоне и веб-сервер API на переднем плане.
# Так backend и bot работают в одном процессе Render Web Service
# и используют один и тот же файл SQLite (без этого бот и API
# видели бы РАЗНЫЕ базы данных, если запускать их отдельными сервисами).
set -e
python -m bot.bot &
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
