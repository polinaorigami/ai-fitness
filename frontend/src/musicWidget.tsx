// Глобальный плеер музыки — доступен на любом экране приложения, не останавливается при
// переходах между экранами. Кружок можно перетащить в любое место экрана — позиция запоминается.
//
// Новое в Этап 4:
// - Загрузка своих треков через файловый ввод (IndexedDB)
// - Отдельные хранилища: встроенные треки и пользовательские
// - Восстановление позиции проигрывания при возврате
// - Отображение длительности трека (когда загружен)
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, CSSProperties } from "react";
import { haptic } from "./tg";

export interface Track {
  id: string;
  title: string;
  src?: string;
  duration?: number;
  custom?: boolean;
}

// Встроенные треки
const BUILTIN_TRACKS: Track[] = [
  { id: "ambient", title: "Спокойный эмбиент" },
  { id: "oy", title: "Ой, не надо", src: "/music/oy-ne-nado.mp3" },
  { id: "stay", title: "Stay Close", src: "/music/stay-close.mp3" },
  { id: "lie", title: "Lie to Me", src: "/music/lie-to-me.mp3" },
  { id: "amore", title: "Amore Mio", src: "/music/amore-mio.mp3" },
];

// IndexedDB
const DB_NAME = "aifitness_music";
const STORE_NAME = "tracks";

class MusicDB {
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

  async addTrack(track: Track & { blob: Blob }): Promise<void> {
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORE_NAME], "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(track);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve();
    });
  }

  async getTracks(): Promise<Array<Track & { blob?: Blob }>> {
    if (!this.db) return [];
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORE_NAME], "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);
    });
  }

  async deleteTrack(id: string): Promise<void> {
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

const musicDB = new MusicDB();
const TRACK_KEY = "aifitness_music_track";
const POS_KEY = "aifitness_music_pos";
const TIME_KEY = "aifitness_music_time";
const ON_KEY = "aifitness_music_on";
const SIZE = 44;

const loadOn = () => { try { return localStorage.getItem(ON_KEY) === "1"; } catch { return false; } };
const saveOn = (v: boolean) => { try { localStorage.setItem(ON_KEY, v ? "1" : "0"); } catch {} };
const loadTrackIdx = () => { try { const v = +(localStorage.getItem(TRACK_KEY) || 0); return v; } catch { return 0; } };
const loadPos = (): { x: number; y: number } | null => { try { const raw = localStorage.getItem(POS_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; } };
const savePos = (p: { x: number; y: number }) => { try { localStorage.setItem(POS_KEY, JSON.stringify(p)); } catch {} };
const loadTime = () => { try { return +(localStorage.getItem(TIME_KEY) || 0); } catch { return 0; } };
const saveTime = (t: number) => { try { localStorage.setItem(TIME_KEY, String(t)); } catch {} };
const clamp = (p: { x: number; y: number }) => ({
  x: Math.min(Math.max(p.x, 8), window.innerWidth - SIZE - 8),
  y: Math.min(Math.max(p.y, 8), window.innerHeight - SIZE - 8),
});

const fmtTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

export default function MusicWidget() {
  const [on, setOn] = useState(loadOn());
  const [expanded, setExpanded] = useState(false);
  const [allTracks, setAllTracks] = useState<Track[]>(BUILTIN_TRACKS);
  const [trackIdx, setTrackIdx] = useState(loadTrackIdx());
  const [pos, setPos] = useState(() => clamp(loadPos() || { x: window.innerWidth - SIZE - 14, y: 14 + 40 }));
  const [dragging, setDragging] = useState(false);
  const [currentTime, setCurrentTime] = useState(loadTime());
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const synthRef = useRef<{ ctx: AudioContext; nodes: (OscillatorNode | GainNode)[] } | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const dragInfo = useRef<{ startX: number; startY: number; origX: number; origY: number; moved: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Инициализация IndexedDB и загрузка треков
  useEffect(() => {
    (async () => {
      try {
        await musicDB.init();
        const customTracks = await musicDB.getTracks();
        const tracksWithBlobs: Track[] = customTracks
          .map(t => ({ ...t, custom: true, src: t.blob ? URL.createObjectURL(t.blob) : undefined }));
        setAllTracks([...BUILTIN_TRACKS, ...tracksWithBlobs]);
      } catch (e) {
        console.error("Failed to load custom tracks:", e);
      }
    })();
  }, []);

  // Возобновление воспроизведения при повторном монтировании виджета
  // (например, при переходе между экранами) — с той же позиции и трека.
  const resumedOnce = useRef(false);
  useEffect(() => {
    if (resumedOnce.current || !on) return;
    const track = allTracks[trackIdx];
    if (!track) return;
    resumedOnce.current = true;
    if (track.id === "ambient") { startSynth(); return; }
    if (audioRef.current && track.src) {
      audioRef.current.src = track.src;
      audioRef.current.currentTime = currentTime;
      audioRef.current.play().catch(() => {});
    }
  }, [allTracks]);

  // Сохранение текущей позиции при окончании трека
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
      saveTime(audio.currentTime);
    };

    const onEnded = () => {
      // авто-переход на следующий трек (с начала)
      const idx = (trackIdx + 1) % allTracks.length;
      setTrackIdx(idx);
      try { localStorage.setItem(TRACK_KEY, String(idx)); } catch {}
      startTrack(idx);
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("ended", onEnded);
    };
  }, [trackIdx, on]);

  const startSynth = () => {
    if (synthRef.current) return;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const master = ctx.createGain();
    master.gain.value = 0.06;
    master.connect(ctx.destination);
    const notes = [174.61, 220, 261.63];
    const nodes: (OscillatorNode | GainNode)[] = [master];
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = 0;
      osc.connect(g);
      g.connect(master);
      osc.start();
      g.gain.linearRampToValueAtTime(1 / notes.length, ctx.currentTime + 1.5 + i * 0.3);
      nodes.push(osc, g);
    });
    synthRef.current = { ctx, nodes };
  };

  const stopSynth = () => {
    synthRef.current?.ctx.close();
    synthRef.current = null;
  };

  // Запустить НОВЫЙ трек с начала (переключение трека).
  const startTrack = (idx: number) => {
    stopSynth();
    audioRef.current?.pause();
    const t = allTracks[idx];
    if (!t) return;
    setCurrentTime(0);
    saveTime(0);
    if (t.id === "ambient") {
      startSynth();
      return;
    }
    if (audioRef.current && t.src) {
      audioRef.current.src = t.src;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  };

  // Продолжить ТЕКУЩИЙ трек с сохранённой позиции (после паузы).
  const resumeCurrent = () => {
    const t = allTracks[trackIdx];
    if (!t) return;
    if (t.id === "ambient") { startSynth(); return; }
    const audio = audioRef.current;
    if (audio && t.src) {
      // src ставим только если ещё не тот трек — иначе позиция сохраняется
      if (!audio.src || !audio.src.includes(t.src)) audio.src = t.src;
      audio.currentTime = currentTime;
      audio.play().catch(() => {});
    }
  };

  const stopAll = () => {
    stopSynth();
    audioRef.current?.pause(); // pause сохраняет currentTime
  };

  const setPlaying = (v: boolean) => { setOn(v); saveOn(v); };

  const togglePlay = () => {
    haptic();
    const next = !on;
    setPlaying(next);
    if (next) resumeCurrent();
    else stopAll();
  };

  const toggleExpanded = () => {
    if (dragInfo.current?.moved) return;
    haptic();
    setExpanded(e => !e);
  };

  const switchTrack = (dir: 1 | -1) => {
    haptic();
    const idx = (trackIdx + dir + allTracks.length) % allTracks.length;
    setTrackIdx(idx);
    try {
      localStorage.setItem(TRACK_KEY, String(idx));
    } catch {}
    if (on) startTrack(idx);
    else { setCurrentTime(0); saveTime(0); }
  };

  const pickTrack = (idx: number) => {
    haptic();
    if (idx === trackIdx) {
      togglePlay();
      return;
    }
    setTrackIdx(idx);
    try {
      localStorage.setItem(TRACK_KEY, String(idx));
    } catch {}
    setPlaying(true);
    startTrack(idx);
  };

  // Перемотка по клику/тапу на прогресс-баре.
  const seekTo = (fraction: number) => {
    const t = allTracks[trackIdx];
    const audio = audioRef.current;
    if (!t?.duration || !audio || t.id === "ambient") return;
    const time = Math.max(0, Math.min(t.duration, fraction * t.duration));
    audio.currentTime = time;
    setCurrentTime(time);
    saveTime(time);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const title = file.name.replace(/\.[^.]+$/, "");
        const audio = new Audio();
        audio.onloadedmetadata = async () => {
          const track: Track & { blob: Blob } = {
            id: `custom-${Date.now()}-${Math.random()}`,
            title,
            duration: audio.duration,
            custom: true,
            src: URL.createObjectURL(file),
            blob: file,
          };
          await musicDB.addTrack(track);
          setAllTracks(prev => [...prev, track]);
        };
        audio.src = URL.createObjectURL(file);
      }
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const deleteCustomTrack = async (id: string) => {
    setConfirmDelete(null);
    try {
      await musicDB.deleteTrack(id);
      setAllTracks(prev => prev.filter(t => t.id !== id));
      if (trackIdx >= allTracks.length - 1) {
        setTrackIdx(Math.max(0, trackIdx - 1));
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  useEffect(() => () => stopAll(), []);
  // Открытие панели плеера из «Быстрых действий» на главной.
  useEffect(() => {
    const openMusic = () => setExpanded(true);
    window.addEventListener("aifitness:open-music", openMusic);
    return () => window.removeEventListener("aifitness:open-music", openMusic);
  }, []);
  useEffect(() => {
    const onResize = () => setPos(p => clamp(p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onPointerDown = (e: ReactPointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragInfo.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
      moved: false,
    };
    setDragging(true);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const d = dragInfo.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) d.moved = true;
    if (d.moved) setPos(clamp({ x: d.origX + dx, y: d.origY + dy }));
  };

  const onPointerUp = () => {
    setDragging(false);
    if (dragInfo.current?.moved) savePos(pos);
    setTimeout(() => {
      dragInfo.current = null;
    }, 0);
  };

  const openUp = pos.y > window.innerHeight / 2;
  const openLeft = pos.x > window.innerWidth / 2;
  const track = allTracks[trackIdx];

  return (
    <div style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 60, touchAction: "none" }}>
      <audio ref={audioRef} crossOrigin="anonymous" />
      <button
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={toggleExpanded}
        aria-label="Плеер"
        style={{
          width: SIZE,
          height: SIZE,
          borderRadius: "50%",
          border: "none",
          cursor: dragging ? "grabbing" : "grab",
          position: "relative",
          background: expanded ? "var(--accent)" : "var(--card)",
          color: expanded ? "var(--accent-ink)" : "var(--ink)",
          boxShadow: "var(--shadow)",
          fontSize: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          touchAction: "none",
        }}
      >
        ♪
        {on && (
          <span
            style={{
              position: "absolute",
              top: -1,
              right: -1,
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "var(--ok)",
              border: "2px solid var(--bg)",
            }}
          />
        )}
      </button>
      {expanded && (
        <div
          style={{
            position: "absolute",
            [openUp ? "bottom" : "top"]: SIZE + 8,
            [openLeft ? "right" : "left"]: 0,
            background: "var(--card)",
            boxShadow: "var(--shadow)",
            borderRadius: 16,
            padding: 10,
            width: 240,
          } as CSSProperties}
        >
          {/* Управление */}
          <div className="row between" style={{ gap: 6, marginBottom: 8 }}>
            <button
              onClick={() => switchTrack(-1)}
              aria-label="Предыдущий трек"
              style={{
                border: "none",
                background: "var(--bg)",
                borderRadius: 10,
                width: 34,
                height: 34,
                cursor: "pointer",
                fontSize: 14,
                color: "var(--ink)",
              }}
            >
              ⏮
            </button>
            <button
              onClick={togglePlay}
              aria-label={on ? "Пауза" : "Играть"}
              style={{
                border: "none",
                background: "var(--accent)",
                color: "var(--accent-ink)",
                borderRadius: 10,
                width: 40,
                height: 34,
                cursor: "pointer",
                fontSize: 15,
              }}
            >
              {on ? "⏸" : "▶"}
            </button>
            <button
              onClick={() => switchTrack(1)}
              aria-label="Следующий трек"
              style={{
                border: "none",
                background: "var(--bg)",
                borderRadius: 10,
                width: 34,
                height: 34,
                cursor: "pointer",
                fontSize: 14,
                color: "var(--ink)",
              }}
            >
              ⏭
            </button>
          </div>

          {/* Инфо о треке */}
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, textAlign: "center", color: "var(--ink)" }}>
            {track?.title}
          </div>

          {/* Прогресс-бар с перемоткой (только для треков с длительностью) */}
          {track?.duration ? (
            <div style={{ marginBottom: 8 }}>
              <div
                onClick={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  seekTo((e.clientX - r.left) / r.width);
                }}
                style={{ height: 4, background: "var(--line)", borderRadius: 99, cursor: "pointer", position: "relative", overflow: "hidden" }}
              >
                <div style={{ height: "100%", width: `${Math.min(100, (currentTime / track.duration) * 100)}%`, background: "var(--accent)", borderRadius: 99, transition: "width .2s linear" }} />
              </div>
              <div className="row between" style={{ marginTop: 4, fontSize: 10, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
                <span>{fmtTime(currentTime)}</span>
                <span>{fmtTime(track.duration)}</span>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 10, color: "var(--muted)", textAlign: "center", marginBottom: 8 }}>
              {track?.id === "ambient" ? "Эмбиент · бесконечно" : ""}
            </div>
          )}

          {/* Список треков */}
          <div style={{ maxHeight: 160, overflowY: "auto", marginBottom: 8 }}>
            {allTracks.map((t, i) => (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  width: "100%",
                  marginBottom: 2,
                }}
              >
                <button
                  onClick={() => pickTrack(i)}
                  style={{
                    flex: 1,
                    textAlign: "left",
                    border: "none",
                    background: i === trackIdx ? "var(--accent-soft)" : "transparent",
                    color: i === trackIdx ? "var(--accent)" : "var(--ink)",
                    borderRadius: 8,
                    padding: "6px 8px",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {i === trackIdx && on ? "▶" : "♪"} {t.title}
                </button>
                {t.custom && (
                  confirmDelete === t.id ? (
                    <>
                      <button
                        onClick={() => deleteCustomTrack(t.id)}
                        aria-label="Подтвердить удаление"
                        style={{ border: "none", background: "var(--danger-bg)", color: "var(--danger-ink)", cursor: "pointer", fontSize: 11, fontWeight: 600, padding: "4px 8px", borderRadius: 8 }}
                      >
                        Удалить
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        aria-label="Отмена"
                        style={{ border: "none", background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: 14, padding: "4px 4px" }}
                      >
                        ↩
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(t.id)}
                      aria-label="Удалить трек"
                      style={{ border: "none", background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: 12, padding: "4px 4px" }}
                    >
                      ✕
                    </button>
                  )
                )}
              </div>
            ))}
          </div>

          {/* Загрузка */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="audio/*"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              width: "100%",
              border: "1px solid var(--line)",
              background: "var(--surface)",
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 600,
              cursor: uploading ? "default" : "pointer",
              color: "var(--ink)",
              opacity: uploading ? 0.6 : 1,
            }}
          >
            {uploading ? "Загрузка..." : "+ Добавить трек"}
          </button>
        </div>
      )}
    </div>
  );
}
