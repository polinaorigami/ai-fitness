import { ReactNode } from "react";
import { haptic } from "../tg";
export const Btn = ({ children, onClick, kind = "primary", disabled, className = "" }: { children: ReactNode; onClick?: () => void; kind?: string; disabled?: boolean; className?: string }) => (
  <button className={`btn ${kind} ${className}`} disabled={disabled} onClick={() => { haptic(); onClick?.(); }}>{children}</button>
);
export const Card = ({ children, accent, className = "" }: { children: ReactNode; accent?: boolean; className?: string }) => (
  <div className={`card ${accent ? "accent" : ""} ${className}`}>{children}</div>
);
export const Stat = ({ v, l }: { v: ReactNode; l: string }) => <div className="stat"><div className="v">{v}</div><div className="l">{l}</div></div>;
export const Nav = ({ tab, go }: { tab: string; go: (t: string) => void }) => (
  <nav className="nav">{[["home", "Главная"], ["workout", "Тренировка"], ["progress", "Прогресс"], ["profile", "Профиль"]].map(([k, l]) => (
    <button key={k} className={tab === k ? "on" : ""} onClick={() => { haptic(); go(k); }}><span className="dot" />{l}</button>
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
