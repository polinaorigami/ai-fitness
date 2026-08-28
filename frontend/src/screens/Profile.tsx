import { useState } from "react";
import { Btn, Card } from "../components/UI";
import { api, User } from "../api";
import { EQUIP } from "./Onboarding";
import { THEME_PRESETS, getTheme, setTheme } from "../theme";
import { openLink } from "../tg";
const CREATOR_LINK = "https://polinapeiv.taplink.ws";
const G: Record<string, string> = { weight_loss: "Снижение веса", muscle: "Набор мышц", recomp: "Рекомпозиция тела", strength: "Стать сильнее", fitness: "Улучшить физическую форму", endurance: "Развить выносливость" };
const L: Record<string, string> = { beginner: "Новичок", intermediate: "Средний", advanced: "Продвинутый" };
export default function Profile({ user, setUser, onRedo, onLogout }: { user: User; setUser: (u: User) => void; onRedo: () => void; onLogout: () => void }) {
  const [busy, setBusy] = useState(""); const eqLabel = (k: string) => EQUIP.find(e => e[0] === k)?.[1] || k;
  const [theme, setThemeState] = useState(getTheme());
  const [tap, setTap] = useState(user.taplink_url || "");
  const [tapSaved, setTapSaved] = useState(true);
  const [showCoachInfo, setShowCoachInfo] = useState(false);
  const toggle = async (k: keyof User) => { const u = await api.settings({ [k]: !user[k] }); setUser(u); };
  const time = async (v: string) => { const u = await api.settings({ workout_time: v }); setUser(u); };
  const pickTheme = (id: string) => { setThemeState(id); setTheme(id); };
  const saveTap = async () => { const u = await api.settings({ taplink_url: tap }); setUser(u); setTapSaved(true); };
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
      <div className="eyebrow" style={{ margin: "18px 0 8px" }}>Внешний вид</div>
      <Card>
        <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 12 }}>Цвет приложения</div>
        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          {THEME_PRESETS.map(t => (
            <button key={t.id} onClick={() => pickTheme(t.id)} aria-label={t.label}
              style={{ width: 36, height: 36, borderRadius: 12, background: t.accent, border: theme === t.id ? "3px solid var(--ink)" : "3px solid transparent", cursor: "pointer" }} />
          ))}
        </div>
      </Card>
      <div className="eyebrow" style={{ margin: "18px 0 8px" }}>Ссылки</div>
      <Card>
        <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 8 }}>Ссылка на Taplink</div>
        <input placeholder="https://taplink.cc/твой_id" value={tap}
          onChange={e => { setTap(e.target.value); setTapSaved(false); }} onBlur={saveTap} />
        {!tapSaved && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>Сохранится, когда уберёшь фокус с поля</div>}
      </Card>
      <div className="eyebrow" style={{ margin: "18px 0 8px" }}>AI-тренер</div>
      <Card>
        <div className="row between" style={{ cursor: "pointer" }} onClick={() => setShowCoachInfo(!showCoachInfo)}>
          <span style={{ fontWeight: 500 }}>Как работает AI-тренер</span><span style={{ color: "var(--muted)" }}>{showCoachInfo ? "▲" : "▼"}</span>
        </div>
        {showCoachInfo && <div style={{ marginTop: 12, fontSize: 14, color: "var(--muted)", lineHeight: 1.5 }}>
          Программа собирается на основе твоей анкеты: цели, уровня, дней в неделю и оборудования. После тренировок AI-тренер подстраивает веса и нагрузку по твоей обратной связи (RPE, «было легко/тяжело»), а в чате отвечает на вопросы про перенос тренировки, боль, усталость и корректировку плана. Диагнозов не ставит и не заменяет врача или диетолога.
        </div>}
      </Card>
      <div className="eyebrow" style={{ margin: "18px 0 8px" }}>Уведомления</div>
      <Card><div className="toggle"><span>Время тренировки</span><input type="time" value={user.workout_time} onChange={e => time(e.target.value)} style={{ width: 120, padding: "8px 12px", fontSize: 16 }} /></div>
        <Sw l="Напоминания о тренировках" k="remind_workout" /><Sw l="Напоминания об отдыхе" k="remind_rest" /><Sw l="Еженедельный отчёт" k="weekly_report" /><Sw l="Напоминания о прогрессе" k="remind_progress" /></Card>
      <div className="eyebrow" style={{ margin: "18px 0 8px" }}>Данные</div>
      <Card><div className="stack"><Btn kind="danger" disabled={!!busy} onClick={() => del("photos")}>Удалить фотографии</Btn><Btn kind="danger" disabled={!!busy} onClick={() => del("history")}>Удалить историю</Btn><Btn kind="danger" disabled={!!busy} onClick={() => del("account")}>Удалить аккаунт</Btn></div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 12 }}>Фото не используются для обучения моделей и не передаются сторонним сервисам.</div></Card>
      <div className="eyebrow" style={{ margin: "18px 0 8px" }}>О создателе</div>
      <Card>
        <div style={{ textAlign: "center" }}>
          <img src="/creator-qr.png" alt="QR-код" style={{ width: 140, height: 140, borderRadius: 16, marginBottom: 14 }} />
          <div style={{ fontWeight: 600, fontSize: 17, marginBottom: 4 }}>Полина</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>Автор приложения AI FITNESS</div>
          <Btn kind="soft" onClick={() => openLink(CREATOR_LINK)}>Мои соцсети · Taplink</Btn>
        </div>
      </Card>
    </div>
  );
}
