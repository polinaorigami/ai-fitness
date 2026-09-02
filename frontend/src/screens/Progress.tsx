import { useEffect, useRef, useState } from "react";
import { Btn, Card, Stat, Loading, Err, CardSkeleton, StatSkeleton } from "../components/UI";
import { api, Progress as P, PhotoT } from "../api";

export default function Progress() {
  const [p, setP] = useState<P | null>(null); const [photos, setPhotos] = useState<PhotoT[]>([]); const [urls, setUrls] = useState<Record<number, string>>({});
  const [tab, setTab] = useState<"stats" | "measure" | "photos">("stats");
  const [m, setM] = useState<Record<string, string>>({}); const [err, setErr] = useState(""); const [saved, setSaved] = useState(false);
  const [cmp, setCmp] = useState<number[]>([]); const ref = useRef<HTMLInputElement>(null);
  const load = async () => { try { const [a, b] = await Promise.all([api.progress(), api.photos()]); setP(a); setPhotos(b); const u: Record<number, string> = {}; for (const ph of b) u[ph.id] = await api.photoBlob(ph.id); setUrls(u); } catch (e: any) { setErr(e.message); } };
  useEffect(() => { load(); }, []);
  if (err) return <div className="screen"><Err e={err} /></div>;
  if (!p) return <Loading />;
  const saveM = async () => { const body: any = {}; for (const k of ["weight", "waist", "hips", "chest", "arm", "thigh"]) if (m[k]) body[k] = +m[k]; if (!Object.keys(body).length) return; await api.measurement(body); setM({}); setSaved(true); load(); };
  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) { await api.uploadPhoto(f, "progress"); load(); } };
  const lastM = p.measurements[p.measurements.length - 1]; const firstM = p.measurements[0];
  const F = [["weight", "Вес, кг"], ["waist", "Талия, см"], ["hips", "Бёдра, см"], ["chest", "Грудь, см"], ["arm", "Рука, см"], ["thigh", "Бедро, см"]];
  return (
    <div className="screen fade">
      <h1 className="display">МОЙ ПРОГРЕСС</h1>
      <div className="chips" style={{ marginBottom: 18 }}>{[["stats", "Статистика"], ["measure", "Замеры"], ["photos", "Мои фото"]].map(([k, l]) => <button key={k} className={`chip ${tab === k ? "on" : ""}`} onClick={() => setTab(k as any)}>{l}</button>)}</div>
      {tab === "stats" && <>
        <div className="grid2" style={{ marginBottom: 14 }}>
          <Stat v={<>🔥 {p.streak}</>} l="серия тренировок" /><Stat v={<>🏋️ {p.workouts}</>} l="тренировок" />
          <Stat v={<>⏱ {p.total_minutes}</>} l="минут всего" /><Stat v={<>📅 {p.weekly.length ? Math.round(p.weekly.reduce((a, w) => a + w.count, 0) / p.weekly.length * 10) / 10 : 0}</>} l="в неделю в среднем" />
        </div>
        {p.weekly.length > 0 && <Card className="glass"><div className="eyebrow" style={{ marginBottom: 12 }}>📅 Регулярность по неделям</div><div className="row" style={{ alignItems: "flex-end", height: 80, gap: 6 }}>{p.weekly.map(w => <div key={w.week} style={{ flex: 1, textAlign: "center" }}><div style={{ height: 12 + w.count * 14, background: "var(--accent)", borderRadius: 6 }} /><div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{w.count}</div></div>)}</div></Card>}
        <Card className="glass"><div className="eyebrow" style={{ marginBottom: 6 }}>📈 Прогресс рабочих весов</div>
          {p.lifts.length ? p.lifts.map(l => <div key={l.exercise_id} className="ex-row"><div style={{ flex: 1 }}>{l.name}</div><div style={{ color: "var(--muted)" }}>{l.first} →</div><div className="mid" style={{ fontSize: 20, color: l.last > l.first ? "var(--ok)" : "var(--ink)" }}>{l.last} кг</div></div>)
            : <div style={{ color: "var(--muted)", fontSize: 14 }}>Появится после первой тренировки с отягощением.</div>}</Card>
        {p.recent.length > 0 && <Card className="glass"><div className="eyebrow" style={{ marginBottom: 6 }}>Последние тренировки</div>{p.recent.map(r => <div key={r.id} className="ex-row"><div style={{ flex: 1 }}>{r.title}<div style={{ fontSize: 12, color: "var(--muted)" }}>{r.date}</div></div><div style={{ color: "var(--muted)" }}>{r.minutes} мин{r.rpe ? ` · ${r.rpe}/10` : ""}</div></div>)}</Card>}
      </>}
      {tab === "measure" && <>
        {lastM && <Card className="glass"><div className="eyebrow" style={{ marginBottom: 8 }}>Последние замеры · {lastM.date}</div><div className="grid2">{F.map(([k, l]) => lastM[k] != null && <div key={k}><div className="mid" style={{ fontSize: 22 }}>{lastM[k]}{firstM && firstM[k] != null && firstM !== lastM && <span style={{ fontSize: 13, color: "var(--muted)", marginLeft: 6 }}>{(lastM[k] - firstM[k]) > 0 ? "+" : ""}{Math.round((lastM[k] - firstM[k]) * 10) / 10}</span>}</div><div style={{ fontSize: 12, color: "var(--muted)" }}>{l}</div></div>)}</div></Card>}
        <Card className="glass"><div className="eyebrow" style={{ marginBottom: 10 }}>Новые замеры</div><div className="grid2">{F.map(([k, l]) => <input key={k} type="number" inputMode="decimal" placeholder={l} value={m[k] || ""} onChange={e => { setSaved(false); setM({ ...m, [k]: e.target.value }); }} />)}</div><div style={{ height: 12 }} /><Btn kind="accent" onClick={saveM}>{saved ? "Сохранено ✓" : "Сохранить замеры"}</Btn></Card>
      </>}
      {tab === "photos" && <>
        <input ref={ref} type="file" accept="image/*" hidden onChange={upload} />
        {cmp.length === 2 ? <Card className="glass"><div className="row between" style={{ marginBottom: 10 }}><span className="eyebrow">Сравнение</span><button className="btn ghost sm" onClick={() => setCmp([])}>Закрыть</button></div><div className="grid2">{cmp.map(id => <div key={id}><img src={urls[id]} style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", borderRadius: 14 }} /><div style={{ fontSize: 12, textAlign: "center", marginTop: 4 }}>{photos.find(x => x.id === id)?.label}</div></div>)}</div></Card>
          : <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>{cmp.length === 1 ? "Выбери второе фото для сравнения." : "Нажми на два фото, чтобы сравнить."}</div>}
        <div className="grid2" style={{ marginBottom: 14 }}>{photos.map(ph => <div key={ph.id} onClick={() => setCmp(cmp.includes(ph.id) ? cmp.filter(x => x !== ph.id) : [...cmp.slice(-1), ph.id])} style={{ outline: cmp.includes(ph.id) ? "3px solid var(--accent)" : "none", borderRadius: 16, overflow: "hidden" }}><img src={urls[ph.id]} style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", display: "block" }} /><div style={{ fontSize: 12, padding: "6px 8px", background: "var(--card)" }}>{ph.label} · {ph.created_at.slice(0, 10)}</div></div>)}</div>
        {!photos.length && <Card className="glass"><div style={{ color: "var(--muted)", textAlign: "center" }}>Пока нет фото. Добавь первое — это будет «Неделя 1».</div></Card>}
        <Btn kind="accent" onClick={() => ref.current?.click()}>Добавить фото</Btn>
      </>}
    </div>
  );
}
