"""Мини-миграции схемы, которые выполняются при старте сервера.

Зачем: SQLAlchemy create_all() создаёт только ОТСУТСТВУЮЩИЕ таблицы и никогда
не меняет уже существующую — ни тип колонки, ни набор колонок. База, созданная
до этого исправления, хранит telegram id в обычном INTEGER (максимум
2 147 483 647), а современные Telegram id больше этого числа — любой запрос
такого пользователя падал с `integer out of range`, и приложение показывало
«Не удалось подключиться».

ВАЖНО: продовая база — SQLite (DATABASE_URL=sqlite:///./aifitness.db на
Render), а не Postgres. Раньше ADD_COLUMNS (добавление недостающих колонок)
выполнялось только для Postgres — на SQLite новые колонки моделей никогда не
появлялись бы в уже существующей таблице, и приложение падало бы на первом же
обращении к ним. BIGINT_COLUMNS остаётся Postgres-only (SQLite и так хранит
целые в 64 битах — там это не нужно), а ADD_COLUMNS выполняется для ОБОИХ
бэкендов. Добавление колонки через ALTER TABLE ... ADD COLUMN не трогает уже
существующие строки/колонки и ничего не удаляет — это безопасно для живых
данных.
"""
import logging
from sqlalchemy import text
from .db import engine

log = logging.getLogger(__name__)

# (таблица, колонка) -> перевести в BIGINT (только Postgres)
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

# (таблица, колонка, SQL-тип) -> добавить, если отсутствует. Работает и на
# Postgres, и на SQLite — типы ниже валидны в обеих СУБД.
ADD_COLUMNS = [
    ("users", "friend_code", "VARCHAR(12)"),
    ("users", "last_seen_app_version", "VARCHAR(16)"),
    ("friend_messages", "kind", "VARCHAR(16) DEFAULT 'text'"),
    ("friend_messages", "payload", "TEXT"),
]


def _add_missing_columns_postgres(conn) -> None:
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
    tables = {t for (t, _c) in existing}
    for table, column, sqltype in ADD_COLUMNS:
        if table in tables and (table, column) not in existing:
            conn.execute(text(f'ALTER TABLE "{table}" ADD COLUMN "{column}" {sqltype}'))
            log.warning("migrate: added %s.%s %s", table, column, sqltype)


def _add_missing_columns_sqlite(conn) -> None:
    for table, column, sqltype in ADD_COLUMNS:
        # PRAGMA table_info возвращает пустой результат, если таблицы нет —
        # тогда пропускаем (create_all() уже создал бы её со всеми колонками).
        cols = {row[1] for row in conn.execute(text(f'PRAGMA table_info("{table}")')).fetchall()}
        if not cols or column in cols:
            continue
        conn.execute(text(f'ALTER TABLE "{table}" ADD COLUMN "{column}" {sqltype}'))
        log.warning("migrate: added %s.%s %s", table, column, sqltype)


def run_migrations() -> None:
    is_postgres = engine.url.get_backend_name().startswith("postgres")
    with engine.begin() as conn:
        if is_postgres:
            _add_missing_columns_postgres(conn)
        else:
            _add_missing_columns_sqlite(conn)
