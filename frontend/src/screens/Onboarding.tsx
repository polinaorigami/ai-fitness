import { useState } from "react";
import { Btn, Err } from "../components/UI";
import { api } from "../api";
import { haptic } from "../tg";

const GOALS = [["weight_loss", "🔥", "Снижение веса"], ["muscle", "💪", "Набор мышц"], ["recomp", "✨", "Рекомпозиция тела"], ["strength", "🏋️", "Стать сильнее"], ["fitness", "❤️", "Улучшить физическую форму"], ["endurance", "⚡", "Развить выносливость"]];
const DAYS = [2, 3, 4, 5, 6];
const LOC = [["gym", "🏋️", "В тренажёрном зале"], ["home", "🏠", "Дома"], ["both", "🔄", "И дома, и в зале"]];
const MIN = [20, 30, 45, 60, 75];
const LVL = [["beginner", "Новичок", "Меньше года регулярных тренировок"], ["intermediate", "Средний", "1–3 года"], ["advanced", "Продвинутый", "Больше 3 лет"]];
export const EQUIP = [["machine", "Тренажёры"], ["dumbbell", "Гантели"], ["barbell", "Штанга"], ["kettlebell", "Гири"], ["band", "Резинки"], ["pullup_bar", "Турник"], ["mat", "Коврик"], ["bodyweight", "Собственный вес"], ["bench", "Скамья"], ["jump_rope", "Скакалка"]];
const TOTAL = 8;

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [s, setS] = useState(1);
  const [d, setD] = useState<any>({ equipment: ["bodyweight"], sex: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setD({ ...d, [k]: v });
  const pick = (k: string, v: any) => { set(k, v); setTimeout(() => setS(s + 1), 180); };
  const toggleEq = (v: string) => set("equipment", d.equipment.includes(v) ? d.equipment.filter((x: string) => x !== v) : [...d.equipment, v]);

  const finish = async () => {
    setErr(""); setBusy(true);
    try {
      await api.onboarding({ goal: d.goal, days_per_week: d.days_per_week, location: d.location, minutes: d.minutes, level: d.level, age: +d.age, height_cm: +d.height_cm, weight_kg: +d.weight_kg, sex: d.sex || null, equipment: d.equipment });
      onDone();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  const Opt = ({ on, onClick, ic, children }: any) => <button className={`option ${on ? "on" : ""}`} onClick={() => { haptic(); onClick(); }}>{ic && <span className="ic">{ic}</span>}<span>{children}</span></button>;

  const steps: Record<number, JSX.Element> = {
    1: <><h1 className="display">Какая у тебя цель?</h1><div className="stack">{GOALS.map(([k, ic, l]) => <Opt key={k} on={d.goal === k} ic={ic} onClick={() => pick("goal", k)}>{l}</Opt>)}</div></>,
    2: <><h1 className="display">Сколько раз в неделю ты можешь тренироваться?</h1><div className="stack">{DAYS.map(n => <Opt key={n} on={d.days_per_week === n} onClick={() => pick("days_per_week", n)}>{n} {n < 5 ? "раза" : "раз"}</Opt>)}</div></>,
    3: <><h1 className="display">Где ты тренируешься?</h1><div className="stack">{LOC.map(([k, ic, l]) => <Opt key={k} on={d.location === k} ic={ic} onClick={() => pick("location", k)}>{l}</Opt>)}</div></>,
    4: <><h1 className="display">Сколько времени у тебя есть на тренировку?</h1><div className="stack">{MIN.map(n => <Opt key={n} on={d.minutes === n} onClick={() => pick("minutes", n)}>{n === 75 ? "75+ минут" : `${n} минут`}</Opt>)}</div></>,
    5: <><h1 className="display">Какой у тебя опыт?</h1><div className="stack">{LVL.map(([k, l, h]) => <Opt key={k} on={d.level === k} onClick={() => pick("level", k)}><div>{l}<div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 400 }}>{h}</div></div></Opt>)}</div></>,
    6: <><h1 className="display">Твой возраст</h1><input type="number" inputMode="numeric" placeholder="Например, 28" value={d.age || ""} onChange={e => set("age", e.target.value)} /><div style={{ height: 20 }} /><Btn disabled={!(+d.age >= 12 && +d.age <= 100)} onClick={() => setS(7)}>Дальше</Btn></>,
    7: <><h1 className="display">Твои параметры</h1><div className="stack">
        <div><div className="eyebrow" style={{ marginBottom: 6 }}>Рост, см</div><input type="number" inputMode="decimal" placeholder="170" value={d.height_cm || ""} onChange={e => set("height_cm", e.target.value)} /></div>
        <div><div className="eyebrow" style={{ marginBottom: 6 }}>Вес, кг</div><input type="number" inputMode="decimal" placeholder="65" value={d.weight_kg || ""} onChange={e => set("weight_kg", e.target.value)} /></div>
        <div><div className="eyebrow" style={{ marginBottom: 6 }}>Пол (по желанию)</div><div className="chips">{[["female", "Женский"], ["male", "Мужской"], ["", "Не указывать"]].map(([k, l]) => <button key={k} className={`chip ${d.sex === k ? "on" : ""}`} onClick={() => set("sex", k)}>{l}</button>)}</div></div>
        <Btn disabled={!(+d.height_cm > 100 && +d.weight_kg > 25)} onClick={() => setS(8)}>Дальше</Btn></div></>,
    8: <><h1 className="display">Какое оборудование тебе доступно?</h1><p className="sub">Можно выбрать несколько.</p><div className="chips" style={{ marginBottom: 24 }}>{EQUIP.map(([k, l]) => <button key={k} className={`chip ${d.equipment.includes(k) ? "on" : ""}`} onClick={() => { haptic(); toggleEq(k); }}>{l}</button>)}</div>{err && <Err e={err} />}<div style={{ height: 12 }} /><Btn kind="accent" disabled={busy || !d.equipment.length} onClick={finish}>{busy ? "Сохраняем…" : "Готово"}</Btn></>,
  };

  return (
    <div className="screen no-nav fade" key={s}>
      <div className="row between" style={{ marginBottom: 14 }}>
        <button className="btn ghost sm" style={{ visibility: s > 1 ? "visible" : "hidden" }} onClick={() => setS(s - 1)}>Назад</button>
        <span className="eyebrow">Шаг {s} из {TOTAL}</span>
      </div>
      <div className="progressbar" style={{ marginBottom: 24 }}><i style={{ width: `${(s / TOTAL) * 100}%` }} /></div>
      {steps[s]}
    </div>
  );
}
