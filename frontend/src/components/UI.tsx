import { CSSProperties, ReactNode } from "react";
import { haptic } from "../tg";
export const Btn = ({ children, onClick, kind = "primary", disabled, className = "", style }: { children: ReactNode; onClick?: () => void; kind?: string; disabled?: boolean; className?: string; style?: CSSProperties }) => (
  <button className={`btn ${kind} ${className}`} disabled={disabled} style={style} onClick={() => { haptic(); onClick?.(); }}>{children}</button>
);
export const Card = ({ children, accent, className = "", style, onClick }: { children: ReactNode; accent?: boolean; className?: string; style?: CSSProperties; onClick?: () => void }) => (
  <div className={`card ${accent ? "accent" : ""} ${className}`} style={style} onClick={onClick}>{children}</div>
);
export const Stat = ({ v, l, style }: { v: ReactNode; l: string; style?: CSSProperties }) => <div className="stat" style={style}><div className="v">{v}</div><div className="l">{l}</div></div>;
export const IconBtn = ({ children, onClick, onHero, className = "", style, "aria-label": ariaLabel }: { children: ReactNode; onClick?: () => void; onHero?: boolean; className?: string; style?: CSSProperties; "aria-label"?: string }) => (
  <button className={`icon-btn ${onHero ? "on-hero" : ""} ${className}`} style={style} aria-label={ariaLabel} onClick={() => { haptic(); onClick?.(); }}>{children}</button>
);
// Баннер-«герой»: фон читает --hero-img (устанавливается через img), иначе — градиент-заглушка (--card фото ещё нет).
export const Hero = ({ children, img, className = "", style }: { children: ReactNode; img?: string; className?: string; style?: CSSProperties }) => (
  <div className={`hero ${className}`} style={{ ...(img ? { "--hero-img": `url(${img})` } as CSSProperties : {}), ...style }}>{children}</div>
);
const ICONS: Record<string, ReactNode> = {
  home: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></svg>,
  workout: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5l11 11" /><path d="M4 8l2.5-2.5L9 8l-2.5 2.5z" /><path d="M15 15l2.5-2.5L20 15l-2.5 2.5z" /><path d="M4 4l2 2M18 18l2 2" /></svg>,
  schedule: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="5" width="17" height="16" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>,
  progress: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19V10" /><path d="M12 19V5" /><path d="M20 19v-7" /></svg>,
  friends: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  mind: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 5.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m5.08-5.08l4.24-4.24" /></svg>,
  achievements: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M8.56 2.75c-.3-.3-.7-.46-1.15-.46-1.41 0-2.41 1-2.41 2.41 0 .45.15.85.46 1.15" /><path d="M15.44 2.75c.3-.3.7-.46 1.15-.46 1.41 0 2.41 1 2.41 2.41 0 .45-.15.85-.46 1.15" /><path d="M12 12v8M10 20h4" /></svg>,
  profile: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c1.6-4 5-6 8-6s6.4 2 8 6" /></svg>,
};
// Единый набор линейных иконок 26×26 (stroke 1.8, currentColor) для действий и разделов.
const ACTION_ICONS: Record<string, ReactNode> = {
  stretch: <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="4.5" r="2" /><path d="M12 6.5v6M12 12.5l-4 5M12 12.5l4 5M7 9l5 1.5L17 9" /></svg>,
  meditation: <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="2" /><path d="M5 19c1.5-4 4-6 7-6s5.5 2 7 6M4 15l4 2M20 15l-4 2" /></svg>,
  breathing: <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8" opacity=".35" /><circle cx="12" cy="12" r="4" /></svg>,
  music: <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V6l10-2v12" /><circle cx="6" cy="18" r="2.5" /><circle cx="16" cy="16" r="2.5" /></svg>,
  friends: <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  workout: <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5l11 11" /><path d="M4 8l2.5-2.5L9 8l-2.5 2.5z" /><path d="M15 15l2.5-2.5L20 15l-2.5 2.5z" /><path d="M4 4l2 2M18 18l2 2" /></svg>,
  schedule: <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="5" width="17" height="16" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>,
  progress: <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19V10" /><path d="M12 19V5" /><path d="M20 19v-7" /></svg>,
  achievements: <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M8.56 2.75c-.3-.3-.7-.46-1.15-.46-1.41 0-2.41 1-2.41 2.41 0 .45.15.85.46 1.15" /><path d="M15.44 2.75c.3-.3.7-.46 1.15-.46 1.41 0 2.41 1 2.41 2.41 0 .45-.15.85-.46 1.15" /><path d="M12 12v8M10 20h4" /></svg>,
};
export const ActionIcon = ({ name }: { name: string }) => <>{ACTION_ICONS[name] || null}</>;
export const Nav = ({ tab, go, items }: { tab: string; go: (t: string) => void; items: { id: string; label: string }[] }) => (
  <nav className="nav">{items.map(({ id, label }) => (
    <button key={id} className={tab === id ? "on" : ""} onClick={() => { haptic(); go(id); }}>{ICONS[id]}{label}</button>
  ))}</nav>
);
export const Stepper = ({ value, step, min = 0, onChange, unit }: { value: number; step: number; min?: number; onChange: (v: number) => void; unit: string }) => (
  <div className="stepper">
    <button onClick={() => { haptic(); onChange(Math.max(min, +(value - step).toFixed(1))); }}>−</button>
    <div className="val">{value}<span style={{ fontSize: 16, color: "var(--muted)", marginLeft: 6 }}>{unit}</span></div>
    <button onClick={() => { haptic(); onChange(+(value + step).toFixed(1)); }}>+</button>
  </div>
);
export const Loading = ({ text }: { text?: string }) => (
  <div className="splash">
    <div className="logo">AI FITNESS</div>
    {text && <div className="tag">{text}</div>}
    <div className="load"><i /></div>
  </div>
);
export const Err = ({ e }: { e: string }) => (
  <div className="err">
    <div style={{ fontWeight: 600, marginBottom: 4 }}>⚠️ Ошибка</div>
    <div>{e}</div>
  </div>
);
export const CardSkeleton = () => (
  <div className="card" style={{ opacity: 0.6 }}>
    <div style={{ height: 16, background: "var(--surface)", borderRadius: 8, marginBottom: 12, animation: "pulse 2s ease-in-out infinite" }} />
    <div style={{ height: 12, background: "var(--surface)", borderRadius: 8, marginBottom: 8, width: "80%", animation: "pulse 2s ease-in-out infinite 0.1s" }} />
  </div>
);
export const StatSkeleton = () => (
  <div className="stat" style={{ opacity: 0.6 }}>
    <div style={{ height: 28, background: "var(--surface)", borderRadius: 8, marginBottom: 8, width: "60%", animation: "pulse 2s ease-in-out infinite" }} />
    <div style={{ height: 12, background: "var(--surface)", borderRadius: 8, width: "80%", animation: "pulse 2s ease-in-out infinite 0.1s" }} />
  </div>
);
export const greet = () => { const h = new Date().getHours(); return h < 5 ? "Доброй ночи" : h < 12 ? "Доброе утро" : h < 18 ? "Добрый день" : "Добрый вечер"; };
export const fmtMin = (s: number) => `${Math.round(s / 60)} мин`;
