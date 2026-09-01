import { Btn } from "../components/UI";

// Первый экран после splash. Не анкета и не splash — крупный editorial-заход,
// задаёт тон и ведёт в онбординг одним понятным действием.
export default function Welcome({ onNext }: { onNext: () => void }) {
  return (
    <div
      className="screen no-nav rise"
      style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "100vh" }}
    >
      <div className="eyebrow" style={{ marginTop: 8 }}>AI FITNESS</div>

      <div>
        <h1 className="display" style={{ fontSize: 40, lineHeight: 1.04, margin: 0 }}>
          Твой фитнес<br />
          <span style={{ color: "var(--accent)" }}>Твой ритм</span><br />
          Твои результаты
        </h1>
        <p className="sub" style={{ fontSize: 16, marginTop: 18, marginBottom: 0, maxWidth: 320 }}>
          Личный помощник для тела, энергии и восстановления. Тренировки, музыка и практики — в одном спокойном пространстве.
        </p>
      </div>

      <div>
        <div className="stack" style={{ marginBottom: 18 }}>
          {[
            ["Персональный план", "под твою цель и время"],
            ["Тренируйся с друзьями", "вместе легче держать ритм"],
            ["Музыка и восстановление", "медитации, дыхание, растяжка"],
          ].map(([t, s]) => (
            <div key={t} className="row" style={{ gap: 12 }}>
              <span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--accent)", flex: "none" }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{t}</div>
                <div style={{ color: "var(--muted)", fontSize: 13 }}>{s}</div>
              </div>
            </div>
          ))}
        </div>
        <Btn kind="accent" onClick={onNext}>Начать</Btn>
      </div>
    </div>
  );
}
