import { useEffect, useState } from "react";
import { api, User, ProgramT, Today, Exercise, Day } from "./api";
import { initTelegram, tzOffset } from "./tg";
import { initTheme } from "./theme";
import { Nav, Loading, Btn, Err } from "./components/UI";
import { NAV_ITEMS, NavId, getNavOrder } from "./navPrefs";
import MusicWidget from "./musicWidget";
import Tour, { tourSeen } from "./tour";
import Welcome from "./screens/Welcome"; import Onboarding from "./screens/Onboarding"; import Photos from "./screens/Photos"; import Analysis from "./screens/Analysis";
import WhatsNew from "./screens/WhatsNew";
import Home from "./screens/Home"; import Schedule from "./screens/Schedule"; import Workout, { hasActiveSession, clearSession } from "./screens/Workout"; import Progress from "./screens/Progress"; import Profile from "./screens/Profile"; import Coach from "./screens/Coach"; import Friends from "./screens/Friends"; import Mind from "./screens/Mind"; import Achievements from "./screens/Achievements";

type Screen = "loading" | "welcome" | "onboarding" | "photos" | "analysis" | "whatsnew" | "home" | "schedule" | "workout" | "progress" | "friends" | "mind" | "achievements" | "profile" | "coach";

const WHATSNEW_KEY = "aifitness_whatsnew_seen";
const WHATSNEW_HOURS = 4; // Show WhatsNew if app hasn't been opened for 4+ hours

function shouldShowWhatsNew(): boolean {
  try {
    const lastSeen = localStorage.getItem(WHATSNEW_KEY);
    if (!lastSeen) return true; // First time
    const lastTime = parseInt(lastSeen, 10);
    const now = Date.now();
    const hoursSinceLastSeen = (now - lastTime) / (1000 * 60 * 60);
    return hoursSinceLastSeen >= WHATSNEW_HOURS;
  } catch {
    return true;
  }
}

function markWhatsNewSeen() {
  try {
    localStorage.setItem(WHATSNEW_KEY, Date.now().toString());
  } catch {}
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [program, setProgram] = useState<ProgramT | null>(null);
  const [today, setToday] = useState<Today | null>(null);
  const [exercises, setExercises] = useState<Record<string, Exercise>>({});
  const [wk, setWk] = useState<{ day: Day; index: number } | null>(null);
  const [err, setErr] = useState("");
  const [navOrder, setNavOrderState] = useState<NavId[]>(getNavOrder());
  const [showTour, setShowTour] = useState(false);

  const refresh = async () => { const [p, t] = await Promise.all([api.program(), api.today()]); setProgram(p); setToday(t); };
  useEffect(() => { initTelegram(); initTheme(); (async () => {
    try {
      const [u, ex] = await Promise.all([api.me(), api.exercises()]);
      setUser(u); setExercises(Object.fromEntries(ex.map(e => [e.id, e])));
      if (u.timezone_offset !== tzOffset()) api.settings({ timezone_offset: tzOffset() }).catch(() => {});
      if (!u.onboarded) { setScreen("welcome"); return; }
      try {
        const [p, t] = await Promise.all([api.program(), api.today()]);
        setProgram(p); setToday(t);
        const activeDay = hasActiveSession();
        if (activeDay !== null && p.week[activeDay] && !p.week[activeDay].rest) {
          setWk({ day: p.week[activeDay], index: activeDay }); setScreen("workout");
        } else {
          if (shouldShowWhatsNew()) {
            setScreen("whatsnew");
          } else {
            setScreen("home");
          }
        }
      } catch { setScreen("analysis"); }
    } catch (e: any) { setErr(e.message); }
  })(); }, []);

  const startWorkout = (index: number) => { if (!program) return; setWk({ day: program.week[index], index }); setScreen("workout"); };
  const startShort = async () => { try { const r = await api.short(); setWk({ day: r.day, index: r.day_index }); setScreen("workout"); } catch (e: any) { alert(e.message || "Не удалось собрать короткую версию"); } };
  const go = (t: string) => {
    if (t === "workout") { if (today && !today.day.rest) startWorkout(today.day_index); else setScreen("schedule"); }
    else setScreen(t as Screen);
  };
  const tab = screen === "schedule" && !navOrder.includes("schedule") ? "workout" : screen;
  const navItems = navOrder.map(id => NAV_ITEMS.find(n => n.id === id)!).filter(Boolean);
  useEffect(() => {
    if (["home", "schedule", "progress", "profile"].includes(screen) && !tourSeen()) setShowTour(true);
  }, [screen]);

  if (err) return <div className="screen no-nav"><h1 className="display">Не удалось подключиться</h1><Err e={err} /><div style={{ height: 12 }} /><Btn onClick={() => location.reload()}>Повторить</Btn></div>;
  if (screen === "loading" || !user) return <Loading />;
  if (screen === "welcome") return <Welcome onNext={() => setScreen("onboarding")} />;
  if (screen === "onboarding") return <><MusicWidget /><Onboarding onDone={async () => { setUser(await api.me()); setScreen("photos"); }} /></>;
  if (screen === "photos") return <><MusicWidget /><Photos onDone={() => setScreen("analysis")} /></>;
  if (screen === "analysis") return <><MusicWidget /><Analysis onDone={async () => { await refresh(); setScreen("whatsnew"); }} /></>;
  if (screen === "whatsnew") return <WhatsNew onNext={() => { markWhatsNewSeen(); setScreen("home"); }} />;
  if (screen === "workout" && wk) return <><MusicWidget /><Workout day={wk.day} dayIndex={wk.index} exercises={exercises} onExit={async () => { await refresh(); setScreen("home"); }} /></>;
  if (screen === "coach") return <><MusicWidget /><Coach onBack={() => setScreen("home")} onProgramChanged={refresh} /></>;
  if (!program || !today) return <Loading />;
  return (<>
    <MusicWidget />
    {screen === "home" && <Home user={user} today={today} program={program} onStart={startWorkout} onShort={startShort} go={go} />}
    {screen === "schedule" && <Schedule program={program} todayIndex={today.day_index} onStart={startWorkout} onBack={() => setScreen("home")} />}
    {screen === "progress" && <Progress />}
    {screen === "friends" && <Friends user={user} />}
    {screen === "mind" && <Mind />}
    {screen === "achievements" && <Achievements />}
    {screen === "profile" && <Profile user={user} setUser={setUser} onRedo={() => { clearSession(); setScreen("onboarding"); }} onLogout={() => location.reload()} navOrder={navOrder} onNavChange={setNavOrderState} go={go} />}
    <Nav tab={tab} go={go} items={navItems} />
    {showTour && <Tour onClose={() => setShowTour(false)} />}
  </>);
}
