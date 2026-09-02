import { useState } from "react";
import { Btn, Err } from "../components/UI";
import { api } from "../api";
import { haptic } from "../tg";

const SEX = [["male", "М"], ["female", "Ж"]];
const GOALS = [["weight_loss", "🔥", "Снижение веса"], ["muscle", "💪", "Набор мышц"], ["recomp", "✨", "Рекомпозиция тела"], ["strength", "🏋️", "Стать сильнее"], ["fitness", "❤️", "Улучшить физическую форму"], ["endurance", "⚡", "Развить выносливость"]];
export const ZONES = [["full", "🧘", "Без акцента — всё тело"], ["glutes", "🍑", "Ягодицы"], ["legs", "🦵", "Ноги"], ["abs", "🔥", "Пресс"], ["back", "🦅", "Спина"], ["chest", "💪", "Грудь"], ["arms", "💪", "Руки"]];
const DAYS = [2, 3, 4, 5, 6];
const LOC = [["gym", "🏋️", "В тренажёрном зале"], ["home", "🏠", "Дома"], ["both", "🔄", "И дома, и в зале"]];
const LVL = [["beginner", "Новичок", "Меньше года регулярных тренировок"], ["intermediate", "Средний", "1–3 года"], ["advanced", "Продвинутый", "Больше 3 лет"]];
export const EQUIP = [["machine", "Тренажёры"], ["dumbbell", "Гантели"], ["barbell", "Штанга"], ["kettlebell", "Гири"], ["band", "Резинки"], ["pullup_bar", "Турник"], ["mat", "Коврик"], ["bodyweight", "Собственный вес"], ["bench", "Скамья"], ["jump_rope", "Скакалка"]];
const TOTAL = 8;

// Акцентная зона отдельным шагом анкеты не собирается (её нет в новом коротком
// онбординге, но она остаётся доступной и редактируемой позже в Профиле) —
// берём безопасное значение по умолчанию, как и раньше.
const DEFAULT_FOCUS_ZONE = "full";

const DRAFT_KEY = "aifitness_onboarding_draft";
const loadDraft = () => { try { const raw = localStorage.getItem(DRAFT_KEY); if (raw) return JSON.parse(raw); } catch {} return { step: 1, data: { equipment: ["bodyweight"], sex: "", age: 25, height_cm: 170, weight_kg: 65, minutes: 45 } }; };
const saveDraft = (step: number, data: any) => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, data })); } catch {} };
export const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch {} };

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const draft = loadDraft();
  const [s, setS] = useState(draft.step);
  const [d, setD] = useState<any>(draft.data);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const goStep = (v: number) => { setS(v); saveDraft(v, d); };
  const set = (k: string, v: any) => { const nd = { ...d, [k]: v }; setD(nd); saveDraft(s, nd); };
  const pick = (k: string, v: any) => { const nd = { ...d, [k]: v }; setD(nd); saveDraft(s + 1, nd); setTimeout(() => setS(s + 1), 180); };
  const toggleEq = (v: string) => set("equipment", d.equipment.includes(v) ? d.equipment.filter((x: string) => x !== v) : [...d.equipment, v]);

  const finish = async (data = d) => {
    setErr(""); setBusy(true);
    try {
      await api.onboarding({
        goal: data.goal, days_per_week: data.days_per_week, location: data.location, minutes: +data.minutes,
        level: data.level, age: +data.age, height_cm: +data.height_cm, weight_kg: +data.weight_kg,
        sex: data.sex || null, equipment: data.equipment, focus_zone: data.focus_zone || DEFAULT_FOCUS_ZONE,
      });
      clearDraft();
      onDone();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const pickAndFinish = (v: number) => { if (busy) return; const nd = { ...d, days_per_week: v }; setD(nd); finish(nd); };

  const Opt = ({ on, onClick, ic, children }: any) => <button className={`option ${on ? "on" : ""}`} onClick={() => { haptic(); onClick(); }}>{ic && <span className="ic">{ic}</span>}<span>{children}</span></button>;

  const steps: Record<number, JSX.Element> = {
    1: <><h1 className="display">Ты М или Ж?</h1><p className="sub">Это поможет точнее настроить программу.</p><div className="chips">{SEX.map(([k, l]) => <button key={k} className={`chip ${d.sex === k ? "on" : ""}`} style={{ fontSize: 18, padding: "16px 28px" }} onClick={() => pick("sex", k)}>{l}</button>)}</div></>,
    2: <><h1 className="display">Какая у тебя цель?</h1><div className="stack">{GOALS.map(([k, ic, l]) => <Opt key={k} on={d.goal === k} ic={ic} onClick={() => pick("goal", k)}>{l}</Opt>)}</div></>,
    3: <><h1 className="display">Какой у тебя опыт?</h1><div className="stack">{LVL.map(([k, l, h]) => <Opt key={k} on={d.level === k} onClick={() => pick("level", k)}><div>{l}<div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 400 }}>{h}</div></div></Opt>)}</div></>,
    4: <><h1 className="display">Где ты тренируешься?</h1><div className="stack">{LOC.map(([k, ic, l]) => <Opt key={k} on={d.location === k} ic={ic} onClick={() => pick("location", k)}>{l}</Opt>)}</div></>,
    5: <><h1 className="display">Какое оборудование тебе доступно?</h1><p className="sub">Можно выбрать несколько.</p><div className="chips" style={{ marginBottom: 24 }}>{EQUIP.map(([k, l]) => <button key={k} className={`chip ${d.equipment.includes(k) ? "on" : ""}`} onClick={() => { haptic(); toggleEq(k); }}>{l}</button>)}</div><Btn disabled={!d.equipment.length} onClick={() => goStep(6)}>Дальше</Btn></>,
    6: <><h1 className="display">О себе</h1><p className="sub">Настроим нагрузку под твои параметры.</p><div className="stack">
        <div className="slider-row">
          <div className="slider-label"><span className="k">Возраст</span><span className="v">{d.age} лет</span></div>
          <input className="range" type="range" min={14} max={80} step={1} value={d.age} onChange={e => set("age", +e.target.value)} />
        </div>
        <div className="slider-row">
          <div className="slider-label"><span className="k">Рост</span><span className="v">{d.height_cm} см</span></div>
          <input className="range" type="range" min={130} max={220} step={1} value={d.height_cm} onChange={e => set("height_cm", +e.target.value)} />
        </div>
        <div className="slider-row">
          <div className="slider-label"><span className="k">Вес</span><span className="v">{d.weight_kg} кг</span></div>
          <input className="range" type="range" min={35} max={180} step={1} value={d.weight_kg} onChange={e => set("weight_kg", +e.target.value)} />
        </div>
        <Btn onClick={() => goStep(7)}>Дальше</Btn></div></>,
    7: <><h1 className="display">Сколько минут на тренировку?</h1><p className="sub">Подгоним число упражнений и отдых под доступное время.</p><div className="stack">
        <div className="slider-row">
          <div className="slider-label"><span className="k">Время</span><span className="v">{d.minutes} мин</span></div>
          <input className="range" type="range" min={20} max={75} step={5} value={d.minutes} onChange={e => set("minutes", +e.target.value)} />
        </div>
        <Btn onClick={() => goStep(8)}>Дальше</Btn></div></>,
    8: <><h1 className="display">Сколько раз в неделю ты можешь тренироваться?</h1>{err && <Err e={err} />}<div style={{ height: err ? 12 : 0 }} /><div className="stack">{DAYS.map(n => <Opt key={n} on={d.days_per_week === n} onClick={() => pickAndFinish(n)}>{busy && d.days_per_week === n ? "Сохраняем…" : `${n} ${n < 5 ? "раза" : "раз"}`}</Opt>)}</div></>,
  };

  return (
    <div className="screen no-nav fade" key={s}>
      <div className="row between" style={{ marginBottom: 14 }}>
        <button className="btn ghost sm" style={{ visibility: s > 1 ? "visible" : "hidden" }} onClick={() => goStep(s - 1)}>Назад</button>
        <span className="eyebrow">Шаг {s} из {TOTAL}</span>
      </div>
      <div className="progressbar" style={{ marginBottom: 24 }}><i style={{ width: `${(s / TOTAL) * 100}%` }} /></div>
      {steps[s]}
    </div>
  );
}
