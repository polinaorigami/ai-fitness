from datetime import datetime, date
from sqlalchemy import String, Integer, Float, Boolean, DateTime, Date, JSON, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .db import Base

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)          # Telegram user id
    first_name: Mapped[str] = mapped_column(String(128), default="")
    username: Mapped[str | None] = mapped_column(String(128))
    photo_url: Mapped[str | None] = mapped_column(String(512))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    goal: Mapped[str | None] = mapped_column(String(32))
    days_per_week: Mapped[int | None] = mapped_column(Integer)
    location: Mapped[str | None] = mapped_column(String(16))
    minutes: Mapped[int | None] = mapped_column(Integer)
    level: Mapped[str | None] = mapped_column(String(16))
    age: Mapped[int | None] = mapped_column(Integer)
    height_cm: Mapped[float | None] = mapped_column(Float)
    weight_kg: Mapped[float | None] = mapped_column(Float)
    sex: Mapped[str | None] = mapped_column(String(8))
    equipment: Mapped[list] = mapped_column(JSON, default=list)
    onboarded: Mapped[bool] = mapped_column(Boolean, default=False)
    remind_workout: Mapped[bool] = mapped_column(Boolean, default=True)
    remind_rest: Mapped[bool] = mapped_column(Boolean, default=True)
    weekly_report: Mapped[bool] = mapped_column(Boolean, default=True)
    remind_progress: Mapped[bool] = mapped_column(Boolean, default=True)
    workout_time: Mapped[str] = mapped_column(String(5), default="18:00")
    timezone_offset: Mapped[int] = mapped_column(Integer, default=180)  # минуты от UTC
    taplink_url: Mapped[str | None] = mapped_column(String(256))

class Program(Base):
    __tablename__ = "programs"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    strategy: Mapped[dict] = mapped_column(JSON)
    week: Mapped[list] = mapped_column(JSON)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

class WorkoutSession(Base):
    __tablename__ = "sessions"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    day_index: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(64))
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime)
    duration_sec: Mapped[int] = mapped_column(Integer, default=0)
    exercises_total: Mapped[int] = mapped_column(Integer, default=0)
    sets_done: Mapped[int] = mapped_column(Integer, default=0)
    sets_total: Mapped[int] = mapped_column(Integer, default=0)
    rpe: Mapped[int | None] = mapped_column(Integer)
    too_hard: Mapped[str | None] = mapped_column(Text)
    too_easy: Mapped[str | None] = mapped_column(Text)
    sets: Mapped[list["SetLog"]] = relationship(back_populates="session", cascade="all, delete-orphan")

class SetLog(Base):
    __tablename__ = "set_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("sessions.id"), index=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True)
    exercise_id: Mapped[str] = mapped_column(String(64), index=True)
    set_number: Mapped[int] = mapped_column(Integer)
    weight_kg: Mapped[float] = mapped_column(Float, default=0)
    reps: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    session: Mapped[WorkoutSession] = relationship(back_populates="sets")

class Measurement(Base):
    __tablename__ = "measurements"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    date: Mapped[date] = mapped_column(Date, default=date.today)
    weight: Mapped[float | None] = mapped_column(Float)
    waist: Mapped[float | None] = mapped_column(Float)
    hips: Mapped[float | None] = mapped_column(Float)
    chest: Mapped[float | None] = mapped_column(Float)
    arm: Mapped[float | None] = mapped_column(Float)
    thigh: Mapped[float | None] = mapped_column(Float)

class Photo(Base):
    __tablename__ = "photos"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    kind: Mapped[str] = mapped_column(String(16), default="progress")
    label: Mapped[str] = mapped_column(String(32), default="")
    path: Mapped[str] = mapped_column(String(512))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class ChatMessage(Base):
    __tablename__ = "chat"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    role: Mapped[str] = mapped_column(String(8))
    text: Mapped[str] = mapped_column(Text)
    actions: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
