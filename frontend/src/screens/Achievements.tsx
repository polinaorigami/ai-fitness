import { useEffect, useState } from "react";
import { api, Progress } from "../api";
import { Card, Loading, Err, Stat } from "../components/UI";

interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  unlocked: boolean;
  unlockedAt?: string;
  progress?: number;
  target?: number;
}

export default function Achievements() {
  const [p, setP] = useState<Progress | null>(null);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState<"all" | "unlocked">("all");

  const mindStats = (() => {
    try {
      const stats = localStorage.getItem("aifitness_mind_stats");
      return stats ? JSON.parse(stats) : { totalHours: 0, streak: 0, sessions: 0, todayMinutes: 0 };
    } catch {
      return { totalHours: 0, streak: 0, sessions: 0, todayMinutes: 0 };
    }
  })();

  useEffect(() => {
    (async () => {
      try {
        const prog = await api.progress();
        setP(prog);
      } catch (e: any) {
        setErr(e.message);
      }
    })();
  }, []);

  if (err) return <div className="screen"><Err e={err} /></div>;
  if (!p) return <Loading />;

  const achievements: Achievement[] = [
    {
      id: "first_workout",
      title: "Первый шаг",
      description: "Заверши первую тренировку",
      emoji: "🚀",
      unlocked: p.workouts >= 1,
      unlockedAt: p.workouts >= 1 ? "День 1" : undefined,
    },
    {
      id: "7_day_streak",
      title: "Неделя огня",
      description: "Тренируйся 7 дней подряд",
      emoji: "🔥",
      unlocked: p.streak >= 7,
      progress: Math.min(p.streak, 7),
      target: 7,
    },
    {
      id: "30_day_streak",
      title: "Месячный чемпион",
      description: "30 дней подряд без пропусков",
      emoji: "🏆",
      unlocked: p.streak >= 30,
      progress: Math.min(p.streak, 30),
      target: 30,
    },
    {
      id: "50_workouts",
      title: "Полвека",
      description: "Заверши 50 тренировок",
      emoji: "💪",
      unlocked: p.workouts >= 50,
      progress: Math.min(p.workouts, 50),
      target: 50,
    },
    {
      id: "100_workouts",
      title: "Столетие",
      description: "100 завершённых тренировок",
      emoji: "🥇",
      unlocked: p.workouts >= 100,
      progress: Math.min(p.workouts, 100),
      target: 100,
    },
    {
      id: "100_hours",
      title: "Марафонец",
      description: "100 часов тренировок",
      emoji: "⏱️",
      unlocked: p.total_minutes >= 6000,
      progress: Math.min(Math.floor(p.total_minutes / 60), 100),
      target: 100,
    },
    {
      id: "first_mind",
      title: "Спокойствие",
      description: "Заверши первую Mind-практику",
      emoji: "🧘",
      unlocked: mindStats.sessions >= 1,
    },
    {
      id: "10_mind",
      title: "Внимание",
      description: "10 Mind-сессий завершено",
      emoji: "🕉️",
      unlocked: mindStats.sessions >= 10,
      progress: Math.min(mindStats.sessions, 10),
      target: 10,
    },
    {
      id: "10_mind_hours",
      title: "Медитатор",
      description: "10 часов Mind-практик",
      emoji: "🌬️",
      unlocked: mindStats.totalHours >= 10,
      progress: Math.min(Math.floor(mindStats.totalHours), 10),
      target: 10,
    },
    {
      id: "mind_streak",
      title: "Ежедневная гармония",
      description: "Практика Mind 7 дней подряд",
      emoji: "✨",
      unlocked: mindStats.streak >= 7,
      progress: Math.min(mindStats.streak, 7),
      target: 7,
    },
    {
      id: "personal_record",
      title: "Новый максимум",
      description: "Поднял вес больше чем когда-либо",
      emoji: "📈",
      unlocked: p.lifts.length > 0 && p.lifts.some(l => l.last > l.first),
    },
    {
      id: "consistency",
      title: "Железная воля",
      description: "Не пропускай тренировки в течение недели",
      emoji: "⚡",
      unlocked: p.streak >= 7,
    },
  ];

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const filtered = tab === "unlocked" ? achievements.filter(a => a.unlocked) : achievements;

  return (
    <div className="screen fade">
      <div style={{ marginBottom: 24 }}>
        <div className="eyebrow">ДОСТИЖЕНИЯ</div>
        <h1 className="display" style={{ fontSize: 26, marginBottom: 4 }}>Твои медали 🏅</h1>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>
          {unlockedCount} из {achievements.length}
        </div>
      </div>

      {/* Прогресс-бар */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ height: 8, background: "var(--surface)", borderRadius: 4, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  background: "linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 70%, transparent))",
                  width: `${(unlockedCount / achievements.length) * 100}%`,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
              {unlockedCount} достижений разблокировано
            </div>
          </div>
          <div style={{ fontSize: 32, textAlign: "center", width: 50 }}>
            {Math.round((unlockedCount / achievements.length) * 100)}%
          </div>
        </div>
      </Card>

      {/* Табы */}
      <div className="row" style={{ gap: 6, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: 4, marginBottom: 16 }}>
        {(["all", "unlocked"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              border: 0,
              borderRadius: 11,
              padding: "9px 0",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              background: tab === t ? "var(--card)" : "transparent",
              color: tab === t ? "var(--ink)" : "var(--muted)",
              boxShadow: tab === t ? "var(--shadow)" : "none",
              transition: "all .2s",
            }}
          >
            {t === "all" && `Все (${achievements.length})`}
            {t === "unlocked" && `Разблокировано (${unlockedCount})`}
          </button>
        ))}
      </div>

      {/* Достижения */}
      <div className="grid2" style={{ gap: 12 }}>
        {filtered.map((a, i) => (
          <div
            key={a.id}
            style={{
              position: "relative",
              animation: a.unlocked ? `slideInUp 0.4s ease ${i * 0.05}s both` : "none",
            }}
          >
            <Card
              style={{
                textAlign: "center",
                padding: 20,
                opacity: a.unlocked ? 1 : 0.5,
                background: a.unlocked
                  ? "linear-gradient(135deg, color-mix(in srgb, var(--accent) 10%, var(--card)), var(--card))"
                  : "var(--card)",
                border: a.unlocked ? "1px solid color-mix(in srgb, var(--accent) 30%, var(--line))" : "1px solid var(--line)",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              className={a.unlocked ? "toggle" : ""}
            >
              <div style={{ fontSize: 40, marginBottom: 8, display: "block", animation: a.unlocked ? "bounce 0.6s ease" : "none" }}>
                {a.emoji}
              </div>
              {a.unlocked && <div style={{ position: "absolute", top: 8, right: 8, fontSize: 14 }}>✓</div>}
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{a.title}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>{a.description}</div>

              {a.progress !== undefined && a.target && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>
                    {a.progress} / {a.target}
                  </div>
                  <div style={{ height: 4, background: "var(--surface)", borderRadius: 2, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        background: "var(--accent)",
                        width: `${(a.progress / a.target) * 100}%`,
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                </div>
              )}

              {a.unlockedAt && (
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8, fontStyle: "italic" }}>
                  {a.unlockedAt}
                </div>
              )}
            </Card>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <Card style={{ textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
          <div style={{ color: "var(--muted)" }}>Здесь пока нет достижений</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 8 }}>
            Тренируйся, медитируй и добивайся целей — медали придут!
          </div>
        </Card>
      )}

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
        @keyframes bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
