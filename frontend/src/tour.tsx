// Короткая обучающая подсказка для тех, кто открыл приложение впервые: куда нажимать
// и что где находится. Показывается один раз (флаг в localStorage), можно пропустить.
import { useState } from "react";
import { haptic } from "./tg";

const SEEN_KEY = "aifitness_tour_seen";
export const tourSeen = () => { try { return localStorage.getItem(SEEN_KEY) === "1"; } catch { return true; } };
export const markTourSeen = () => { try { localStorage.setItem(SEEN_KEY, "1"); } catch {} };

const STEPS = [
  { icon: "🏋️", title: "Твоя тренировка", text: "На главном экране — кнопка «Начать тренировку». Там же короткая версия на 20 минут, если мало времени." },
  { icon: "🧭", title: "Меню внизу", text: "Переключайся между разделами: Главная, Тренировка, Расписание, Прогресс, Профиль. Порядок и видимость можно менять в Профиле." },
  { icon: "♪", title: "Музыка", text: "Кружок с нотой — плеер. Тапни, чтобы открыть список треков и кнопки play/pause. Его можно перетащить в любое удобное место." },
  { icon: "⚙️", title: "Профиль", text: "Здесь: акцент тренировок (например только ягодицы), цвет приложения, напоминания и обратная связь — расскажи, что нравится, а что нет." },
];

export default function Tour({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;
  const s = STEPS[step];
  const finish = () => { haptic(); markTourSeen(); onClose(); };
  const next = () => { haptic(); if (last) finish(); else setStep(step + 1); };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "flex-end" }}>
      <div className="fade" style={{ background: "var(--card)", color: "var(--ink)", width: "100%", maxWidth: 480, margin: "0 auto",
          borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: "24px 20px calc(24px + env(safe-area-inset-bottom,0px))" }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>{s.icon}</div>
        <div className="mid" style={{ marginBottom: 8 }}>{s.title}</div>
        <div style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.5, marginBottom: 20 }}>{s.text}</div>
        <div className="row between" style={{ marginBottom: 14 }}>
          {STEPS.map((_, i) => <div key={i} style={{ height: 4, borderRadius: 4, flex: 1, margin: "0 3px", background: i <= step ? "var(--accent)" : "var(--line)" }} />)}
        </div>
        <div className="row" style={{ gap: 10 }}>
          {!last && <button className="btn ghost" onClick={finish}>Пропустить</button>}
          <button className="btn primary" onClick={next}>{last ? "Понятно, начнём" : "Дальше"}</button>
        </div>
      </div>
    </div>
  );
}
