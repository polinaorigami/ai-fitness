"""Telegram-бот: /start + напоминания. Запуск: python -m bot.bot (из папки backend)."""
import asyncio, logging
from datetime import datetime, timedelta, date
from aiogram import Bot, Dispatcher, F
from aiogram.filters import CommandStart
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select
from app.config import BOT_TOKEN, WEBAPP_URL
from app.db import SessionLocal
from app.models import User, Program, WorkoutSession
from app.program_generator import generate
from app.ai.provider import get_provider

logging.basicConfig(level=logging.INFO)
bot = Bot(BOT_TOKEN); dp = Dispatcher()
ai = get_provider()
open_kb = InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(text="ОТКРЫТЬ ПРИЛОЖЕНИЕ", web_app=WebAppInfo(url=WEBAPP_URL))]])

# Те же ключи/подписи, что и в анкете (frontend/src/screens/Onboarding.tsx, ZONES) —
# держим в синхроне, если там меняется набор зон.
ZONES_BOT = [("full", "🧘", "Без акцента — всё тело"), ("glutes", "🍑", "Ягодицы"), ("legs", "🦵", "Ноги"),
             ("abs", "🔥", "Пресс"), ("back", "🦅", "Спина"), ("chest", "💪", "Грудь"), ("arms", "💪", "Руки")]
ZONE_LABEL_BY_KEY = {k: l for k, _ic, l in ZONES_BOT}

@dp.message(CommandStart())
async def start(m: Message):
    await m.answer("Добро пожаловать в AI FITNESS 💪\n\nПерсональный AI-тренер прямо внутри Telegram.", reply_markup=open_kb)

@dp.callback_query(F.data == "snooze")
async def snooze(c: CallbackQuery):
    await c.message.edit_text("Хорошо, напомню через час ⏳")
    await c.answer()
    await asyncio.sleep(3600)
    await c.message.answer("⏰ Напоминание\n\nПора на тренировку.", reply_markup=InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="НАЧАТЬ", web_app=WebAppInfo(url=WEBAPP_URL))]]))

@dp.callback_query(F.data == "move")
async def move(c: CallbackQuery):
    with SessionLocal() as db:
        u = db.get(User, c.from_user.id)
        p = db.scalar(select(Program).where(Program.user_id==u.id, Program.active==True).order_by(Program.id.desc()))
        if p:
            wd = (datetime.utcnow()+timedelta(minutes=u.timezone_offset)).weekday(); t=(wd+1)%7; w=list(p.week)
            w[wd], w[t] = dict(w[t], weekday=w[wd]["weekday"]), dict(w[wd], weekday=w[t]["weekday"]); p.week=w; db.commit()
    await c.message.edit_text("Перенёс тренировку на завтра ✅"); await c.answer()

@dp.callback_query(F.data == "keep")
async def keep(c: CallbackQuery):
    await c.message.edit_text("Расписание без изменений 👍"); await c.answer()

@dp.callback_query(F.data.startswith("zone:"))
async def pick_zone(c: CallbackQuery):
    zone = c.data.split(":", 1)[1]
    with SessionLocal() as db:
        u = db.get(User, c.from_user.id)
        if not u:
            await c.answer(); return
        u.focus_zone = zone
        if u.onboarded:
            # как и при смене акцента в Профиле — переgenerate-им программу под новую зону
            for p in db.scalars(select(Program).where(Program.user_id == u.id, Program.active == True)): p.active = False
            data = await ai.analyze_strategy(u, generate(u))
            db.add(Program(user_id=u.id, strategy=data["strategy"], week=data["week"]))
        db.commit()
    await c.message.edit_text(f"Готово — теперь акцент на «{ZONE_LABEL_BY_KEY.get(zone, zone)}» 🎯\nПрограмма обновлена.")
    await c.answer()

async def tick():
    """Каждую минуту: кому пора напомнить (локальное время пользователя == workout_time)."""
    now = datetime.utcnow()
    with SessionLocal() as db:
        for u in db.scalars(select(User).where(User.onboarded==True)):
            local = now + timedelta(minutes=u.timezone_offset)
            hhmm0 = local.strftime("%H:%M")
            # раз в месяц (1-е число, 19:00 локального) спрашиваем, не сменить ли акцентную зону —
            # она есть в Профиле, но там про неё никто не напоминает
            if u.remind_progress and local.day == 1 and hhmm0 == "19:00":
                try:
                    await bot.send_message(u.id, "🎯 На что хочешь сделать акцент в этом месяце?",
                        reply_markup=InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(text=f"{ic} {l}", callback_data=f"zone:{k}")] for k, ic, l in ZONES_BOT]))
                except Exception as e: logging.warning(e)
            p = db.scalar(select(Program).where(Program.user_id==u.id, Program.active==True).order_by(Program.id.desc()))
            if not p: continue
            day = p.week[local.weekday()]
            hhmm = local.strftime("%H:%M")
            if u.remind_workout and not day["rest"] and hhmm == u.workout_time:
                try:
                    await bot.send_message(u.id, f"⏰ Напоминание\n\nСегодня у тебя тренировка: {day['title'].lower()}.\nНачало: {u.workout_time}",
                        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                            [InlineKeyboardButton(text="НАЧАТЬ", web_app=WebAppInfo(url=WEBAPP_URL))],
                            [InlineKeyboardButton(text="НАПОМНИТЬ ПОЗЖЕ", callback_data="snooze")]]))
                except Exception as e: logging.warning(e)
            # пропуск: 22:00 локального, тренировка была, но не завершена
            if u.remind_workout and not day["rest"] and hhmm == "22:00":
                done = db.scalar(select(WorkoutSession).where(WorkoutSession.user_id==u.id, WorkoutSession.finished_at>=now-timedelta(hours=20)))
                if not done:
                    try:
                        await bot.send_message(u.id, "Ты не завершил(а) сегодняшнюю тренировку.\nПеренести?",
                            reply_markup=InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(text="НА ЗАВТРА", callback_data="move"),
                                                                                 InlineKeyboardButton(text="ОСТАВИТЬ РАСПИСАНИЕ", callback_data="keep")]]))
                    except Exception as e: logging.warning(e)
            # еженедельный отчёт: воскресенье 20:00
            if u.weekly_report and local.weekday()==6 and hhmm=="20:00":
                ws = date.today()-timedelta(days=6)
                n = len(list(db.scalars(select(WorkoutSession).where(WorkoutSession.user_id==u.id, WorkoutSession.finished_at>=datetime.combine(ws, datetime.min.time())))))
                try: await bot.send_message(u.id, f"📊 Итоги недели\n\nТренировок: {n} из {p.strategy['days']}\n{'Отличная неделя 🔥' if n>=p.strategy['days'] else 'На следующей неделе добьём план 💪'}", reply_markup=open_kb)
                except Exception as e: logging.warning(e)

async def main():
    sch = AsyncIOScheduler(); sch.add_job(tick, "cron", second=0); sch.start()
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
