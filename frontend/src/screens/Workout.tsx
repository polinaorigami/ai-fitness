import { useEffect, useMemo, useRef, useState } from "react";
import { Btn, Card, Stat, Stepper, fmtMin } from "../components/UI";
import { api, Day, Exercise, Finish } from "../api";
import { openLink, notify, haptic } from "../tg";

type Phase = "overview" | "exercise" | "set" | "rest" | "finish" | "feedback";
type Log = { exercise_id: string; set_number: number; weight_kg: number; reps: number };
type Saved = { dayIndex: number; phase: Phase; ei: number; si: number; w: number; reps: number; logs: Log[]; sid: number | null; rest: number; restTotal: number; startedAt: number };

const SESSION_KEY = "aifitness_active_workout";
const loadSession = (dayIndex: number): Saved | null => {
  try { const raw = localStorage.getItem(SESSION_KEY); if (!raw) return null;
    const s = JSON.parse(raw) as Saved;
    if (s.dayIndex !== dayIndex || s.phase === "finish" || s.phase === "feedback") return null;
    return s;
  } catch { return null; }
};
const saveSession = (s: Saved) => { try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch {} };
export const clearSession = () => { try { localStorage.removeItem(SESSION_KEY); } catch {} };
export const hasActiveSession = () => { try { const raw = localStorage.getItem(SESSION_KEY); if (!raw) return null;
    const s = JSON.parse(raw) as Saved; return s.phase === "finish" || s.phase === "feedback" ? null : s.dayIndex; } catch { return null; } };

export default function Workout({ day, dayIndex, exercises, onExit }: { day: Day; dayIndex: number; exercises: Record<string, Exercise>; onExit: () => void }) {
  const resumed = useMemo(() => loadSession(dayIndex), []);
  const [phase, setPhase] = useState<Phase>(resumed?.phase ?? "overview");
  const [ei, setEi] = useState(resumed?.ei ?? 0); const [si, setSi] = useState(resumed?.si ?? 1);
  const [w, setW] = useState(resumed?.w ?? 0); const [reps, setReps] = useState(resumed?.reps ?? 10);
  const [logs, setLogs] = useState<Log[]>(resumed?.logs ?? []);
  const [sid, setSid] = useState<number | null>(resumed?.sid ?? null);
  const [rest, setRest] = useState(resumed?.rest ?? 0); const [restTotal, setRestTotal] = useState(resumed?.restTotal ?? 0);
  const [fin, setFin] = useState<Finish | null>(null);
  const [rpe, setRpe] = useState(5); const [hard, setHard] = useState(""); const [easy, setEasy] = useState(""); const [fbMsg, setFbMsg] = useState("");
  const [how, setHow] = useState(false); const [err, setErr] = useState("");
  const [showRemoveExercise, setShowRemoveExercise] = useState(false);
  const [visibleExercises, setVisibleExercises] = useState<number[]>(day.exercises.map((_, i) => i));
  const start = useRef(resumed?.startedAt ?? Date.now());
  const cur = day.exercises[ei]; const ex = exercises[cur?.exercise_id];
  const parseReps = (r: string) => parseInt(r) || 10;

  useEffect(() => { if (!resumed && cur) { setW(cur.weight_kg); setReps(parseReps(cur.reps)); } }, [ei]);
  useEffect(() => {
    if (phase !== "rest") return;
    if (rest <= 0) { notify("success"); return; }
    const t = setTimeout(() => setRest(rest - 1), 1000); return () => clearTimeout(t);
  }, [phase, rest]);

  // Сохраняем прогресс тренировки на устройстве, чтобы при закрытии/перезагрузке приложения
  // можно было продолжить с того же места, а не начинать заново.
  useEffect(() => {
    if (phase === "overview") { clearSession(); return; }
    saveSession({ dayIndex, phase, ei, si, w, reps, logs, sid, rest, restTotal, startedAt: start.current });
  }, [phase, ei, si, w, reps, logs, sid, rest, restTotal]);

  const begin = async () => { try { const r = await api.sessionStart(dayIndex); setSid(r.session_id); start.current = Date.now(); setPhase("exercise"); } catch (e: any) { setErr(e.message); } };
  const doneSet = () => {
    haptic("medium");
    setLogs([...logs, { exercise_id: cur.exercise_id, set_number: si, weight_kg: w, reps }]);
    if (si < cur.sets) { setRest(cur.rest_sec); setRestTotal(cur.rest_sec); setPhase(cur.rest_sec ? "rest" : "set"); if (!cur.rest_sec) setSi(si + 1); }
    else nextExercise();
  };
  const nextExercise = () => { if (ei + 1 < day.exercises.length) { setEi(ei + 1); setSi(1); setPhase("exercise"); } else finishAll(); };
  const removeExercise = () => {
    setVisibleExercises(v => v.filter(i => i !== ei));
    setShowRemoveExercise(false);
    nextExercise();
  };
  const goBack = () => {
    if (phase === "rest") { setPhase("set"); return; }
    if (si > 1) { setSi(si - 1); setPhase("exercise"); return; }
    if (ei > 0) { setEi(ei - 1); setSi(day.exercises[ei - 1].sets); setPhase("exercise"); return; }
    setPhase("overview");
  };
  const canGoBack = phase === "rest" || si > 1 || ei > 0 || phase === "exercise";
  const finishAll = async (partial?: Log[]) => {
    const all = partial ?? logs;
    try { const r = await api.sessionFinish(sid!, { duration_sec: Math.round((Date.now() - start.current) / 1000), sets: all }); setFin(r); setPhase("finish"); clearSession(); notify("success"); }
    catch (e: any) { setErr(e.message); }
  };
  const sendFb = async () => { try { const r = await api.feedback(sid!, { rpe, too_hard: hard, too_easy: easy }); setFbMsg(r.message); } catch (e: any) { setErr(e.message); } };
  const totalSets = useMemo(() => day.exercises.reduce((a, x) => a + x.sets, 0), [day]);

  const Video = () => ex?.youtube_url
    ? <Btn kind="soft" onClick={() => openLink(ex.youtube_url!)}>Как правильно выполнять ▶</Btn>
    : <Btn kind="ghost" onClick={() => openLink(`https://www.youtube.com/results?search_query=${encodeURIComponent((ex?.name || cur.name) + " техника выполнения")}`)}>Найти видео на YouTube</Btn>;

  if (phase === "overview") return (
    <div className="screen no-nav fade">
      <button className="btn ghost sm" onClick={onExit}>Назад</button>
      <div className="eyebrow" style={{ marginTop: 12 }}>{day.weekday}</div>
      <h1 className="display">{day.title.toUpperCase()}</h1>
      <p className="sub">{day.exercises.length} упражнений · {totalSets} подходов</p>
      <Card>{day.exercises.map((x, i) => <div key={i} className="ex-row"><span className="ex-num">{i + 1}</span><div style={{ flex: 1 }}><div style={{ fontWeight: 500 }}>{x.name}</div><div style={{ fontSize: 13, color: "var(--muted)" }}>{x.sets} × {x.reps}{x.weight_kg ? ` · ${x.weight_kg} кг` : ""}</div></div></div>)}</Card>
      {err && <div className="err">{err}</div>}
      <div style={{ height: 8 }} />
      <Btn kind="accent" onClick={begin}>Начать тренировку</Btn>
    </div>
  );

  if (phase === "exercise" || phase === "set") return (
    <div className="screen no-nav fade" key={`${ei}-${si}-${phase}`}>
      <div className="row between">
        <div className="row" style={{ gap: 8 }}>
          {canGoBack && <button className="btn ghost sm" onClick={goBack}>← Назад</button>}
          <button className="btn ghost sm" onClick={() => { if (confirm("Завершить тренировку досрочно? Выполненные подходы сохранятся.")) finishAll(); }}>Завершить</button>
        </div>
        <span className="eyebrow">{ei + 1} / {day.exercises.length} упражнений</span>
      </div>
      <div className="progressbar" style={{ margin: "12px 0 20px" }}><i style={{ width: `${((ei + (si - 1) / cur.sets) / day.exercises.length) * 100}%` }} /></div>
      <div className="eyebrow">{day.title}</div>
      <h1 className="display" style={{ fontSize: 30 }}>{ex?.name.toUpperCase() || cur.name}</h1>
      {phase === "exercise" ? (<>
        <div className="grid2" style={{ marginBottom: 14 }}>
          <div className="stat"><div className="v">{cur.sets}</div><div className="l">подхода</div></div>
          <div className="stat"><div className="v">{cur.reps}</div><div className="l">повторений</div></div>
          <div className="stat"><div className="v">{cur.rest_sec}<span style={{ fontSize: 14 }}> с</span></div><div className="l">отдых</div></div>
          <div className="stat"><div className="v">{cur.weight_kg || "—"}{cur.weight_kg ? <span style={{ fontSize: 14 }}> кг</span> : ""}</div><div className="l">{cur.weight_kg ? "вес" : "свой вес"}</div></div>
        </div>
        {how && ex && <Card><div className="eyebrow">📖 Техника выполнения</div><p style={{ fontSize: 15, marginTop: 10, marginBottom: 16, lineHeight: 1.6 }}>{ex.technique}</p><div className="eyebrow" style={{ marginTop: 16 }}>⚠️ Типичные ошибки</div><p style={{ fontSize: 15, color: "var(--muted)", marginTop: 10, lineHeight: 1.6 }}>{ex.mistakes}</p></Card>}
        <div className="stack">
          <Btn kind="accent" onClick={() => setPhase("set")}>Начать подход {si}</Btn>
          <Btn kind="ghost" onClick={() => setHow(!how)}>{how ? "▲ Скрыть" : "▼ Как выполнять"}</Btn>
          <Video />
          <Btn kind="ghost" onClick={() => setShowRemoveExercise(true)}>Пропустить упражнение</Btn>
        </div>
      </>) : (<>
        <div className="eyebrow" style={{ margin: "6px 0 14px" }}>Подход {si} из {cur.sets}</div>
        <div className="stack">
          <div><div className="eyebrow" style={{ marginBottom: 8 }}>Вес</div><Stepper value={w} step={2.5} onChange={setW} unit="кг" /></div>
          <div><div className="eyebrow" style={{ marginBottom: 8 }}>Повторения</div><Stepper value={reps} step={1} min={1} onChange={setReps} unit="" /></div>
          <div style={{ height: 8 }} />
          <Btn kind="accent" onClick={doneSet}>Подход выполнен</Btn>
        </div>
      </>)}
    </div>
  );

  if (phase === "rest") {
    const pct = restTotal ? rest / restTotal : 0;
    const R = 104;
    const C = 2 * Math.PI * R;
    return (
      <div className="screen no-nav fade" style={{ textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div className="row between" style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "12px 18px" }}>
          <button className="btn ghost sm" style={{ width: "auto" }} onClick={goBack}>← Назад</button>
          <button className="btn ghost sm" style={{ width: "auto" }} onClick={() => setRest(0)}>Пропустить</button>
        </div>
        <div className="eyebrow" style={{ marginBottom: 8 }}>⏱️ ОТДЫХАЕМ</div>
        <div className="timer-ring">
          <svg viewBox="0 0 240 240" width="100%">
            <circle cx="120" cy="120" r={R} fill="none" stroke="var(--line)" strokeWidth="10" />
            <circle cx="120" cy="120" r={R} fill="none" stroke="var(--accent)" strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} style={{ transition: "stroke-dashoffset 1s linear" }} />
          </svg>
          <div className="n">
            <div className="big" style={{ fontSize: 72, fontFamily: "var(--display)" }}>{rest}</div>
            <div style={{ color: "var(--muted)", fontSize: 14 }}>секунд</div>
          </div>
        </div>
        {rest > 0 ? (
          <>
            <p className="sub" style={{ marginTop: 16, marginBottom: 20 }}>Следующий: подход {si + 1} из {cur.sets}</p>
            <div className="grid2" style={{ marginTop: 20 }}>
              <Btn kind="ghost" onClick={() => { setRest(rest + 15); setRestTotal(restTotal + 15); }}>+15 сек</Btn>
              <Btn kind="accent" onClick={() => setRest(0)}>Готов</Btn>
            </div>
          </>
        ) : (
          <>
            <h1 className="display" style={{ fontSize: 34, marginTop: 16 }}>ГОТОВЫ?</h1>
            <p className="sub">Начинаем подход {si + 1} из {cur.sets}</p>
            <div className="stack" style={{ marginTop: 20 }}>
              <Btn kind="accent" onClick={() => { setSi(si + 1); setPhase("set"); }}>Начать подход</Btn>
              <Btn kind="ghost" onClick={() => { setRest(restTotal); }}>Отдохнуть ещё</Btn>
            </div>
          </>
        )}
      </div>
    );
  }

  if (phase === "finish" && fin) return (
    <div className="screen no-nav fade">
      <div className="eyebrow" style={{ marginTop: 20 }}>Готово</div>
      <h1 className="display" style={{ fontSize: 34, animation: "pulse 0.8s ease" }}>ТРЕНИРОВКА ЗАВЕРШЕНА 🔥</h1>
      <div className="grid2" style={{ margin: "20px 0" }}>
        <Stat v={fmtMin(fin.duration_sec)} l="продолжительность" style={{ animation: "slideInUp 0.4s ease both" }} />
        <Stat v={fin.exercises} l="упражнений" style={{ animation: "slideInUp 0.4s ease 0.1s both" }} />
        <Stat v={fin.sets_done} l={`подходов из ${fin.sets_total}`} style={{ animation: "slideInUp 0.4s ease 0.2s both" }} />
        <Stat v={`${fin.percent}%`} l="выполнено" style={{ animation: "slideInUp 0.4s ease 0.3s both" }} />
      </div>
      <Card accent style={{ animation: "slideInUp 0.4s ease 0.4s both" }}>
        <div className="eyebrow">Серия</div>
        <div className="big">🔥 {fin.streak}</div>
      </Card>
      <Btn kind="accent" onClick={() => setPhase("feedback")}>Дальше</Btn>
      <style>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );

  if (phase === "feedback") return (
    <div className="screen no-nav fade">
      <h1 className="display" style={{ fontSize: 30 }}>Как прошла тренировка?</h1>
      <p className="sub">1 — очень легко · 5 — нормально · 10 — очень тяжело</p>
      <div className="chips" style={{ marginBottom: 20 }}>{Array.from({ length: 10 }, (_, i) => i + 1).map(n => <button key={n} className={`chip ${rpe === n ? "on" : ""}`} style={{ width: 48, justifyContent: "center", fontFamily: "var(--display)", fontWeight: 700 }} onClick={() => { haptic(); setRpe(n); }}>{n}</button>)}</div>
      <div className="stack">
        <input placeholder="Что было слишком тяжёлым?" value={hard} onChange={e => setHard(e.target.value)} />
        <input placeholder="Что было слишком лёгким?" value={easy} onChange={e => setEasy(e.target.value)} />
        {fbMsg ? <><Card accent><div className="eyebrow">AI-тренер</div><div style={{ marginTop: 8, fontSize: 17 }}>{fbMsg}</div></Card><Btn kind="accent" onClick={onExit}>На главную</Btn></>
          : <Btn kind="accent" onClick={sendFb}>Отправить</Btn>}
        {err && <div className="err">{err}</div>}
      </div>
    </div>
  );

  // Remove exercise confirmation modal
  if (showRemoveExercise && cur) {
    return (
      <div className="screen no-nav fade" style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
        <div style={{ position: "fixed", inset: 0, background: "var(--sheet-scrim)", zIndex: 100 }} onClick={() => setShowRemoveExercise(false)} />
        <div style={{ position: "relative", zIndex: 101, background: "var(--bg)", borderRadius: "20px 20px 0 0", padding: "24px 18px", paddingBottom: "calc(24px + var(--safe-b))" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>Пропустить упражнение?</h2>
            <p style={{ fontSize: 14, color: "var(--muted)", margin: 0 }}>{cur.name}</p>
          </div>
          <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 20, lineHeight: 1.5, textAlign: "center" }}>
            Это упражнение будет исключено из тренировки. Выполненные подходы не сохранятся.
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn kind="ghost" onClick={() => setShowRemoveExercise(false)} style={{ flex: 1 }}>Отмена</Btn>
            <Btn kind="danger" onClick={removeExercise} style={{ flex: 1 }}>Пропустить</Btn>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
