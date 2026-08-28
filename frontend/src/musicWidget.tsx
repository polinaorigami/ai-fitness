// Глобальный плеер музыки — доступен на любом экране приложения, не останавливается при
// переходах между экранами/фазами тренировки. Кружок можно перетащить в любое место экрана —
// позиция запоминается на устройстве.
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

  const toggle = () => {
    if (dragInfo.current?.moved) return; // это был драг, не клик
    haptic();
    const next = !on; setOn(next);
    if (next) playIdx(trackIdx); else stopAll();
  };
  const switchTrack = (dir: 1 | -1) => {
    haptic();
    const idx = (trackIdx + dir + TRACKS.length) % TRACKS.length;
    setTrackIdx(idx);
    try { localStorage.setItem(TRACK_KEY, String(idx)); } catch {}
    if (on) playIdx(idx);
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

  // Панель с названием трека и стрелками открывается в ту сторону экрана, где есть место.
  const openUp = pos.y > window.innerHeight / 2;
  const openLeft = pos.x > window.innerWidth / 2;

  return (
    <div style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 60, touchAction: "none" }}>
      <audio ref={audioRef} loop />
      <button
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
        onClick={toggle} aria-label="Музыка"
        style={{ width: SIZE, height: SIZE, borderRadius: "50%", border: "none", cursor: dragging ? "grabbing" : "grab",
          background: on ? "var(--accent)" : "var(--card)", color: on ? "var(--accent-ink)" : "var(--ink)",
          boxShadow: "var(--shadow)", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", touchAction: "none" }}>
        ♪
      </button>
      {on && (
        <div style={{ position: "absolute", [openUp ? "bottom" : "top"]: SIZE + 8, [openLeft ? "right" : "left"]: 0,
            background: "var(--card)", boxShadow: "var(--shadow)", borderRadius: 14, padding: "8px 10px",
            display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" } as CSSProperties}>
          <button onClick={() => switchTrack(-1)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 14 }} aria-label="Предыдущий трек">⏮</button>
          <span style={{ fontSize: 12, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis" }}>{TRACKS[trackIdx].title}</span>
          <button onClick={() => switchTrack(1)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 14 }} aria-label="Следующий трек">⏭</button>
        </div>
      )}
    </div>
  );
}
