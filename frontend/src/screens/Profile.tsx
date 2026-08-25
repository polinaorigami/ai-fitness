import { useState } from "react";
import { Btn, Card } from "../components/UI";
import { api, User } from "../api";
import { EQUIP } from "./Onboarding";
const G: Record<string, string> = { weight_loss: "Снижение веса", muscle: "Набор мышц", recomp: "Рекомпозиция тела", strength: "Стать сильнее", fitness: "Улучшить физическую форму", endurance: "Развить выносливость" };
const L: Record<string, string> = { beginner: "Новичок", intermediate: "Средний", advanced: "Продвинутый" };
export default function Profile({ user, setUser, onRedo, onLogout }: { user: User; setUser: (u: User) => void; onRedo: () => void; onLogout: () => void }) {
  const [busy, setBusy] = useState(""); const eqLabel = (k: string) => EQUIP.find(e => e[0] === k)?.[1] || k;
  const toggle = async (k: keyof User) => { const u = await api.settings({ [k]: !user[k] }); setUser(u); };
  const time = async (v: string) => { const u = await api.settings({ workout_time: v }); setUser(u); };
  const del = async (what: "photos" | "history" | "account") => {
    const q = { photos: "Удалить все фотографии? Это нельзя отменить.", history: "Удалить всю историю тренировок, замеры и чат?", account: "Удалить аккаунт и все данные полностью?" }[what];
    if (!confirm(q)) return; setBusy(what);
    if (what === "photos") await api.deletePhotos(); else if (what === "history") await api.deleteHistory(); else { await api.deleteAccount(); onLogout(); return; }
    setBusy(""); alert("Готово");
  };
  const Row = ({ l, v }: { l: string; v: any }) => <div className="toggle"><span style={{ color: "var(--muted)" }}>{l}</span><span style={{ fontWeight: 500 }}>{v ?? "—"}</span></div>;
  const Sw = ({ l, k }: { l: string; k: keyof User }) => <div className="toggle"><span>{l}</span><button className={`sw ${user[k] ? "on" : ""}`} onClick={() => toggle(k)} aria-label={l} /></div>;
  return (
    <div className="screen fade">
      <div className="row" style={{ marginBottom: 8 }}>{user.photo_url && <img src={user.photo_url} style={{ width: 56, height: 56, borderRadius: 18 }} />}<div><h1 className="display" style={{ margin: 0, fontSize: 28 }}>{user.first_name}</h1>{user.username && <div style={{ color: "var(--muted)" }}>@{user.username}</div>}</div></div>
      <div className="eyebrow" style={{ margin: "18px 0 8px" }}>Профиль</div>
      <Card><Row l="Цель" v={G[user.goal!]} /><Row l="Возраст" v={user.age} /><Row l="Рост" v={user.height_cm && `${user.height_cm} см`} /><Row l="Вес" v={user.weight_kg && `${user.weight_kg} кг`} /><Row l="Тренировок в неделю" v={user.days_per_week} /><Row l="Опыт" v={L[user.level!]} /><Row l="Оборудование" v={<span style={{ fontSize: 13 }}>{user.equipment.map(eqLabel).join(", ")}</span>} />
        <div style={{ height: 12 }} /><Btn kind="ghost" onClick={onRedo}>Изменить анкету и пересобрать план</Btn></Card>
      <div className="eyebrow" style={{ margin: "18px 0 8px" }}>Уведомления</div>
      <Card><div className="toggle"><span>Время тренировки</span><input type="time" value={user.workout_time} onChange={e => time(e.target.value)} style={{ width: 120, padding: "8px 12px", fontSize: 16 }} /></div>
        <Sw l="Напоминания о тренировках" k="remind_workout" /><Sw l="Напоминания об отдыхе" k="remind_rest" /><Sw l="Еженедельный отчёт" k="weekly_report" /><Sw l="Напоминания о прогрессе" k="remind_progress" /></Card>
      <div className="eyebrow" style={{ margin: "18px 0 8px" }}>Данные</div>
      <Card><div className="stack"><Btn kind="danger" disabled={!!busy} onClick={() => del("photos")}>Удалить фотографии</Btn><Btn kind="danger" disabled={!!busy} onClick={() => del("history")}>Удалить историю</Btn><Btn kind="danger" disabled={!!busy} onClick={() => del("account")}>Удалить аккаунт</Btn></div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 12 }}>Фото не используются для обучения моделей и не передаются сторонним сервисам.</div></Card>
    </div>
  );
}
