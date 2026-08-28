from pydantic import BaseModel, Field

class OnboardingIn(BaseModel):
    goal: str; days_per_week: int = Field(ge=2, le=6); location: str; minutes: int
    level: str; age: int = Field(ge=12, le=100); height_cm: float; weight_kg: float
    sex: str | None = None; equipment: list[str] = []; focus_zone: str | None = None

class SetIn(BaseModel):
    exercise_id: str; set_number: int; weight_kg: float = 0; reps: int = 0

class SessionStart(BaseModel):
    day_index: int

class SessionFinish(BaseModel):
    duration_sec: int; sets: list[SetIn]

class FeedbackIn(BaseModel):
    rpe: int = Field(ge=1, le=10); too_hard: str = ""; too_easy: str = ""

class MeasurementIn(BaseModel):
    weight: float | None = None; waist: float | None = None; hips: float | None = None
    chest: float | None = None; arm: float | None = None; thigh: float | None = None

class ChatIn(BaseModel):
    text: str

class SettingsIn(BaseModel):
    remind_workout: bool | None = None; remind_rest: bool | None = None
    weekly_report: bool | None = None; remind_progress: bool | None = None
    workout_time: str | None = None; timezone_offset: int | None = None
    taplink_url: str | None = None; focus_zone: str | None = None
