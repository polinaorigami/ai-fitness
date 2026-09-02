import { useEffect, useRef, useState } from "react";
import { api, Msg } from "../api";
import { haptic } from "../tg";
import { IconBtn } from "../components/UI";
export default function Coach({ onBack, onProgramChanged }: { onBack: () => void; onProgramChanged: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([]); const [text, setText] = useState(""); const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { api.coachHistory().then(h => setMsgs(h.length ? h : [{ role: "ai", text: "Привет! Я твой AI-тренер. Напиши, если нужно перенести тренировку, что-то слишком легко или тяжело, или есть вопрос по упражнению.", actions: [] }])); }, []);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  const send = async (t: string) => {
    if (!t.trim() || busy) return; setText(""); setBusy(true);
    setMsgs(m => [...m, { role: "user", text: t, actions: [] }]);
    try { const r = await api.coach(t); setMsgs(m => [...m, r]); } catch (e: any) { setMsgs(m => [...m, { role: "ai", text: "Не удалось получить ответ. Попробуй ещё раз.", actions: [] }]); } finally { setBusy(false); }
  };
  const action = async (a: string) => {
    haptic(); let reply = "";
    if (a === "ПЕРЕНЕСТИ") { await api.reschedule(); reply = "Перенёс тренировку на завтра. Сегодня — отдых ✅"; onProgramChanged(); }
    else if (a === "УВЕЛИЧИТЬ") { await api.adjust("up"); reply = "Увеличил рабочие веса на 5% по всей программе 💪"; onProgramChanged(); }
    else if (a === "СНИЗИТЬ" || a === "УБРАТЬ НАГРУЗКУ") { await api.adjust("down"); reply = "Снизил рабочие веса на 10%. Следи за техникой."; onProgramChanged(); }
    else if (a === "20 МИНУТ") { reply = "Открой сегодняшнюю тренировку с главного экрана и нажми «Короткая версия» — соберу 20-минутный вариант."; }
    else reply = "Хорошо, оставляем как есть.";
    setMsgs(m => [...m.map(x => ({ ...x, actions: [] })), { role: "user", text: a, actions: [] }, { role: "ai", text: reply, actions: [] }]);
  };
  return (
    <div className="screen no-nav" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <div className="row between">
        <IconBtn onClick={onBack} aria-label="Назад">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </IconBtn>
        <span className="eyebrow">Мой AI-тренер</span>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, padding: "16px 0" }}>
        {msgs.map((m, i) => <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "ai" ? "flex-start" : "flex-end", gap: 8 }}>
          <div className={`bubble ${m.role}`}>{m.text}</div>
          {m.actions?.length > 0 && <div className="chips">{m.actions.map(a => <button key={a} className="chip on" onClick={() => action(a)}>{a}</button>)}</div>}
        </div>)}
        {busy && <div className="bubble ai pulse">…</div>}<div ref={end} />
      </div>
      <div className="row" style={{ position: "sticky", bottom: "var(--safe-b)", background: "var(--bg)", paddingTop: 8 }}>
        <input placeholder="Напиши тренеру…" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && send(text)} />
        <button className="btn accent sm" style={{ height: 52 }} onClick={() => send(text)}>→</button>
      </div>
    </div>
  );
}
