"""Мини-миграции схемы, которые выполняются при старте сервера.

Зачем: SQLAlchemy create_all() создаёт только ОТСУТСТВУЮЩИЕ таблицы и никогда
не меняет тип уже существующей колонки. База, созданная до этого исправления,
хранит telegram id в обычном INTEGER (максимум 2 147 483 647), а современные
Telegram id больше этого числа — любой запрос такого пользователя падал с
`integer out of range`, и приложение показывало «Не удалось подключиться».
"""
import logging
from sqlalchemy import text
from .db import engine

log = logging.getLogger(__name__)

# (таблица, колонка) -> перевести в BIGINT
BIGINT_COLUMNS = [
    ("users", "id"),
    ("programs", "user_id"),
    ("sessions", "user_id"),
    ("set_logs", "user_id"),
    ("measurements", "user_id"),
    ("photos", "user_id"),
    ("app_feedback", "user_id"),
    ("chat", "user_id"),
    ("friendships", "owner_id"),
    ("friendships", "friend_id"),
    ("friend_invites", "from_id"),
    ("friend_invites", "to_id"),
    ("friend_messages", "from_id"),
    ("friend_messages", "to_id"),
]

# (таблица, колонка, SQL-тип) -> добавить, если отсутствует
ADD_COLUMNS = [
    ("users", "friend_code", "VARCHAR(12)"),
]


def run_migrations() -> None:
    if not engine.url.get_backend_name().startswith("postgres"):
        return  # SQLite хранит целые в 64 битах, миграция не нужна

    with engine.begin() as conn:
        existing = {
            (row[0], row[1]): row[2]
            for row in conn.execute(text(
                "SELECT table_name, column_name, data_type FROM information_schema.columns "
                "WHERE table_schema = current_schema()"
            ))
        }
        for table, column in BIGINT_COLUMNS:
            dtype = existing.get((table, column))
            if dtype is None or dtype == "bigint":
                continue
            conn.execute(text(
                f'ALTER TABLE "{table}" ALTER COLUMN "{column}" TYPE BIGINT'
            ))
            log.warning("migrate: %s.%s %s -> bigint", table, column, dtype)
        # добавляем недостающие колонки в существующие таблицы
        tables = {t for (t, _c) in existing}
        for table, column, sqltype in ADD_COLUMNS:
            if table in tables and (table, column) not in existing:
                conn.execute(text(f'ALTER TABLE "{table}" ADD COLUMN "{column}" {sqltype}'))
                log.warning("migrate: added %s.%s %s", table, column, sqltype)
