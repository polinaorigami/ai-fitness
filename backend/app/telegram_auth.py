"""Проверка подписи Telegram WebApp initData (официальный алгоритм)."""
import hashlib, hmac, json
from urllib.parse import parse_qsl
from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from .config import BOT_TOKEN, DEV_SKIP_AUTH
from .db import get_db
from .models import User

def validate_init_data(init_data: str) -> dict:
    data = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = data.pop("hash", None)
    if not received_hash:
        raise HTTPException(401, "Нет подписи Telegram")
    check_string = "\n".join(f"{k}={v}" for k, v in sorted(data.items()))
    secret = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
    calc = hmac.new(secret, check_string.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(calc, received_hash):
        raise HTTPException(401, "Неверная подпись Telegram")
    return json.loads(data.get("user", "{}"))

def current_user(authorization: str = Header(default=""), db: Session = Depends(get_db)) -> User:
    init_data = authorization.removeprefix("tma ").strip()
    if DEV_SKIP_AUTH and not init_data:
        tg = {"id": 1, "first_name": "Тест", "username": "dev"}
    elif DEV_SKIP_AUTH and init_data.startswith("dev:"):
        tg = {"id": int(init_data[4:]), "first_name": "Тест", "username": "dev"}
    else:
        tg = validate_init_data(init_data)
    if not tg.get("id"):
        raise HTTPException(401, "Откройте приложение из Telegram")
    user = db.get(User, tg["id"])
    if not user:
        user = User(id=tg["id"], first_name=tg.get("first_name", ""), username=tg.get("username"),
                    photo_url=tg.get("photo_url"))
        db.add(user); db.commit()
    return user
