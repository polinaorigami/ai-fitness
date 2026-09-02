import { useEffect, useRef, useState } from "react";
import { Btn, Card, Hero } from "../components/UI";
import mindHero from "../assets/hero/mind.webp";

interface MindSession {
  id: string;
  title: string;
  duration: number;
  emoji: string;
  type: "breathing" | "meditation" | "stretching";
  description?: string;
  custom?: boolean;
  blob?: Blob;
  src?: string;
}

interface MindStats {
  todayMinutes: number;
  totalHours: number;
  streak: number;
  lastSession: number | null;
}

// Встроенные практики
const BUILTIN_SESSIONS: MindSession[] = [
  {
    id: "breathing-478",
    title: "Дыхание 4-7-8",
    duration: 5,
    emoji: "🌬️",
    type: "breathing",
    description: "Успокаивающее дыхание: вдох на 4, задержка на 7, выдох на 8",
  },
  {
    id: "breathing-box",
    title: "Боксёрское дыхание",
    duration: 3,
    emoji: "🌬️",
    type: "breathing",
    description: "Энергизирующее дыхание: вдох-выдох на 4 счёта",
  },
  {
    id: "meditation-evening",
    title: "Вечерняя медитация",
    duration: 10,
    emoji: "🧘",
    type: "meditation",
    description: "Расслабляющая медитация для подготовки ко сну",
  },
  {
    id: "meditation-morning",
    title: "Утренняя медитация",
    duration: 15,
    emoji: "🧘",
    type: "meditation",
    description: "Мотивирующая медитация на начало дня",
  },
  {
    id: "stretching-back",
    title: "Растяжка спины",
    duration: 8,
    emoji: "🧘‍♀️",
    type: "stretching",
    description: "Мягкая растяжка для облегчения напряжения в спине",
  },
];

// IndexedDB
const DB_NAME = "aifitness_mind";
const STORE_NAME = "practices";

class MindDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        this.db = req.result;
        resolve();
      };
      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
    });
  }

  async addPractice(practice: MindSession & { blob: Blob }): Promise<void> {
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORE_NAME], "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(practice);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve();
    });
  }

  async getPractices(): Promise<Array<MindSession & { blob?: Blob }>> {
    if (!this.db) return [];
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORE_NAME], "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);
    });
  }

  async deletePractice(id: string): Promise<void> {
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORE_NAME], "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve();
    });
  }
}

const mindDB = new MindDB();
const STATS_KEY = "aifitness_mind_stats";
const LAST_SESSION_KEY = "aifitness_mind_last";

const loadStats = (): MindStats => {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { todayMinutes: 0, totalHours: 0, streak: 0, lastSession: null };
    return JSON.parse(raw);
  } catch {
    return { todayMinutes: 0, totalHours: 0, streak: 0, lastSession: null };
  }
};

const saveStats = (stats: MindStats) => {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {}
};

export default function Mind() {
  const [sessions, setSessions] = useState<MindSession[]>(BUILTIN_SESSIONS);
  const [activeSession, setActiveSession] = useState<MindSession | null>(null);
  const [sessionTime, setSessionTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [stats, setStats] = useState<MindStats>(loadStats());
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Инициализация IndexedDB и загрузка практик
  useEffect(() => {
    (async () => {
      try {
        await mindDB.init();
        const customPractices = await mindDB.getPractices();
        const practicesToAdd: MindSession[] = customPractices.map(p => ({
          ...p,
          custom: true,
          src: p.blob ? URL.createObjectURL(p.blob) : undefined,
        }));
        setSessions([...BUILTIN_SESSIONS, ...practicesToAdd]);
      } catch (e) {
        console.error("Failed to load custom practices:", e);
      }
    })();
  }, []);

  // Таймер сессии
  useEffect(() => {
    if (!isPlaying || !activeSession) return;
    if (sessionTime >= activeSession.duration * 60) {
      setIsPlaying(false);
      alert("Сеанс завершён! 🎉");
      completeSession();
      return;
    }
    timerRef.current = setTimeout(() => setSessionTime(st => st + 1), 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, sessionTime, activeSession]);

  const completeSession = () => {
    if (!activeSession) return;
    const newStats: MindStats = {
      ...stats,
      todayMinutes: stats.todayMinutes + activeSession.duration,
      totalHours: Math.round((stats.totalHours * 60 + activeSession.duration) / 60 * 10) / 10,
      streak: stats.lastSession && (Date.now() - (stats.lastSession || 0)) < 86400000 ? stats.streak + 1 : 1,
      lastSession: Date.now(),
    };
    setStats(newStats);
    saveStats(newStats);
  };

  const startSession = (session: MindSession) => {
    setActiveSession(session);
    setSessionTime(0);
    setIsPlaying(true);
    if (session.src && audioRef.current) {
      audioRef.current.src = session.src;
      audioRef.current.play().catch(() => {});
    }
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play().catch(() => {});
    }
  };

  const endSession = () => {
    setActiveSession(null);
    setSessionTime(0);
    setIsPlaying(false);
    audioRef.current?.pause();
    completeSession();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const title = file.name.replace(/\.[^.]+$/, "");
        const audio = new Audio();
        audio.onloadedmetadata = async () => {
          const duration = Math.ceil(audio.duration / 60);
          const practice: MindSession & { blob: Blob } = {
            id: `custom-${Date.now()}-${Math.random()}`,
            title,
            duration,
            emoji: "🎵",
            type: "meditation",
            custom: true,
            src: URL.createObjectURL(file),
            blob: file,
          };
          await mindDB.addPractice(practice);
          setSessions(prev => [...prev, practice]);
        };
        audio.src = URL.createObjectURL(file);
      }
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Ошибка при загрузке практики");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const deleteCustomPractice = async (id: string) => {
    if (!confirm("Удалить практику?")) return;
    try {
      await mindDB.deletePractice(id);
      setSessions(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Ошибка при удалении");
    }
  };

  // Активная сессия
  if (activeSession) {
    const pct = (sessionTime / (activeSession.duration * 60)) * 100;
    const mins = Math.floor(sessionTime / 60);
    const secs = sessionTime % 60;

    return (
      <div className="screen no-nav fade" style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
        <audio ref={audioRef} crossOrigin="anonymous" />
        <div style={{ textAlign: "center", width: "100%" }}>
          <div style={{ fontSize: 80, marginBottom: 16, animation: "pulse 2s ease-in-out infinite" }}>
            {activeSession.emoji}
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 8px", fontFamily: "var(--display)" }}>
            {activeSession.title}
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 24px" }}>
            {activeSession.description || activeSession.type}
          </p>

          {/* Прогресс-бар */}
          <div style={{ background: "var(--line)", borderRadius: 99, height: 4, marginBottom: 24, overflow: "hidden" }}>
            <div
              style={{
                background: "var(--accent)",
                height: "100%",
                width: `${pct}%`,
                transition: "width 1s linear",
              }}
            />
          </div>

          {/* Время */}
          <div className="big" style={{ fontSize: 64, margin: "0 0 8px", fontFamily: "var(--display)" }}>
            {mins}:{secs.toString().padStart(2, "0")}
          </div>
          <div style={{ color: "var(--muted)", marginBottom: 32, fontSize: 14 }}>
            из {activeSession.duration} минут
          </div>

          {/* Кнопки управления */}
          <div className="row" style={{ gap: 10, marginBottom: 20 }}>
            <Btn kind="ghost" onClick={togglePlayPause} style={{ flex: 1 }}>
              {isPlaying ? "⏸ Пауза" : "▶ Продолжить"}
            </Btn>
            <Btn kind="danger" onClick={endSession} style={{ flex: 1 }}>
              ✕ Завершить
            </Btn>
          </div>

          {/* Подсказка дыхания (для breathing) */}
          {activeSession.type === "breathing" && (
            <Card className="glass" style={{ marginTop: 20, fontSize: 14, textAlign: "center", color: "var(--muted)" }}>
              {activeSession.id === "breathing-478" && "Вдох (4) → Задержка (7) → Выдох (8)"}
              {activeSession.id === "breathing-box" && "Вдох (4) → Выдох (4) → Вдох (4) → Выдох (4)"}
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Главный экран Mind
  return (
    <div className="screen fade">
      <Hero img={mindHero}>
        <div className="eyebrow">MIND</div>
        <h1 className="display" style={{ fontSize: 26, margin: "6px 0 16px" }}>Отдохни 🧘</h1>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ fontSize: 28 }}>✨</div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Совет дня</div>
            <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.4 }}>
              Регулярная медитация снижает тревожность на 35% и улучшает качество сна
            </div>
          </div>
        </div>
      </Hero>

      {/* Вкладки */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        <button
          style={{
            flex: 1,
            padding: "9px 0",
            fontSize: 12,
            fontWeight: 600,
            border: 0,
            borderRadius: 11,
            background: "var(--card)",
            color: "var(--ink)",
            cursor: "pointer",
          }}
        >
          Все практики
        </button>
      </div>

      {/* Список практик */}
      <div className="eyebrow" style={{ margin: "12px 0 10px" }}>Встроенные практики</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {BUILTIN_SESSIONS.map(session => (
          <Card
            key={session.id}
            className="toggle glass"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: 12,
              cursor: "pointer",
            }}
            onClick={() => startSession(session)}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "center", flex: 1 }}>
              <div style={{ fontSize: 24 }}>{session.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>{session.title}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{session.duration} мин • {session.type}</div>
              </div>
            </div>
            <div style={{ fontSize: 16, color: "var(--muted)" }}>→</div>
          </Card>
        ))}
      </div>

      {/* Пользовательские практики */}
      {sessions.some(s => s.custom) && (
        <>
          <div className="eyebrow" style={{ margin: "12px 0 10px" }}>Ваши практики</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {sessions
              .filter(s => s.custom)
              .map(session => (
                <Card
                  key={session.id}
                  className="glass"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      flex: 1,
                      cursor: "pointer",
                    }}
                    onClick={() => startSession(session)}
                  >
                    <div style={{ fontSize: 24 }}>{session.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>{session.title}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{session.duration} мин</div>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteCustomPractice(session.id)}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "var(--muted)",
                      cursor: "pointer",
                      fontSize: 14,
                      padding: "4px 8px",
                    }}
                  >
                    ✕
                  </button>
                </Card>
              ))}
          </div>
        </>
      )}

      {/* Загрузка */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="audio/*"
        onChange={handleUpload}
        style={{ display: "none" }}
      />
      <Btn
        kind="ghost"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        style={{ width: "100%", marginBottom: 16, opacity: uploading ? 0.6 : 1 }}
      >
        {uploading ? "Загрузка..." : "+ Добавить свою практику"}
      </Btn>

      {/* Статистика */}
      <div className="eyebrow" style={{ margin: "12px 0 10px" }}>Твой прогресс</div>
      <Card className="glass">
        <div className="toggle">
          <span>Сегодня практиковал(а)</span>
          <span style={{ fontWeight: 600 }}>{stats.todayMinutes} мин</span>
        </div>
        <div className="toggle">
          <span>Всего часов</span>
          <span style={{ fontWeight: 600 }}>{stats.totalHours} ч</span>
        </div>
        <div className="toggle">
          <span>Серия дней</span>
          <span style={{ fontWeight: 600 }}>
            {stats.streak > 0 ? `${stats.streak} дн 🔥` : "Начни с сегодня"}
          </span>
        </div>
      </Card>
    </div>
  );
}
