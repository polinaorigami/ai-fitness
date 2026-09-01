import { Btn, Card, Stat, greet } from "../components/UI";
import { Today, User, ProgramT } from "../api";

export default function Home({ user, today, program, onStart, onShort, go }: { user: User; today: Today; program: ProgramT; onStart: (dayIndex: number) => void; onShort: () => void; go: (t: string) => void }) {
  const d = today.day;
  return (
    <div className="screen fade">
      <div className="row between">
        <div><div className="eyebrow">AI FITNESS</div><h1 className="display" style={{ fontSize: 26 }}>{greet()}, {user.first_name} 👋</h1></div>
        {user.photo_url && <img src={user.photo_url} style={{ width: 44, height: 44, borderRadius: 14 }} />}
      </div>
      <div className="grid3" style={{ marginBottom: 14, gap: 10 }}>
        <Card><div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Энергия</div><div style={{ fontSize: 20, fontWeight: 600 }}>⚡ хорошо</div></Card>
        <Card><div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Сон</div><div style={{ fontSize: 20, fontWeight: 600 }}>😴 6.5ч</div></Card>
        <Card><div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Восстановление</div><div style={{ fontSize: 20, fontWeight: 600 }}>💪 90%</div></Card>
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
          <Btn kind="ghost" onClick={onShort}>Короткая версия · 20 минут</Btn>
        </Card>
      )}
      <div className="eyebrow" style={{ margin: "18px 0 10px" }}>Быстрые действия</div>
      <div className="grid2" style={{ marginBottom: 20, gap: 10 }}>
        <button style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "16px 12px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, cursor: "pointer" }}>
          <div style={{ fontSize: 28 }}>🧘</div>
          <div style={{ fontSize: 12, fontWeight: 500 }}>Растяжка</div>
        </button>
        <button style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "16px 12px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, cursor: "pointer" }}>
          <div style={{ fontSize: 28 }}>🧘‍♀️</div>
          <div style={{ fontSize: 12, fontWeight: 500 }}>Медитация</div>
        </button>
        <button style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "16px 12px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, cursor: "pointer" }}>
          <div style={{ fontSize: 28 }}>🌬️</div>
          <div style={{ fontSize: 12, fontWeight: 500 }}>Дыхание</div>
        </button>
        <button style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "16px 12px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, cursor: "pointer" }}>
          <div style={{ fontSize: 28 }}>🎵</div>
          <div style={{ fontSize: 12, fontWeight: 500 }}>Музыка</div>
        </button>
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
    </div>
  );
}
