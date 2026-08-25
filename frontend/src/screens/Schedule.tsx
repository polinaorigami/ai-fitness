import { Btn, Card } from "../components/UI";
import { ProgramT } from "../api";
export default function Schedule({ program, todayIndex, onStart, onBack }: { program: ProgramT; todayIndex: number; onStart: (i: number) => void; onBack: () => void }) {
  return (
    <div className="screen fade">
      <button className="btn ghost sm" onClick={onBack}>Назад</button>
      <h1 className="display">МОЁ РАСПИСАНИЕ</h1>
      <p className="sub">{program.strategy.days} тренировки в неделю · {program.strategy.goal_label.toLowerCase()}</p>
      {program.week.map((d, i) => (
        <Card key={i} className={i === todayIndex ? "" : ""}>
          <div className="row between">
            <div><div className="eyebrow" style={{ color: i === todayIndex ? "var(--accent)" : undefined }}>{d.weekday}{i === todayIndex && " · сегодня"}</div>
              <div className="mid" style={{ marginTop: 6, color: d.rest ? "var(--muted)" : "var(--ink)" }}>{d.title}</div>
              {!d.rest && <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>{d.exercises.length} упражнений</div>}</div>
            {!d.rest && <Btn kind="soft" className="sm" onClick={() => onStart(i)}>Открыть</Btn>}
          </div>
        </Card>
      ))}
    </div>
  );
}
