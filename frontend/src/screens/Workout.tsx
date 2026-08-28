import { useEffect, useMemo, useRef, useState } from "react";
import { Btn, Card, Stat, Stepper, fmtMin } from "../components/UI";
import { api, Day, Exercise, Finish } from "../api";
import { openLink, notify, haptic } from "../tg";

type Phase = "overview" | "exercise" | "set" | "rest" | "finish" | "feedback";
type Log = { exercise_id: string; set_number: number; weight_kg: number; reps: number };

export default function Workout({ day, dayIndex, exercises, onExit }: { day: Day; dayIndex: number; exercises: Record<string, Exercise>; onExit: () => void }) {
  const [phase, setPhase] = useState<Phase>("overview");
  const [ei, setEi] = useState(0); const [si, setSi] = useState(1);
  const [w, setW] = useState(0); const [reps, setReps] = useState(10);
  const [logs, setLogs] = useState<Log[]>([]);
  const [sid, setSid] = useState<number | null>(null);
  const [rest, setRest] = useState(0); const [restTotal, setRestTotal] = useState(0);
  const [fin, setFin] = useState<Finish | null>(null);
  const [rpe, setRpe] = useState(5); const [hard, setHard] = useState(""); const [easy, setEasy] = useState(""); const [fbMsg, setFbMsg] = useState("");
  const [how, setHow] = useState(false); const [err, setErr] = useState("");
  const [musicOn, setMusicOn] = useState(false);
  const audioRef = useRef<{ ctx: AudioContext; nodes: (OscillatorNode | GainNode)[] } | null>(null);
  const start = useRef(Date.now());

  const startMusic = () => {
    if (audioRef.current) return;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const master = ctx.createGain(); master.gain.value = 0.06; master.connect(ctx.destination);
    const notes = [174.61, 220, 261.63]; // спокойный эмбиент-аккорд, без внешних треков
    const nodes: (OscillatorNode | GainNode)[] = [master];
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator(); osc.type = "sine"; osc.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = 0;
      osc.connect(g); g.connect(master); osc.start();
      g.gain.linearRampToValueAtTime(1 / notes.length, ctx.currentTime + 1.5 + i * 0.3);
      nodes.push(osc, g);
    });
    audioRef.current = { ctx, nodes };
  };
  const stopMusic = () => { audioRef.current?.ctx.close(); audioRef.current = null; };
  const toggleMusic = () => { musicOn ? stopMusic() : startMusic(); setMusicOn(!musicOn); };
  useEffect(() => () => stopMusic(), []);
  useEffect(() => { if (phase !== "rest" && musicOn) { stopMusic(); setMusicOn(false); } }, [phase]);
  const cur = day.exercises[ei]; const ex = exercises[cur?.exercise_id];
  const parseReps = (r: string) => parseInt(r) || 10;

  useEffect(() => { if (cur) { setW(cur.weight_kg); setReps(parseReps(cur.reps)); } }, [ei]);
  useEffect(() => {
    if (phase !== "rest") return;
    if (rest <= 0) { notify("success"); return; }
    const t = setTimeout(() => setRest(rest - 1), 1000); return () => clearTimeout(t);
  }, [phase, rest]);

  const begin = async () => { try { const r = await api.sessionStart(dayIndex); setSid(r.session_id); start.current = Date.now(); setPhase("exercise"); } catch (e: any) { setErr(e.message); } };
  const doneSet = () => {
    haptic("medium");
    setLogs([...logs, { exercise_id: cur.exercise_id, set_number: si, weight_kg: w, reps }]);
    if (si < cur.sets) { setRest(cur.rest_sec); setRestTotal(cur.rest_sec); setPhase(cur.rest_sec ? "rest" : "set"); if (!cur.rest_sec) setSi(si + 1); }
    else nextExercise();
  };
  const nextExercise = () => { if (ei + 1 < day.exercises.length) { setEi(ei + 1); setSi(1); setPhase("exercise"); } else finishAll(); };
  const goBack = () => {
    if (phase === "rest") { setPhase("set"); return; }
    if (si > 1) { setSi(si - 1); setPhase("exercise"); return; }
    if (ei > 0) { setEi(ei - 1); setSi(day.exercises[ei - 1].sets); setPhase("exercise"); return; }
    setPhase("overview");
  };
  const canGoBack = phase === "rest" || si > 1 || ei > 0 || phase === "exercise";
  const finishAll = async (partial?: Log[]) => {
    const all = partial ?? logs;
    try { const r = await api.sessionFinish(sid!, { duration_sec: Math.round((Date.now() - start.current) / 1000), sets: all }); setFin(r); setPhase("finish"); notify("success"); }
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
        {how && ex && <Card><div className="eyebrow">Техника</div><p style={{ fontSize: 15 }}>{ex.technique}</p><div className="eyebrow">Типичные ошибки</div><p style={{ fontSize: 15, color: "var(--muted)" }}>{ex.mistakes}</p></Card>}
        <div className="stack">
          <Btn kind="accent" onClick={() => setPhase("set")}>Начать подход {si}</Btn>
          <Btn kind="ghost" onClick={() => setHow(!how)}>{how ? "Скрыть" : "Как выполнять"}</Btn>
          <Video />
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

  if (phase === "rest") { const pct = restTotal ? rest / restTotal : 0; const R = 104, C = 2 * Math.PI * R; return (
    <div className="screen no-nav fade" style={{ textAlign: "center" }}>
      <div className="row between">
        <button className="btn ghost sm" style={{ width: "auto" }} onClick={goBack}>← Назад</button>
        <button className="btn ghost sm" style={{ width: "auto" }} onClick={toggleMusic}>{musicOn ? "♪ Музыка вкл" : "♪ Музыка"}</button>
      </div>
      <div className="eyebrow" style={{ marginTop: 24 }}>Отдых</div>
      <div className="timer-ring"><svg viewBox="0 0 240 240" width="100%"><circle cx="120" cy="120" r={R} fill="none" stroke="var(--line)" strokeWidth="10" /><circle cx="120" cy="120" r={R} fill="none" stroke="var(--accent)" strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} style={{ transition: "stroke-dashoffset 1s linear" }} /></svg>
        <div className="n"><div className="big" style={{ fontSize: 72 }}>{rest}</div><div style={{ color: "var(--muted)" }}>секунд</div></div></div>
      {rest > 0 ? (<div className="grid2"><Btn kind="ghost" onClick={() => { setRest(rest + 15); setRestTotal(restTotal + 15); }}>+15 секунд</Btn><Btn kind="ghost" onClick={() => setRest(0)}>Пропустить</Btn></div>)
        : (<><h1 className="display" style={{ fontSize: 30 }}>ГОТОВЫ?</h1><p className="sub">Следующий: подход {si + 1} из {cur.sets} · {ex?.name}</p>
          <div className="stack"><Btn kind="accent" onClick={() => { setSi(si + 1); setPhase("set"); }}>Начать следующий подход</Btn><Btn kind="ghost" onClick={() => { setRest(restTotal); }}>Отдохнуть ещё раз</Btn></div></>)}
    </div>
  ); }

  if (phase === "finish" && fin) return (
    <div className="screen no-nav fade">
      <div className="eyebrow" style={{ marginTop: 20 }}>Готово</div>
      <h1 className="display" style={{ fontSize: 34 }}>ТРЕНИРОВКА ЗАВЕРШЕНА 🔥</h1>
      <div className="grid2" style={{ margin: "20px 0" }}>
        <Stat v={fmtMin(fin.duration_sec)} l="продолжительность" /><Stat v={fin.exercises} l="упражнений" />
        <Stat v={fin.sets_done} l={`подходов из ${fin.sets_total}`} /><Stat v={`${fin.percent}%`} l="выполнено" />
      </div>
      <Card accent><div className="eyebrow">Серия</div><div className="big">🔥 {fin.streak}</div></Card>
      <Btn kind="accent" onClick={() => setPhase("feedback")}>Дальше</Btn>
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
  return null;
}
