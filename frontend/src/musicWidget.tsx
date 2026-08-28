// Глобальный плеер музыки — доступен на любом экране приложения, не останавливается при
// переходах между экранами/фазами тренировки. Кружок можно перетащить в любое место экрана —
// позиция запоминается на устройстве.
//
// Тап по кружку с нотой открывает/закрывает панель плеера — сам он музыку не останавливает.
// Внутри панели отдельная кнопка play/pause, а также «назад»/«вперёд» и список остальных треков.
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, CSSProperties } from "react";
import { haptic } from "./tg";

export const TRACKS: { id: string; title: string; src?: string }[] = [
  { id: "ambient", title: "Спокойный эмбиент" },
  { id: "oy", title: "Ой, не надо", src: "/music/oy-ne-nado.mp3" },
  { id: "stay", title: "Stay Close", src: "/music/stay-close.mp3" },
  { id: "lie", title: "Lie to Me", src: "/music/lie-to-me.mp3" },
  { id: "amore", title: "Amore Mio", src: "/music/amore-mio.mp3" },
];
const TRACK_KEY = "aifitness_music_track";
const POS_KEY = "aifitness_music_pos";
const SIZE = 44;
const loadTrackIdx = () => { try { const v = +(localStorage.getItem(TRACK_KEY) || 0); return v >= 0 && v < TRACKS.length ? v : 0; } catch { return 0; } };
const loadPos = (): { x: number; y: number } | null => { try { const raw = localStorage.getItem(POS_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; } };
const savePos = (p: { x: number; y: number }) => { try { localStorage.setItem(POS_KEY, JSON.stringify(p)); } catch {} };
const clamp = (p: { x: number; y: number }) => ({
  x: Math.min(Math.max(p.x, 8), window.innerWidth - SIZE - 8),
  y: Math.min(Math.max(p.y, 8), window.innerHeight - SIZE - 8),
});

export default function MusicWidget() {
  const [on, setOn] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [trackIdx, setTrackIdx] = useState(loadTrackIdx());
  const [pos, setPos] = useState(() => clamp(loadPos() || { x: window.innerWidth - SIZE - 14, y: 14 + 40 }));
  const [dragging, setDragging] = useState(false);
  const synthRef = useRef<{ ctx: AudioContext; nodes: (OscillatorNode | GainNode)[] } | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const dragInfo = useRef<{ startX: number; startY: number; origX: number; origY: number; moved: boolean } | null>(null);

  const startSynth = () => {
    if (synthRef.current) return;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const master = ctx.createGain(); master.gain.value = 0.06; master.connect(ctx.destination);
    const notes = [174.61, 220, 261.63];
    const nodes: (OscillatorNode | GainNode)[] = [master];
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator(); osc.type = "sine"; osc.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = 0;
      osc.connect(g); g.connect(master); osc.start();
      g.gain.linearRampToValueAtTime(1 / notes.length, ctx.currentTime + 1.5 + i * 0.3);
      nodes.push(osc, g);
    });
    synthRef.current = { ctx, nodes };
  };
  const stopSynth = () => { synthRef.current?.ctx.close(); synthRef.current = null; };

  const playIdx = (idx: number) => {
    stopSynth(); audioRef.current?.pause();
    const t = TRACKS[idx];
    if (t.id === "ambient") { startSynth(); return; }
    if (audioRef.current) { audioRef.current.src = t.src!; audioRef.current.currentTime = 0; audioRef.current.play().catch(() => {}); }
  };
  const stopAll = () => { stopSynth(); audioRef.current?.pause(); };

  // Play/pause — отдельная кнопка внутри панели, никак не связана с открытием/закрытием панели.
  const togglePlay = () => {
    haptic();
    const next = !on; setOn(next);
    if (next) playIdx(trackIdx); else stopAll();
  };
  // Тап по самому кружку — только открыть/закрыть панель, музыку не трогает.
  const toggleExpanded = () => {
    if (dragInfo.current?.moved) return; // это был драг, не клик
    haptic();
    setExpanded(e => !e);
  };
  const switchTrack = (dir: 1 | -1) => {
    haptic();
    const idx = (trackIdx + dir + TRACKS.length) % TRACKS.length;
    setTrackIdx(idx);
    try { localStorage.setItem(TRACK_KEY, String(idx)); } catch {}
    if (on) playIdx(idx);
  };
  const pickTrack = (idx: number) => {
    haptic();
    if (idx === trackIdx) { togglePlay(); return; }
    setTrackIdx(idx);
    try { localStorage.setItem(TRACK_KEY, String(idx)); } catch {}
    setOn(true); playIdx(idx);
  };

  useEffect(() => () => stopAll(), []);
  useEffect(() => { const onResize = () => setPos(p => clamp(p)); window.addEventListener("resize", onResize); return () => window.removeEventListener("resize", onResize); }, []);

  const onPointerDown = (e: ReactPointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragInfo.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y, moved: false };
    setDragging(true);
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    const d = dragInfo.current; if (!d) return;
    const dx = e.clientX - d.startX, dy = e.clientY - d.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) d.moved = true;
    if (d.moved) setPos(clamp({ x: d.origX + dx, y: d.origY + dy }));
  };
  const onPointerUp = () => {
    setDragging(false);
    if (dragInfo.current?.moved) savePos(pos);
    setTimeout(() => { dragInfo.current = null; }, 0);
  };

  // Панель открывается в ту сторону экрана, где есть место.
  const openUp = pos.y > window.innerHeight / 2;
  const openLeft = pos.x > window.innerWidth / 2;

  return (
    <div style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 60, touchAction: "none" }}>
      <audio ref={audioRef} loop />
      <button
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
        onClick={toggleExpanded} aria-label="Плеер"
        style={{ width: SIZE, height: SIZE, borderRadius: "50%", border: "none", cursor: dragging ? "grabbing" : "grab", position: "relative",
          background: expanded ? "var(--accent)" : "var(--card)", color: expanded ? "var(--accent-ink)" : "var(--ink)",
          boxShadow: "var(--shadow)", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", touchAction: "none" }}>
        ♪
        {on && (
          <span style={{ position: "absolute", top: -1, right: -1, width: 10, height: 10, borderRadius: "50%",
            background: "var(--ok)", border: "2px solid var(--bg)" }} />
        )}
      </button>
      {expanded && (
        <div style={{ position: "absolute", [openUp ? "bottom" : "top"]: SIZE + 8, [openLeft ? "right" : "left"]: 0,
            background: "var(--card)", boxShadow: "var(--shadow)", borderRadius: 16, padding: 10, width: 220 } as CSSProperties}>
          <div className="row between" style={{ gap: 6, marginBottom: 8 }}>
            <button onClick={() => switchTrack(-1)} aria-label="Предыдущий трек"
              style={{ border: "none", background: "var(--bg)", borderRadius: 10, width: 34, height: 34, cursor: "pointer", fontSize: 14, color: "var(--ink)" }}>⏮</button>
            <button onClick={togglePlay} aria-label={on ? "Пауза" : "Играть"}
              style={{ border: "none", background: "var(--accent)", color: "var(--accent-ink)", borderRadius: 10, width: 40, height: 34, cursor: "pointer", fontSize: 15 }}>
              {on ? "⏸" : "▶"}
            </button>
            <button onClick={() => switchTrack(1)} aria-label="Следующий трек"
              style={{ border: "none", background: "var(--bg)", borderRadius: 10, width: 34, height: 34, cursor: "pointer", fontSize: 14, color: "var(--ink)" }}>⏭</button>
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, textAlign: "center" }}>{TRACKS[trackIdx].title}</div>
          <div style={{ maxHeight: 140, overflowY: "auto" }}>
            {TRACKS.map((t, i) => (
              <button key={t.id} onClick={() => pickTrack(i)}
                style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", textAlign: "left", border: "none",
                  background: i === trackIdx ? "var(--accent-soft)" : "transparent", color: i === trackIdx ? "var(--accent)" : "var(--ink)",
                  borderRadius: 8, padding: "6px 8px", fontSize: 12, cursor: "pointer", marginBottom: 2 }}>
                {i === trackIdx && on ? "▶" : "♪"} {t.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
