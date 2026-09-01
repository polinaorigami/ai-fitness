import os, uuid, shutil, httpx
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from ..db import get_db
import secrets
from ..models import User, Program, WorkoutSession, SetLog, Measurement, Photo, ChatMessage, AppFeedback, Friendship, FriendInvite, FriendMessage
from ..telegram_auth import current_user
from ..schemas import *
from ..exercises import EXERCISES, BY_ID
from ..program_generator import generate, WEEKDAYS
from ..ai.provider import get_provider
from ..config import UPLOAD_DIR, BOT_TOKEN, ADMIN_CHAT_ID

r = APIRouter(prefix="/api")
ai = get_provider()

def _u(user: User):
    return {k: getattr(user, k) for k in ("id","first_name","username","photo_url","goal","days_per_week","location","minutes",
            "level","age","height_cm","weight_kg","sex","equipment","onboarded","remind_workout","remind_rest",
            "weekly_report","remind_progress","workout_time","timezone_offset","taplink_url","focus_zone")}

def _program(db, uid):
    return db.scalar(select(Program).where(Program.user_id==uid, Program.active==True).order_by(Program.id.desc()))

def _streak(db, uid):
    days = sorted({s.finished_at.date() for s in db.scalars(select(WorkoutSession).where(WorkoutSession.user_id==uid, WorkoutSession.finished_at!=None))}, reverse=True)
    streak, cur = 0, date.today()
    for d in days:
        if (cur - d).days <= 2: streak += 1; cur = d
        else: break
    return streak

# ---- пользователь ----
@r.get("/me")
def me(user: User = Depends(current_user)): return _u(user)

@r.post("/onboarding")
def onboarding(body: OnboardingIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    for k, v in body.model_dump().items(): setattr(user, k, v)
    user.onboarded = True
    db.commit()
    return _u(user)

@r.patch("/settings")
def settings(body: SettingsIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    for k, v in body.model_dump(exclude_none=True).items(): setattr(user, k, v)
    db.commit(); return _u(user)

# ---- упражнения ----
@r.get("/exercises")
def exercises(): return EXERCISES

# ---- программа ----
@r.post("/program/generate")
async def program_generate(user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not user.onboarded: raise HTTPException(400, "Сначала заполни анкету")
    for p in db.scalars(select(Program).where(Program.user_id==user.id, Program.active==True)): p.active = False
    data = await ai.analyze_strategy(user, generate(user))
    p = Program(user_id=user.id, strategy=data["strategy"], week=data["week"])
    db.add(p); db.commit()
    return {"id": p.id, "strategy": p.strategy, "week": p.week, "ai_provider": ai.name}

@r.get("/program")
def program(user: User = Depends(current_user), db: Session = Depends(get_db)):
    p = _program(db, user.id)
    if not p: raise HTTPException(404, "Программа ещё не создана")
    return {"id": p.id, "strategy": p.strategy, "week": p.week, "ai_provider": ai.name}

@r.get("/today")
def today(user: User = Depends(current_user), db: Session = Depends(get_db)):
    p = _program(db, user.id)
    if not p: raise HTTPException(404, "Программа ещё не создана")
    wd = (datetime.utcnow() + timedelta(minutes=user.timezone_offset)).weekday()
    today_day = p.week[wd]
    done_today = db.scalar(select(WorkoutSession).where(WorkoutSession.user_id==user.id, WorkoutSession.day_index==wd,
                            WorkoutSession.finished_at >= datetime.utcnow()-timedelta(hours=20)))
    nxt = next(((i, d) for i, d in ((j % 7, p.week[j % 7]) for j in range(wd+1, wd+8)) if not d["rest"]), None)
    week_start = date.today() - timedelta(days=date.today().weekday())
    week_done = db.scalar(select(func.count(WorkoutSession.id)).where(WorkoutSession.user_id==user.id,
                          WorkoutSession.finished_at >= datetime.combine(week_start, datetime.min.time())))
    est = lambda d: int(5 + sum(x["sets"]*0.75 + x["sets"]*x["rest_sec"]/60 for x in d["exercises"]))
    return {"day_index": wd, "day": today_day, "estimated_minutes": est(today_day), "done_today": bool(done_today),
            "next": {"day_index": nxt[0], "weekday": nxt[1]["weekday"], "title": nxt[1]["title"]} if nxt else None,
            "streak": _streak(db, user.id), "week_done": week_done, "week_target": p.strategy["days"]}

@r.post("/program/reschedule")
def reschedule(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Перенести сегодняшнюю тренировку на завтра (обмен дней)."""
    p = _program(db, user.id)
    wd = (datetime.utcnow() + timedelta(minutes=user.timezone_offset)).weekday()
    week = list(p.week); t = (wd+1) % 7
    week[wd], week[t] = dict(week[t], weekday=WEEKDAYS[wd]), dict(week[wd], weekday=WEEKDAYS[t])
    p.week = week; db.commit()
    return {"week": p.week}

@r.post("/program/adjust")
def adjust(direction: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """direction=up | down — прогрессия/регрессия рабочих весов на всей программе."""
    p = _program(db, user.id); k = 1.05 if direction == "up" else 0.9
    week = []
    for d in p.week:
        exs = [dict(x, weight_kg=round(x["weight_kg"]*k/2.5)*2.5 if x["weight_kg"] else 0) for x in d["exercises"]]
        week.append(dict(d, exercises=exs))
    p.week = week; db.commit()
    return {"week": p.week}

@r.post("/program/short")
def short_version(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """20-минутная версия сегодняшней тренировки: первые 4 упражнения, по 2 подхода, отдых 45 сек."""
    p = _program(db, user.id)
    wd = (datetime.utcnow() + timedelta(minutes=user.timezone_offset)).weekday()
    d = p.week[wd]
    if d["rest"]: raise HTTPException(400, "Сегодня день отдыха")
    exs = [dict(x, sets=2, rest_sec=min(x["rest_sec"], 45)) for x in d["exercises"][:4]]
    return {"day_index": wd, "day": dict(d, title=d["title"] + " · 20 минут", exercises=exs)}

@r.post("/program/duration")
def duration_version(minutes: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Собрать тренировку под доступное время (5–60 мин): подгоняем число упражнений,
    подходов и длину отдыха так, чтобы уложиться примерно в заданную длительность.
    Если сегодня день отдыха — берём ближайший тренировочный день."""
    minutes = max(5, min(60, minutes))
    p = _program(db, user.id)
    if not p: raise HTTPException(404, "Программа ещё не создана")
    wd = (datetime.utcnow() + timedelta(minutes=user.timezone_offset)).weekday()
    idx = wd
    if p.week[wd]["rest"]:
        idx = next((j % 7 for j in range(wd + 1, wd + 8) if not p.week[j % 7]["rest"]), -1)
        if idx < 0: raise HTTPException(400, "В программе нет тренировочных дней")
    d = p.week[idx]
    # параметры под время
    sets = 2 if minutes <= 20 else 3
    rest = 30 if minutes <= 10 else 45 if minutes <= 25 else 60
    per = sets * 0.75 + sets * rest / 60  # ≈ минут на упражнение
    n = max(1, min(len(d["exercises"]), round((minutes - 5) / per)))
    exs = [dict(x, sets=sets, rest_sec=min(x["rest_sec"], rest)) for x in d["exercises"][:n]]
    return {"day_index": idx, "day": dict(d, title=f"{d['title']} · {minutes} мин", exercises=exs)}

# ---- тренировка ----
@r.post("/session/start")
def session_start(body: SessionStart, user: User = Depends(current_user), db: Session = Depends(get_db)):
    p = _program(db, user.id); d = p.week[body.day_index]
    s = WorkoutSession(user_id=user.id, day_index=body.day_index, title=d["title"],
                       exercises_total=len(d["exercises"]), sets_total=sum(x["sets"] for x in d["exercises"]))
    db.add(s); db.commit(); return {"session_id": s.id}

@r.post("/session/{sid}/finish")
def session_finish(sid: int, body: SessionFinish, user: User = Depends(current_user), db: Session = Depends(get_db)):
    s = db.get(WorkoutSession, sid)
    if not s or s.user_id != user.id: raise HTTPException(404, "Тренировка не найдена")
    s.finished_at = datetime.utcnow(); s.duration_sec = body.duration_sec; s.sets_done = len(body.sets)
    for x in body.sets: db.add(SetLog(session_id=s.id, user_id=user.id, **x.model_dump()))
    db.commit()
    return {"duration_sec": s.duration_sec, "exercises": s.exercises_total, "sets_done": s.sets_done,
            "sets_total": s.sets_total, "percent": round(100*s.sets_done/max(1,s.sets_total)), "streak": _streak(db, user.id)}

@r.post("/session/{sid}/feedback")
def session_feedback(sid: int, body: FeedbackIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    s = db.get(WorkoutSession, sid)
    if not s or s.user_id != user.id: raise HTTPException(404, "Тренировка не найдена")
    s.rpe, s.too_hard, s.too_easy = body.rpe, body.too_hard, body.too_easy
    # Простая адаптация: RPE ≤ 5 → +2.5%; RPE ≥ 9 → −5% на упражнения этого дня
    p = _program(db, user.id); k = 1.025 if body.rpe <= 5 else 0.95 if body.rpe >= 9 else 1
    if k != 1:
        week = list(p.week); d = dict(week[s.day_index])
        d["exercises"] = [dict(x, weight_kg=round(x["weight_kg"]*k/2.5)*2.5 if x["weight_kg"] else 0) for x in d["exercises"]]
        week[s.day_index] = d; p.week = week
    db.commit()
    msg = ("Было легко — в следующий раз чуть добавим нагрузку." if k > 1 else
           "Было тяжело — в следующий раз немного снизим веса, чтобы сохранить технику." if k < 1 else
           "Нагрузка в самый раз. Продолжаем по плану.")
    return {"message": msg}

# ---- прогресс ----
@r.get("/progress")
def progress(user: User = Depends(current_user), db: Session = Depends(get_db)):
    sess = list(db.scalars(select(WorkoutSession).where(WorkoutSession.user_id==user.id, WorkoutSession.finished_at!=None).order_by(WorkoutSession.finished_at.desc())))
    # лучший вес по упражнениям (последние 8 недель)
    best = {}
    for sl in db.scalars(select(SetLog).where(SetLog.user_id==user.id).order_by(SetLog.created_at)):
        best.setdefault(sl.exercise_id, []).append({"date": sl.created_at.date().isoformat(), "weight": sl.weight_kg, "reps": sl.reps})
    lifts = [{"exercise_id": k, "name": BY_ID[k]["name"], "first": v[0]["weight"], "last": v[-1]["weight"], "history": v[-10:]}
             for k, v in best.items() if BY_ID.get(k) and v[-1]["weight"] > 0]
    weeks = {}
    for s in sess:
        wk = s.finished_at.isocalendar()[1]; weeks[wk] = weeks.get(wk, 0) + 1
    ms = list(db.scalars(select(Measurement).where(Measurement.user_id==user.id).order_by(Measurement.date)))
    return {"streak": _streak(db, user.id), "workouts": len(sess), "total_minutes": sum(s.duration_sec for s in sess)//60,
            "lifts": lifts, "weekly": [{"week": k, "count": v} for k, v in sorted(weeks.items())][-8:],
            "recent": [{"id": s.id, "title": s.title, "date": s.finished_at.date().isoformat(), "minutes": s.duration_sec//60, "rpe": s.rpe} for s in sess[:10]],
            "measurements": [{"date": m.date.isoformat(), "weight": m.weight, "waist": m.waist, "hips": m.hips, "chest": m.chest, "arm": m.arm, "thigh": m.thigh} for m in ms]}

@r.post("/measurements")
def add_measurement(body: MeasurementIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    m = Measurement(user_id=user.id, **body.model_dump()); db.add(m)
    if body.weight: user.weight_kg = body.weight
    db.commit(); return {"ok": True}

# ---- фото ----
@r.post("/photos")
def upload_photo(file: UploadFile = File(...), kind: str = Form("progress"), label: str = Form(""),
                 user: User = Depends(current_user), db: Session = Depends(get_db)):
    if file.content_type not in ("image/jpeg", "image/png", "image/webp"): raise HTTPException(400, "Только JPG, PNG или WEBP")
    d = os.path.join(UPLOAD_DIR, str(user.id)); os.makedirs(d, exist_ok=True)
    path = os.path.join(d, f"{uuid.uuid4().hex}.{file.filename.rsplit('.',1)[-1].lower()}")
    with open(path, "wb") as f: shutil.copyfileobj(file.file, f)
    if not label:
        n = db.scalar(select(func.count(Photo.id)).where(Photo.user_id==user.id, Photo.kind=="progress"))
        weeks_since = max(1, (date.today() - user.created_at.date()).days // 7 + 1)
        label = f"Неделя {weeks_since}" if kind == "progress" else "Профиль"
    ph = Photo(user_id=user.id, kind=kind, label=label, path=path); db.add(ph); db.commit()
    return {"id": ph.id, "label": ph.label, "kind": ph.kind, "created_at": ph.created_at.isoformat()}

@r.get("/photos")
def list_photos(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return [{"id": p.id, "label": p.label, "kind": p.kind, "created_at": p.created_at.isoformat()}
            for p in db.scalars(select(Photo).where(Photo.user_id==user.id).order_by(Photo.created_at))]

@r.get("/photos/{pid}/file")
def photo_file(pid: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    p = db.get(Photo, pid)
    if not p or p.user_id != user.id: raise HTTPException(404, "Фото не найдено")
    return FileResponse(p.path)

@r.delete("/photos")
def delete_photos(user: User = Depends(current_user), db: Session = Depends(get_db)):
    for p in db.scalars(select(Photo).where(Photo.user_id==user.id)):
        try: os.remove(p.path)
        except OSError: pass
        db.delete(p)
    db.commit(); return {"ok": True}

# ---- данные ----
@r.delete("/history")
def delete_history(user: User = Depends(current_user), db: Session = Depends(get_db)):
    for m in (WorkoutSession, Measurement, ChatMessage):
        for x in db.scalars(select(m).where(m.user_id==user.id)): db.delete(x)
    for x in db.scalars(select(SetLog).where(SetLog.user_id==user.id)): db.delete(x)
    db.commit(); return {"ok": True}

@r.delete("/account")
def delete_account(user: User = Depends(current_user), db: Session = Depends(get_db)):
    delete_photos(user, db); delete_history(user, db)
    for p in db.scalars(select(Program).where(Program.user_id==user.id)): db.delete(p)
    # чистим друзей, приглашения и переписку в обе стороны
    for row in db.scalars(select(Friendship).where((Friendship.owner_id==user.id) | (Friendship.friend_id==user.id))): db.delete(row)
    for row in db.scalars(select(FriendInvite).where((FriendInvite.from_id==user.id) | (FriendInvite.to_id==user.id))): db.delete(row)
    for row in db.scalars(select(FriendMessage).where((FriendMessage.from_id==user.id) | (FriendMessage.to_id==user.id))): db.delete(row)
    db.delete(user); db.commit(); return {"ok": True}

# ---- обратная связь по приложению ----
@r.post("/feedback")
async def app_feedback(body: AppFeedbackIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    fb = AppFeedback(user_id=user.id, liked=body.liked, comment=body.comment.strip())
    db.add(fb); db.commit()
    if ADMIN_CHAT_ID and BOT_TOKEN:
        mark = "👍" if body.liked is True else "👎" if body.liked is False else "💬"
        text = f"{mark} Отзыв от {user.first_name} (@{user.username or '—'}, id {user.id})\n\n{body.comment.strip() or '(без комментария)'}"
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                await client.post(f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage", json={"chat_id": ADMIN_CHAT_ID, "text": text})
        except Exception:
            pass
    return {"ok": True}

# ---- AI-коуч ----
@r.get("/coach")
def coach_history(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return [{"role": m.role, "text": m.text, "actions": m.actions} for m in
            db.scalars(select(ChatMessage).where(ChatMessage.user_id==user.id).order_by(ChatMessage.id).limit(50))]

@r.post("/coach")
async def coach(body: ChatIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    hist = [{"role": m.role, "text": m.text} for m in db.scalars(select(ChatMessage).where(ChatMessage.user_id==user.id).order_by(ChatMessage.id.desc()).limit(10))][::-1]
    p = _program(db, user.id); ctx = {}
    if p:
        wd = (datetime.utcnow() + timedelta(minutes=user.timezone_offset)).weekday()
        ctx = {"today_title": p.week[wd]["title"], "exercise_names": ", ".join(x["name"] for x in p.week[wd]["exercises"])}
    db.add(ChatMessage(user_id=user.id, role="user", text=body.text))
    reply = await ai.coach_reply(user, hist, body.text, ctx)
    db.add(ChatMessage(user_id=user.id, role="ai", text=reply["text"], actions=reply.get("actions", [])))
    db.commit()
    return reply

# ---- друзья ----
_CODE_ALPHABET = "ACEFHJKLMNPRTUVWXY3479"  # без похожих символов (0/O, 1/I, и т.п.)

def _ensure_code(db, user: User) -> str:
    """Гарантирует, что у пользователя есть уникальный код приглашения."""
    if user.friend_code:
        return user.friend_code
    for _ in range(20):
        code = "".join(secrets.choice(_CODE_ALPHABET) for _ in range(6))
        if not db.scalar(select(User).where(User.friend_code == code)):
            user.friend_code = code
            db.commit()
            return code
    raise HTTPException(500, "Не удалось сгенерировать код")

def _brief(u: User):
    return {"id": u.id, "first_name": u.first_name, "username": u.username, "photo_url": u.photo_url}

def _are_friends(db, a: int, b: int) -> bool:
    return bool(db.scalar(select(Friendship).where(Friendship.owner_id == a, Friendship.friend_id == b)))

@r.get("/friends")
def friends_list(user: User = Depends(current_user), db: Session = Depends(get_db)):
    code = _ensure_code(db, user)
    fids = [f.friend_id for f in db.scalars(select(Friendship).where(Friendship.owner_id == user.id).order_by(Friendship.created_at.desc()))]
    friends = [_brief(u) for u in db.scalars(select(User).where(User.id.in_(fids)))] if fids else []
    # сохраняем порядок по дате дружбы
    order = {fid: i for i, fid in enumerate(fids)}
    friends.sort(key=lambda f: order.get(f["id"], 0))
    incoming = db.scalar(select(func.count(FriendInvite.id)).where(FriendInvite.to_id == user.id, FriendInvite.status == "pending")) or 0
    # непрочитанные сообщения по каждому другу
    unread = {}
    for m in db.scalars(select(FriendMessage).where(FriendMessage.to_id == user.id, FriendMessage.read == False)):
        unread[m.from_id] = unread.get(m.from_id, 0) + 1
    for f in friends:
        f["unread"] = unread.get(f["id"], 0)
    return {"code": f"AI-{code}", "friends": friends, "incoming": incoming}

@r.post("/friends/invite")
def friend_invite(body: FriendInviteIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    raw = body.code.strip().upper().removeprefix("AI-").replace("-", "")
    if not raw:
        raise HTTPException(400, "Введите код")
    target = db.scalar(select(User).where(User.friend_code == raw))
    if not target:
        raise HTTPException(404, "Пользователь с таким кодом не найден")
    if target.id == user.id:
        raise HTTPException(400, "Это твой собственный код")
    if _are_friends(db, user.id, target.id):
        raise HTTPException(400, "Вы уже друзья")
    # уже есть приглашение от меня к ним?
    mine = db.scalar(select(FriendInvite).where(FriendInvite.from_id == user.id, FriendInvite.to_id == target.id, FriendInvite.status == "pending"))
    if mine:
        return {"status": "already_sent"}
    # встречное приглашение от них ко мне — сразу дружим
    theirs = db.scalar(select(FriendInvite).where(FriendInvite.from_id == target.id, FriendInvite.to_id == user.id, FriendInvite.status == "pending"))
    if theirs:
        theirs.status = "accepted"
        db.add_all([Friendship(owner_id=user.id, friend_id=target.id), Friendship(owner_id=target.id, friend_id=user.id)])
        db.commit()
        return {"status": "friends", "friend": _brief(target)}
    db.add(FriendInvite(from_id=user.id, to_id=target.id))
    db.commit()
    return {"status": "sent", "to": _brief(target)}

@r.get("/friends/invites")
def friend_invites(user: User = Depends(current_user), db: Session = Depends(get_db)):
    inc = list(db.scalars(select(FriendInvite).where(FriendInvite.to_id == user.id, FriendInvite.status == "pending").order_by(FriendInvite.id.desc())))
    out = list(db.scalars(select(FriendInvite).where(FriendInvite.from_id == user.id, FriendInvite.status == "pending").order_by(FriendInvite.id.desc())))
    ids = {i.from_id for i in inc} | {i.to_id for i in out}
    users = {u.id: u for u in db.scalars(select(User).where(User.id.in_(ids)))} if ids else {}
    return {
        "incoming": [{"invite_id": i.id, "user": _brief(users[i.from_id])} for i in inc if i.from_id in users],
        "outgoing": [{"invite_id": i.id, "user": _brief(users[i.to_id])} for i in out if i.to_id in users],
    }

@r.post("/friends/invite/{invite_id}/accept")
def friend_accept(invite_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    inv = db.get(FriendInvite, invite_id)
    if not inv or inv.to_id != user.id or inv.status != "pending":
        raise HTTPException(404, "Приглашение не найдено")
    inv.status = "accepted"
    if not _are_friends(db, user.id, inv.from_id):
        db.add_all([Friendship(owner_id=user.id, friend_id=inv.from_id), Friendship(owner_id=inv.from_id, friend_id=user.id)])
    db.commit()
    friend = db.get(User, inv.from_id)
    return {"status": "friends", "friend": _brief(friend) if friend else None}

@r.post("/friends/invite/{invite_id}/decline")
def friend_decline(invite_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    inv = db.get(FriendInvite, invite_id)
    if not inv or inv.to_id != user.id or inv.status != "pending":
        raise HTTPException(404, "Приглашение не найдено")
    inv.status = "declined"
    db.commit()
    return {"ok": True}

@r.delete("/friends/{fid}")
def friend_remove(fid: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    for row in db.scalars(select(Friendship).where(
        ((Friendship.owner_id == user.id) & (Friendship.friend_id == fid)) |
        ((Friendship.owner_id == fid) & (Friendship.friend_id == user.id)))):
        db.delete(row)
    db.commit()
    return {"ok": True}

@r.get("/friends/{fid}/messages")
def friend_messages(fid: int, after: int = 0, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not _are_friends(db, user.id, fid):
        raise HTTPException(403, "Вы не друзья")
    q = select(FriendMessage).where(
        (((FriendMessage.from_id == user.id) & (FriendMessage.to_id == fid)) |
         ((FriendMessage.from_id == fid) & (FriendMessage.to_id == user.id))) &
        (FriendMessage.id > after)).order_by(FriendMessage.id)
    msgs = list(db.scalars(q))
    # помечаем входящие как прочитанные
    changed = False
    for m in msgs:
        if m.to_id == user.id and not m.read:
            m.read = True; changed = True
    if changed:
        db.commit()
    return [{"id": m.id, "from_me": m.from_id == user.id, "text": m.text, "at": m.created_at.isoformat()} for m in msgs]

@r.post("/friends/{fid}/messages")
def friend_send(fid: int, body: FriendMessageIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not _are_friends(db, user.id, fid):
        raise HTTPException(403, "Вы не друзья")
    m = FriendMessage(from_id=user.id, to_id=fid, text=body.text.strip())
    db.add(m); db.commit()
    return {"id": m.id, "from_me": True, "text": m.text, "at": m.created_at.isoformat()}
