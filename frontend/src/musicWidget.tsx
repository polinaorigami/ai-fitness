// Глобальный плеер музыки — доступен на любом экране приложения (не только во время тренировки),
// не останавливается при переходах между экранами/фазами тренировки.
import { useEffect, useRef, useState } from "react";
import { haptic } from "./tg";

export const TRACKS: { id: string; title: string; src?: string }[] = [
  { id: "ambient", title: "Спокойный эмбиент" },
  { id: "oy", title: "Ой, не надо", src: "/music/oy-ne-nado.mp3" },
  { id: "stay", title: "Stay Close", src: "/music/stay-close.mp3" },
  { id: "lie", title: "Lie to Me", src: "/music/lie-to-me.mp3" },
  { id: "amore", title: "Amore Mio", src: "/music/amore-mio.mp3" },
];
const TRACK_KEY = "aifitness_music_track";
const loadTrackIdx = () => { try { const v = +(localStorage.getItem(TRACK_KEY) || 0); return v >= 0 && v < TRACKS.length ? v : 0; } catch { return 0; } };

export default function MusicWidget() {
  const [on, setOn] = useState(false);
  const [trackIdx, setTrackIdx] = useState(loadTrackIdx());
  const synthRef = useRef<{ ctx: AudioContext; nodes: (OscillatorNode | GainNode)[] } | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

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
    haptic();
    const next = !on; setOn(next);
    if (next) playIdx(trackIdx); else stopAll();
  };
  const nextTrack = () => {
    haptic();
    const idx = (trackIdx + 1) % TRACKS.length;
    setTrackIdx(idx);
    try { localStorage.setItem(TRACK_KEY, String(idx)); } catch {}
    if (on) playIdx(idx);
  };

  useEffect(() => () => stopAll(), []);

  return (
    <div style={{ position: "fixed", top: "calc(14px + env(safe-area-inset-top,0px))", right: 14, zIndex: 60, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
      <audio ref={audioRef} loop />
      <button onClick={toggle} aria-label="Музыка"
        style={{ width: 44, height: 44, borderRadius: "50%", border: "none", cursor: "pointer",
          background: on ? "var(--accent)" : "var(--card)", color: on ? "var(--accent-ink)" : "var(--ink)",
          boxShadow: "var(--shadow)", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
        ♪
      </button>
      {on && (
        <div style={{ background: "var(--card)", boxShadow: "var(--shadow)", borderRadius: 14, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, maxWidth: 220 }}>
          <span style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{TRACKS[trackIdx].title}</span>
          <button onClick={nextTrack} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 14, flexShrink: 0 }} aria-label="Следующий трек">⏭</button>
        </div>
      )}
    </div>
  );
}
