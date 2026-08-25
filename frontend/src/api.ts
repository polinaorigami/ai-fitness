import { tg, inTelegram } from "./tg";
const BASE = import.meta.env.VITE_API_URL || "";
const DEV_ID = "42";
function auth() { return { Authorization: inTelegram ? `tma ${tg.initData}` : `tma dev:${DEV_ID}` }; }
async function req<T>(method: string, path: string, body?: unknown, form?: FormData): Promise<T> {
  const r = await fetch(BASE + path, { method, headers: { ...auth(), ...(body ? { "Content-Type": "application/json" } : {}) }, body: form ?? (body ? JSON.stringify(body) : undefined) });
  if (!r.ok) { let d = "Ошибка сервера"; try { d = (await r.json()).detail || d; } catch {} throw new Error(d); }
  return r.json();
}
export const api = {
  me: () => req<User>("GET", "/api/me"),
  onboarding: (b: any) => req<User>("POST", "/api/onboarding", b),
  settings: (b: any) => req<User>("PATCH", "/api/settings", b),
  exercises: () => req<Exercise[]>("GET", "/api/exercises"),
  generate: () => req<ProgramT>("POST", "/api/program/generate"),
  program: () => req<ProgramT>("GET", "/api/program"),
  today: () => req<Today>("GET", "/api/today"),
  reschedule: () => req<{ week: Day[] }>("POST", "/api/program/reschedule"),
  adjust: (d: "up" | "down") => req<{ week: Day[] }>("POST", `/api/program/adjust?direction=${d}`),
  short: () => req<{ day_index: number; day: Day }>("POST", "/api/program/short"),
  sessionStart: (day_index: number) => req<{ session_id: number }>("POST", "/api/session/start", { day_index }),
  sessionFinish: (id: number, b: any) => req<Finish>("POST", `/api/session/${id}/finish`, b),
  feedback: (id: number, b: any) => req<{ message: string }>("POST", `/api/session/${id}/feedback`, b),
  progress: () => req<Progress>("GET", "/api/progress"),
  measurement: (b: any) => req("POST", "/api/measurements", b),
  photos: () => req<PhotoT[]>("GET", "/api/photos"),
  uploadPhoto: (f: File, kind: string) => { const fd = new FormData(); fd.append("file", f); fd.append("kind", kind); return req<PhotoT>("POST", "/api/photos", undefined, fd); },
  photoUrl: (id: number) => `${BASE}/api/photos/${id}/file`,
  photoBlob: async (id: number) => { const r = await fetch(`${BASE}/api/photos/${id}/file`, { headers: auth() }); return URL.createObjectURL(await r.blob()); },
  deletePhotos: () => req("DELETE", "/api/photos"),
  deleteHistory: () => req("DELETE", "/api/history"),
  deleteAccount: () => req("DELETE", "/api/account"),
  coachHistory: () => req<Msg[]>("GET", "/api/coach"),
  coach: (text: string) => req<Msg>("POST", "/api/coach", { text }),
};
export type User = { id: number; first_name: string; username?: string; photo_url?: string; goal?: string; days_per_week?: number; location?: string; minutes?: number; level?: string; age?: number; height_cm?: number; weight_kg?: number; sex?: string; equipment: string[]; onboarded: boolean; remind_workout: boolean; remind_rest: boolean; weekly_report: boolean; remind_progress: boolean; workout_time: string; timezone_offset: number };
export type Exercise = { id: string; name: string; group: string; group_label: string; equipment_labels: string[]; level_label: string; description: string; technique: string; mistakes: string; youtube_url: string | null };
export type PlanEx = { exercise_id: string; name: string; sets: number; reps: string; rest_sec: number; weight_kg: number };
export type Day = { weekday: string; title: string; rest: boolean; exercises: PlanEx[] };
export type ProgramT = { id: number; strategy: { goal_label: string; days: number; focus: string[]; avg_minutes: number; summary?: string; progression: string; source: string }; week: Day[]; ai_provider: string };
export type Today = { day_index: number; day: Day; estimated_minutes: number; done_today: boolean; next: { day_index: number; weekday: string; title: string } | null; streak: number; week_done: number; week_target: number };
export type Finish = { duration_sec: number; exercises: number; sets_done: number; sets_total: number; percent: number; streak: number };
export type Progress = { streak: number; workouts: number; total_minutes: number; lifts: { exercise_id: string; name: string; first: number; last: number; history: { date: string; weight: number; reps: number }[] }[]; weekly: { week: number; count: number }[]; recent: { id: number; title: string; date: string; minutes: number; rpe: number | null }[]; measurements: Record<string, any>[] };
export type PhotoT = { id: number; label: string; kind: string; created_at: string };
export type Msg = { role: "user" | "ai"; text: string; actions: string[] };
