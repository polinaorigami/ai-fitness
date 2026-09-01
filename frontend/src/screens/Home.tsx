import { useState } from "react";
import { Btn, Card, Stat, greet, ActionIcon } from "../components/UI";
import { Today, User, ProgramT } from "../api";
import { haptic } from "../tg";

const DURATIONS: [number, string][] = [
  [5, "Разминка"], [10, "Короткая"], [20, "Оптимальная"],
  [30, "Полноценная"], [45, "Продвинутая"], [60, "Максимальная"],
];

function QuickAction({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "18px 12px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, cursor: "pointer", color: "var(--ink)", transition: "border-color .15s, transform .08s" }}
    >
      <span style={{ color: "var(--accent)", display: "flex" }}><ActionIcon name={icon} /></span>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
    </button>
  );
}

export default function Home({ user, today, program, onStart, onDuration, go }: { user: User; today: Today; program: ProgramT; onStart: (dayIndex: number) => void; onShort: () => void; onDuration: (minutes: number) => void; go: (t: string) => void }) {
  const d = today.day;
  const [showTime, setShowTime] = useState(false);
  const [busyMin, setBusyMin] = useState<number | null>(null);
  const pickTime = async (m: number) => {
    if (busyMin) return;
    haptic(); setBusyMin(m);
    try { await onDuration(m); } catch { setBusyMin(null); setShowTime(false); }
  };
  return (
    <div className="screen fade">
      <div className="row between">
        <div><div className="eyebrow">AI FITNESS</div><h1 className="display" style={{ fontSize: 26 }}>{greet()}, {user.first_name} 👋</h1></div>
        {user.photo_url && <img src={user.photo_url} style={{ width: 44, height: 44, borderRadius: 14 }} />}
      </div>
      {d.rest ? (
        <Card accent><div className="eyebrow">Сегодня</div><div className="big" style={{ margin: "10px 0" }}>ОТДЫХ</div>
          <div style={{ opacity: .85 }}>Восстановление — часть плана. {today.next && <>Следующая: {today.next.weekday.toLowerCase()}, {today.next.title.toLowerCase()}.</>}</div>
          <div style={{ height: 16 }} />
          {today.next && <Btn kind="ghost" onClick={() => onStart(today.next!.day_index)}>Тренироваться сегодня</Btn>}
        </Card>
      ) : today.done_today ? (
        <Card accent><div className="eyebrow">Сегодня</div><div className="mid" style={{ margin: "10px 0" }}>{d.title} — выполнено ✅</div>
          {today.next && <div style={{ opacity: .85 }}>Следующая: {today.next.weekday.toLowerCase()}, {today.next.title.toLowerCase()}.</div>}</Card>
      ) : (
        <Card accent><div className="eyebrow">Сегодня</div><div className="big" style={{ margin: "10px 0", fontSize: 40 }}>{d.title.toUpperCase()}</div>
          <div className="row" style={{ gap: 20, marginBottom: 20 }}><div><div className="mid">{d.exercises.length}</div><div style={{ fontSize: 13, opacity: .8 }}>упражнений</div></div><div><div className="mid">~{today.estimated_minutes}</div><div style={{ fontSize: 13, opacity: .8 }}>минут</div></div></div>
          <Btn kind="ghost" onClick={() => onStart(today.day_index)}>Начать тренировку</Btn>
          <div style={{ height: 10 }} />
          <Btn kind="ghost" onClick={() => setShowTime(true)}>Подобрать по времени</Btn>
        </Card>
      )}
      <div className="eyebrow" style={{ margin: "18px 0 10px" }}>Быстрые действия</div>
      <div className="grid2" style={{ marginBottom: 20, gap: 10 }}>
        <QuickAction icon="stretch" label="Растяжка" onClick={() => go("mind")} />
        <QuickAction icon="meditation" label="Медитация" onClick={() => go("mind")} />
        <QuickAction icon="breathing" label="Дыхание" onClick={() => go("mind")} />
        <QuickAction icon="music" label="Музыка" onClick={() => window.dispatchEvent(new CustomEvent("aifitness:open-music"))} />
      </div>
      <div className="eyebrow" style={{ margin: "8px 0 10px" }}>Твой прогресс</div>
      <div className="grid2" style={{ marginBottom: 14 }}>
        <Stat v={<>🔥 {today.streak}</>} l="серия тренировок" />
        <Stat v={<>{today.week_done} / {today.week_target}</>} l="на этой неделе" />
      </div>
      {today.next && <Card><div className="eyebrow">Следующая тренировка</div><div className="row between" style={{ marginTop: 8 }}><div className="mid">{today.next.weekday}</div><div style={{ color: "var(--muted)" }}>{today.next.title}</div></div></Card>}
      <Btn kind="ghost" onClick={() => go("schedule")}>Моё расписание</Btn>
      <div style={{ height: 12 }} />
      <Btn kind="soft" onClick={() => go("coach")}>Мой AI-тренер</Btn>

      {/* Выбор длительности тренировки */}
      {showTime && (
        <div onClick={() => !busyMin && setShowTime(false)} style={{ position: "fixed", inset: 0, background: "var(--sheet-scrim)", display: "flex", alignItems: "flex-end", zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, margin: "0 auto", background: "var(--bg)", borderRadius: "20px 20px 0 0", padding: 24, paddingBottom: "calc(24px + var(--safe-b))", animation: "rise .3s ease" }}>
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 700 }}>Сколько у тебя времени?</h2>
              <p style={{ margin: 0, fontSize: 14, color: "var(--muted)" }}>Подберём тренировку под доступное время</p>
            </div>
            <div className="grid2" style={{ gap: 10 }}>
              {DURATIONS.map(([m, label]) => (
                <button key={m} onClick={() => pickTime(m)} disabled={busyMin !== null}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "16px 10px", borderRadius: 14, border: "1px solid var(--line)", background: busyMin === m ? "var(--accent-soft)" : "var(--card)", cursor: "pointer", color: "var(--ink)", opacity: busyMin !== null && busyMin !== m ? 0.5 : 1 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--display)" }}>{busyMin === m ? "…" : m}</span>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>{busyMin === m ? "собираем" : `мин · ${label}`}</span>
                </button>
              ))}
            </div>
            <div style={{ height: 12 }} />
            <Btn kind="ghost" onClick={() => setShowTime(false)} disabled={busyMin !== null}>Отмена</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
