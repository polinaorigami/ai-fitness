import { useEffect, useState } from "react";
import { Btn, Card, Err } from "../components/UI";
import { api, ProgramT } from "../api";

export default function Analysis({ onDone }: { onDone: () => void }) {
  const [p, setP] = useState<ProgramT | null>(null);
  const [err, setErr] = useState(""); const [goal, setGoal] = useState(false);
  useEffect(() => { (async () => { try { const [r] = await Promise.all([api.generate(), new Promise(r => setTimeout(r, 2200))]); setP(r); } catch (e: any) { setErr(e.message); } })(); }, []);
  if (err) return <div className="screen no-nav"><Err e={err} /><div style={{ height: 12 }} /><Btn onClick={() => location.reload()}>Попробовать снова</Btn></div>;
  if (!p) return (
    <div className="screen no-nav" style={{ display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center" }}>
      <div className="pulse" style={{ width: 96, height: 96, borderRadius: 32, background: "var(--accent)", margin: "0 auto 32px" }} />
      <h1 className="display">АНАЛИЗИРУЕМ ПРОФИЛЬ</h1>
      <p className="sub">Определяем оптимальную тренировочную стратегию…</p>
    </div>
  );
  const s = p.strategy;
  return (
    <div className="screen no-nav fade">
      <div className="eyebrow">Готово</div>
      <h1 className="display">ТВОЯ СТРАТЕГИЯ ГОТОВА</h1>
      {s.summary && <p className="sub">{s.summary}</p>}
      <div className="grid2">
        <Card><div className="eyebrow">Цель</div><div className="mid" style={{ marginTop: 8 }}>{s.goal_label}</div></Card>
        <Card><div className="eyebrow">Тренировки</div><div className="big" style={{ marginTop: 8 }}>{s.days}</div><div style={{ color: "var(--muted)", fontSize: 13 }}>раза в неделю</div></Card>
      </div>
      <Card><div className="eyebrow">Основной акцент</div><div className="chips" style={{ marginTop: 10 }}>{s.focus.map(f => <span key={f} className="chip on">{f}</span>)}</div></Card>
      <Card><div className="eyebrow">Средняя продолжительность</div><div className="big" style={{ marginTop: 8 }}>{s.avg_minutes}<span style={{ fontSize: 20, marginLeft: 6 }}>мин</span></div></Card>
      <Card><div className="eyebrow">Прогрессия</div><div style={{ marginTop: 8, fontSize: 15 }}>{s.progression}</div></Card>
      {goal ? <Card><div className="eyebrow">Твоя цель</div><div className="mid" style={{ margin: "10px 0" }}>Через 12 недель: {s.days} тренировки в неделю, стабильная техника и рост рабочих весов по каждому упражнению.</div><div style={{ fontSize: 12, color: "var(--muted)" }}>Это мотивационная визуализация, а не гарантированный прогноз результата.</div></Card>
        : <Btn kind="ghost" onClick={() => setGoal(true)}>Показать мою цель</Btn>}
      <div style={{ height: 12 }} />
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12, textAlign: "center" }}>AI не ставит диагнозы и не обещает конкретный результат. При боли или травме обратись к врачу.</div>
      <Btn kind="accent" onClick={onDone}>Открыть план</Btn>
    </div>
  );
}
