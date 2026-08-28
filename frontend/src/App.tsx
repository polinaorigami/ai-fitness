import { useEffect, useState } from "react";
import { api, User, ProgramT, Today, Exercise, Day } from "./api";
import { initTelegram, tzOffset } from "./tg";
import { initTheme } from "./theme";
import { Nav, Loading, Btn, Err } from "./components/UI";
import Welcome from "./screens/Welcome"; import Onboarding from "./screens/Onboarding"; import Photos from "./screens/Photos"; import Analysis from "./screens/Analysis";
import Home from "./screens/Home"; import Schedule from "./screens/Schedule"; import Workout from "./screens/Workout"; import Progress from "./screens/Progress"; import Profile from "./screens/Profile"; import Coach from "./screens/Coach";

type Screen = "loading" | "welcome" | "onboarding" | "photos" | "analysis" | "home" | "schedule" | "workout" | "progress" | "profile" | "coach";

export default function App() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [program, setProgram] = useState<ProgramT | null>(null);
  const [today, setToday] = useState<Today | null>(null);
  const [exercises, setExercises] = useState<Record<string, Exercise>>({});
  const [wk, setWk] = useState<{ day: Day; index: number } | null>(null);
  const [err, setErr] = useState("");

  const refresh = async () => { const [p, t] = await Promise.all([api.program(), api.today()]); setProgram(p); setToday(t); };
  useEffect(() => { initTelegram(); initTheme(); (async () => {
    try {
      const [u, ex] = await Promise.all([api.me(), api.exercises()]);
      setUser(u); setExercises(Object.fromEntries(ex.map(e => [e.id, e])));
      if (u.timezone_offset !== tzOffset()) api.settings({ timezone_offset: tzOffset() }).catch(() => {});
      if (!u.onboarded) { setScreen("welcome"); return; }
      try { await refresh(); setScreen("home"); } catch { setScreen("analysis"); }
    } catch (e: any) { setErr(e.message); }
  })(); }, []);

  const startWorkout = (index: number) => { if (!program) return; setWk({ day: program.week[index], index }); setScreen("workout"); };
  const startShort = async () => { const r = await api.short(); setWk({ day: r.day, index: r.day_index }); setScreen("workout"); };
  const go = (t: string) => { if (t === "workout") { if (today && !today.day.rest) startWorkout(today.day_index); else setScreen("schedule"); } else setScreen(t as Screen); };
  const tab = screen === "schedule" ? "workout" : screen;

  if (err) return <div className="screen no-nav"><h1 className="display">Не удалось подключиться</h1><Err e={err} /><div style={{ height: 12 }} /><Btn onClick={() => location.reload()}>Повторить</Btn></div>;
  if (screen === "loading" || !user) return <Loading />;
  if (screen === "welcome") return <Welcome onNext={() => setScreen("onboarding")} />;
  if (screen === "onboarding") return <Onboarding onDone={async () => { setUser(await api.me()); setScreen("photos"); }} />;
  if (screen === "photos") return <Photos onDone={() => setScreen("analysis")} />;
  if (screen === "analysis") return <Analysis onDone={async () => { await refresh(); setScreen("home"); }} />;
  if (screen === "workout" && wk) return <Workout day={wk.day} dayIndex={wk.index} exercises={exercises} onExit={async () => { await refresh(); setScreen("home"); }} />;
  if (screen === "coach") return <Coach onBack={() => setScreen("home")} onProgramChanged={refresh} />;
  if (!program || !today) return <Loading />;
  return (<>
    {screen === "home" && <Home user={user} today={today} program={program} onStart={startWorkout} go={go} />}
    {screen === "home" && !today.day.rest && !today.done_today && <div style={{ maxWidth: 480, margin: "-90px auto 0", padding: "0 18px 100px" }}><Btn kind="ghost" onClick={startShort}>Короткая версия · 20 минут</Btn></div>}
    {screen === "schedule" && <Schedule program={program} todayIndex={today.day_index} onStart={startWorkout} onBack={() => setScreen("home")} />}
    {screen === "progress" && <Progress />}
    {screen === "profile" && <Profile user={user} setUser={setUser} onRedo={() => setScreen("onboarding")} onLogout={() => location.reload()} />}
    <Nav tab={tab} go={go} />
  </>);
}
