import { useState } from "react";
import { Btn, Card } from "../components/UI";
import { api, User } from "../api";
import { EQUIP, ZONES } from "./Onboarding";
import { THEME_PRESETS, getTheme, setTheme } from "../theme";
import { openLink, getMode, setMode, ThemeMode } from "../tg";
import { NAV_ITEMS, NavId, setNavOrder as saveNavOrder } from "../navPrefs";
import { clearSession } from "./Workout";
const CREATOR_LINK = "https://polinapeiv.taplink.ws";
const G: Record<string, string> = { weight_loss: "Снижение веса", muscle: "Набор мышц", recomp: "Рекомпозиция тела", strength: "Стать сильнее", fitness: "Улучшить физическую форму", endurance: "Развить выносливость" };
const L: Record<string, string> = { beginner: "Новичок", intermediate: "Средний", advanced: "Продвинутый" };
export default function Profile({ user, setUser, onRedo, onLogout, navOrder, onNavChange }: { user: User; setUser: (u: User) => void; onRedo: () => void; onLogout: () => void; navOrder: NavId[]; onNavChange: (ids: NavId[]) => void }) {
  const [busy, setBusy] = useState(""); const eqLabel = (k: string) => EQUIP.find(e => e[0] === k)?.[1] || k;
  const zoneLabel = (k?: string) => ZONES.find(z => z[0] === k)?.[2] || "Без акцента";
  const [theme, setThemeState] = useState(getTheme());
  const [mode, setModeState] = useState<ThemeMode>(getMode());
  const pickMode = (m: ThemeMode) => { setModeState(m); setMode(m); };
  const [showCoachInfo, setShowCoachInfo] = useState(false);
  const applyNav = (ids: NavId[]) => { saveNavOrder(ids); onNavChange(ids); };
  const toggleNavItem = (id: NavId) => {
    if (id === "profile") return;
    applyNav(navOrder.includes(id) ? navOrder.filter(x => x !== id) : [...navOrder, id]);
  };
  const moveNav = (id: NavId, dir: -1 | 1) => {
    const i = navOrder.indexOf(id); const j = i + dir;
    if (i < 0 || j < 0 || j >= navOrder.length) return;
    const next = [...navOrder]; [next[i], next[j]] = [next[j], next[i]];
    applyNav(next);
  };
  const toggle = async (k: keyof User) => { const u = await api.settings({ [k]: !user[k] }); setUser(u); };
  const time = async (v: string) => { const u = await api.settings({ workout_time: v }); setUser(u); };
  const pickTheme = (id: string) => { setThemeState(id); setTheme(id); };
  const [zoneBusy, setZoneBusy] = useState(false);
  const pickZone = async (id: string) => {
    if (id === (user.focus_zone || "full")) return;
    setZoneBusy(true); clearSession();
    try { await api.settings({ focus_zone: id }); await api.generate(); location.reload(); }
    catch { setZoneBusy(false); }
  };
  const [fbLiked, setFbLiked] = useState<boolean | null>(null);
  const [fbComment, setFbComment] = useState("");
  const [fbSent, setFbSent] = useState(false);
  const [fbBusy, setFbBusy] = useState(false);
  const sendFeedback = async () => {
    if (fbLiked === null && !fbComment.trim()) return;
    setFbBusy(true);
    try { await api.appFeedback({ liked: fbLiked, comment: fbComment.trim() }); setFbSent(true); setFbComment(""); }
    catch {} finally { setFbBusy(false); }
  };
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
      <Card><Row l="Цель" v={G[user.goal!]} /><Row l="Акцент" v={zoneLabel(user.focus_zone)} /><Row l="Возраст" v={user.age} /><Row l="Рост" v={user.height_cm && `${user.height_cm} см`} /><Row l="Вес" v={user.weight_kg && `${user.weight_kg} кг`} /><Row l="Тренировок в неделю" v={user.days_per_week} /><Row l="Опыт" v={L[user.level!]} /><Row l="Оборудование" v={<span style={{ fontSize: 13 }}>{user.equipment.map(eqLabel).join(", ")}</span>} />
        <div style={{ height: 16 }} />
        <div className="eyebrow" style={{ marginBottom: 8 }}>Быстро сменить акцент</div>
        <div className="chips" style={{ marginBottom: 14 }}>{ZONES.map(([k, ic, l]) => <button key={k} className={`chip ${(user.focus_zone || "full") === k ? "on" : ""}`} disabled={zoneBusy} onClick={() => pickZone(k)}>{ic} {l}</button>)}</div>
        {zoneBusy && <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>Пересобираем план…</div>}
        <Btn kind="ghost" onClick={onRedo}>Изменить анкету и пересобрать план</Btn></Card>
      <div className="eyebrow" style={{ margin: "18px 0 8px" }}>Внешний вид</div>
      <Card>
        <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 10 }}>Тема</div>
        <div className="row" style={{ gap: 6, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: 4, marginBottom: 16 }}>
          {([["system", "Система"], ["light", "Светлая"], ["dark", "Тёмная"]] as [ThemeMode, string][]).map(([m, l]) => (
            <button key={m} onClick={() => pickMode(m)}
              style={{ flex: 1, border: 0, borderRadius: 11, padding: "9px 0", fontSize: 13, fontWeight: 600, cursor: "pointer",
                background: mode === m ? "var(--card)" : "transparent", color: mode === m ? "var(--ink)" : "var(--muted)",
                boxShadow: mode === m ? "var(--shadow)" : "none" }}>{l}</button>
          ))}
        </div>
        <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 12 }}>Цвет приложения</div>
        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          {THEME_PRESETS.map(t => (
            <button key={t.id} onClick={() => pickTheme(t.id)} aria-label={t.label}
              style={{ width: 36, height: 36, borderRadius: 12, background: t.accent, border: theme === t.id ? "3px solid var(--ink)" : "3px solid transparent", cursor: "pointer" }} />
          ))}
        </div>
      </Card>
      <div className="eyebrow" style={{ margin: "18px 0 8px" }}>Нижнее меню</div>
      <Card>
        <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 12 }}>Переставь порядок стрелками или скрой лишнее</div>
        <div className="stack">
          {navOrder.map((id, i) => { const item = NAV_ITEMS.find(n => n.id === id)!; return (
            <div key={id} className="toggle">
              <span>{item.label}</span>
              <div className="row" style={{ gap: 6 }}>
                <button className="btn ghost sm" disabled={i === 0} onClick={() => moveNav(id, -1)}>↑</button>
                <button className="btn ghost sm" disabled={i === navOrder.length - 1} onClick={() => moveNav(id, 1)}>↓</button>
                {id !== "profile" && <button className="btn ghost sm" onClick={() => toggleNavItem(id)}>Скрыть</button>}
              </div>
            </div>
          ); })}
          {NAV_ITEMS.filter(n => !navOrder.includes(n.id)).map(item => (
            <div key={item.id} className="toggle">
              <span style={{ color: "var(--muted)" }}>{item.label}</span>
              <button className="btn ghost sm" onClick={() => toggleNavItem(item.id)}>Показать</button>
            </div>
          ))}
        </div>
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
      <div className="eyebrow" style={{ margin: "18px 0 8px" }}>Обратная связь</div>
      <Card>
        <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 12 }}>Нравится приложение? Что улучшить?</div>
        <div className="row" style={{ gap: 10, marginBottom: 12 }}>
          <button className={`chip ${fbLiked === true ? "on" : ""}`} onClick={() => setFbLiked(fbLiked === true ? null : true)}>👍 Нравится</button>
          <button className={`chip ${fbLiked === false ? "on" : ""}`} onClick={() => setFbLiked(fbLiked === false ? null : false)}>👎 Не очень</button>
        </div>
        <textarea value={fbComment} onChange={e => { setFbComment(e.target.value); setFbSent(false); }} placeholder="Расскажи подробнее (необязательно)…"
          style={{ width: "100%", minHeight: 72, border: "1px solid var(--line)", borderRadius: 14, padding: "12px 14px", background: "var(--card)",
            color: "var(--ink)", fontFamily: "var(--body)", fontSize: 15, resize: "vertical", marginBottom: 12 }} />
        <Btn kind="ghost" disabled={fbBusy || (fbLiked === null && !fbComment.trim())} onClick={sendFeedback}>{fbSent ? "Спасибо! ✓" : "Отправить"}</Btn>
      </Card>
      <div className="eyebrow" style={{ margin: "18px 0 8px" }}>О создателе</div>
      <Card>
        <div style={{ textAlign: "center" }}>
          <img src="/creator-qr.png" alt="QR-код" style={{ width: 140, height: 140, borderRadius: 16, marginBottom: 14 }} />
          <div style={{ fontWeight: 600, fontSize: 17, marginBottom: 4 }}>Полина</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>Автор приложения AI FITNESS</div>
          <Btn kind="soft" onClick={() => openLink(CREATOR_LINK)}>Мои соцсети · Taplink</Btn>
        </div>
      </Card>
      <div className="eyebrow" style={{ margin: "18px 0 8px" }}>Данные</div>
      <Card><div className="stack"><Btn kind="danger" disabled={!!busy} onClick={() => del("photos")}>Удалить фотографии</Btn><Btn kind="danger" disabled={!!busy} onClick={() => del("history")}>Удалить историю</Btn><Btn kind="danger" disabled={!!busy} onClick={() => del("account")}>Удалить аккаунт</Btn></div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 12 }}>Фото не используются для обучения моделей и не передаются сторонним сервисам.</div></Card>
    </div>
  );
}
