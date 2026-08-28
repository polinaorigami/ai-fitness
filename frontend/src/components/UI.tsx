import { ReactNode } from "react";
import { haptic } from "../tg";
export const Btn = ({ children, onClick, kind = "primary", disabled, className = "" }: { children: ReactNode; onClick?: () => void; kind?: string; disabled?: boolean; className?: string }) => (
  <button className={`btn ${kind} ${className}`} disabled={disabled} onClick={() => { haptic(); onClick?.(); }}>{children}</button>
);
export const Card = ({ children, accent, className = "" }: { children: ReactNode; accent?: boolean; className?: string }) => (
  <div className={`card ${accent ? "accent" : ""} ${className}`}>{children}</div>
);
export const Stat = ({ v, l }: { v: ReactNode; l: string }) => <div className="stat"><div className="v">{v}</div><div className="l">{l}</div></div>;
const ICONS: Record<string, ReactNode> = {
  home: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></svg>,
  workout: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5l11 11" /><path d="M4 8l2.5-2.5L9 8l-2.5 2.5z" /><path d="M15 15l2.5-2.5L20 15l-2.5 2.5z" /><path d="M4 4l2 2M18 18l2 2" /></svg>,
  progress: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19V10" /><path d="M12 19V5" /><path d="M20 19v-7" /></svg>,
  profile: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c1.6-4 5-6 8-6s6.4 2 8 6" /></svg>,
};
export const Nav = ({ tab, go }: { tab: string; go: (t: string) => void }) => (
  <nav className="nav">{[["home", "Главная"], ["workout", "Тренировка"], ["progress", "Прогресс"], ["profile", "Профиль"]].map(([k, l]) => (
    <button key={k} className={tab === k ? "on" : ""} onClick={() => { haptic(); go(k); }}>{ICONS[k]}{l}</button>
  ))}</nav>
);
export const Stepper = ({ value, step, min = 0, onChange, unit }: { value: number; step: number; min?: number; onChange: (v: number) => void; unit: string }) => (
  <div className="stepper">
    <button onClick={() => { haptic(); onChange(Math.max(min, +(value - step).toFixed(1))); }}>−</button>
    <div className="val">{value}<span style={{ fontSize: 16, color: "var(--muted)", marginLeft: 6 }}>{unit}</span></div>
    <button onClick={() => { haptic(); onChange(+(value + step).toFixed(1)); }}>+</button>
  </div>
);
export const Loading = ({ text = "Загружаем…" }: { text?: string }) => <div className="screen no-nav" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><div className="pulse eyebrow">{text}</div></div>;
export const Err = ({ e }: { e: string }) => <div className="err">{e}</div>;
export const greet = () => { const h = new Date().getHours(); return h < 5 ? "Доброй ночи" : h < 12 ? "Доброе утро" : h < 18 ? "Добрый день" : "Добрый вечер"; };
export const fmtMin = (s: number) => `${Math.round(s / 60)} мин`;
