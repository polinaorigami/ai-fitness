import { useEffect, useRef, useState } from "react";
import { Btn, Card, Hero, IconBtn, Loading, Err, fmtMin } from "../components/UI";
import { api, User, FriendsData, FriendInviteT, FriendMsg, FriendBrief, RecentSession } from "../api";
import { haptic, notify } from "../tg";

// Относительное время для превью последнего сообщения в списке друзей.
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMin = Math.max(0, Math.floor((Date.now() - then) / 60000));
  if (diffMin < 1) return "сейчас";
  if (diffMin < 60) return `${diffMin} мин`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} ч`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "вчера";
  if (diffD < 7) return `${diffD} дн`;
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

// Безопасное копирование: navigator.clipboard может отсутствовать/бросать в Telegram WebView.
function copyText(text: string): boolean {
  try {
    if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(text).catch(() => {}); return true; }
  } catch {}
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}

function Avatar({ f, size = 44 }: { f: FriendBrief; size?: number }) {
  const initial = (f.first_name || "?").trim().charAt(0).toUpperCase();
  return f.photo_url ? (
    <img src={f.photo_url} alt={f.first_name} style={{ width: size, height: size, borderRadius: size / 3, objectFit: "cover" }} />
  ) : (
    <div style={{ width: size, height: size, borderRadius: size / 3, background: "var(--accent-soft)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size / 2.4, fontFamily: "var(--display)" }}>
      {initial}
    </div>
  );
}

export default function Friends({ user }: { user: User }) {
  const [data, setData] = useState<FriendsData | null>(null);
  const [invites, setInvites] = useState<{ incoming: FriendInviteT[]; outgoing: FriendInviteT[] }>({ incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState<"friends" | "invites">("friends");
  const [showAdd, setShowAdd] = useState(false);
  const [code, setCode] = useState("");
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState("");
  const [chatWith, setChatWith] = useState<FriendBrief | null>(null);

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2200); };

  const load = async () => {
    try {
      const [d, inv] = await Promise.all([api.friends(), api.friendInvites()]);
      setData(d); setInvites(inv); setErr("");
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const copyCode = () => {
    if (!data) return;
    haptic();
    flash(copyText(data.code) ? "Код скопирован" : data.code);
  };

  const addFriend = async () => {
    if (!code.trim() || adding) return;
    setAdding(true);
    try {
      const r = await api.friendInvite(code.trim());
      notify("success");
      if (r.status === "friends") flash("Теперь вы друзья!");
      else if (r.status === "already_sent") flash("Приглашение уже отправлено");
      else flash("Приглашение отправлено");
      setCode(""); setShowAdd(false);
      await load();
    } catch (e: any) { notify("error"); flash(e.message); }
    finally { setAdding(false); }
  };

  const accept = async (id: number) => {
    haptic();
    try { await api.friendAccept(id); notify("success"); flash("Друг добавлен"); await load(); }
    catch (e: any) { flash(e.message); }
  };
  const decline = async (id: number) => {
    haptic();
    try { await api.friendDecline(id); await load(); }
    catch (e: any) { flash(e.message); }
  };
  const remove = async (fid: number) => {
    haptic();
    try { await api.friendRemove(fid); await load(); }
    catch (e: any) { flash(e.message); }
  };

  if (loading) return <Loading text="Загружаем друзей…" />;
  if (err) return <div className="screen"><Err e={err} /><div style={{ height: 12 }} /><Btn onClick={load}>Повторить</Btn></div>;
  if (chatWith) return <Chat friend={chatWith} onBack={() => { setChatWith(null); load(); }} />;

  const friends = data?.friends ?? [];
  const incoming = invites.incoming;
  const outgoing = invites.outgoing;

  return (
    <div className="screen fade">
      <Hero>
        <div className="eyebrow">ДРУЗЬЯ</div>
        <h1 className="display" style={{ fontSize: 26, margin: "6px 0 0" }}>Твоя сеть</h1>
      </Hero>

      {/* Мой код */}
      <Card accent>
        <div className="eyebrow">Мой код приглашения</div>
        <div className="row between" style={{ marginTop: 10 }}>
          <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "var(--display)", letterSpacing: ".06em" }}>{data?.code}</div>
          <Btn kind="ghost" onClick={copyCode} style={{ width: "auto", padding: "8px 14px", fontSize: 13 }}>Копировать</Btn>
        </div>
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 8 }}>Поделись кодом, чтобы добавить друга</div>
      </Card>

      {/* Табы */}
      <div className="row" style={{ gap: 6, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: 4, margin: "16px 0" }}>
        {([["friends", `Друзья${friends.length ? ` · ${friends.length}` : ""}`], ["invites", `Приглашения${incoming.length ? ` · ${incoming.length}` : ""}`]] as const).map(([t, label]) => (
          <button key={t} onClick={() => { haptic(); setTab(t); }}
            style={{ flex: 1, border: 0, borderRadius: 11, padding: "9px 0", fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: tab === t ? "var(--card)" : "transparent", color: tab === t ? "var(--ink)" : "var(--muted)", boxShadow: tab === t ? "var(--shadow)" : "none" }}>
            {label}
          </button>
        ))}
      </div>

      {tab === "friends" && (
        friends.length > 0 ? (
          <>
            {friends.map(f => (
              <Card key={f.id} className="glass" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, marginBottom: 10, gap: 10 }}>
                <div className="row" style={{ gap: 12, minWidth: 0, flex: 1 }}>
                  <Avatar f={f} size={44} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{f.first_name}</div>
                    {f.last_message ? (
                      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
                        <span style={{ fontSize: 12.5, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                          {f.last_message_mine ? "Вы: " : ""}{f.last_message}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--faint)", flexShrink: 0 }}>· {timeAgo(f.last_message_at!)}</span>
                      </div>
                    ) : f.username ? (
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>@{f.username}</div>
                    ) : null}
                  </div>
                </div>
                <button onClick={() => { haptic(); setChatWith(f); }}
                  style={{ position: "relative", flexShrink: 0, padding: "8px 16px", fontSize: 13, fontWeight: 600, border: "1px solid var(--line)", borderRadius: 10, background: "var(--surface)", cursor: "pointer", color: "var(--ink)" }}>
                  Чат
                  {f.unread > 0 && <span style={{ position: "absolute", top: -6, right: -6, minWidth: 18, height: 18, padding: "0 5px", borderRadius: 9, background: "var(--accent)", color: "var(--accent-ink)", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{f.unread}</span>}
                </button>
              </Card>
            ))}
            <Btn kind="accent" onClick={() => setShowAdd(true)} style={{ width: "100%", marginTop: 6 }}>Добавить друга</Btn>
          </>
        ) : (
          <Card className="glass" style={{ textAlign: "center", padding: "36px 24px" }}>
            <div style={{ width: 56, height: 56, borderRadius: 18, background: "var(--accent-soft)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></svg>
            </div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Пока нет друзей</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 18 }}>Добавь друга по коду, чтобы тренироваться вместе и переписываться</div>
            <Btn kind="accent" onClick={() => setShowAdd(true)}>Добавить друга</Btn>
          </Card>
        )
      )}

      {tab === "invites" && (
        <>
          {incoming.length === 0 && outgoing.length === 0 && (
            <Card className="glass" style={{ textAlign: "center", padding: "36px 24px" }}>
              <div style={{ width: 56, height: 56, borderRadius: 18, background: "var(--surface)", color: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16v12H4z" /><path d="M4 7l8 6 8-6" /></svg>
              </div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Нет приглашений</div>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>Здесь появятся входящие и отправленные приглашения</div>
            </Card>
          )}
          {incoming.length > 0 && <div className="eyebrow" style={{ marginBottom: 10 }}>Входящие</div>}
          {incoming.map(i => (
            <Card key={i.invite_id} className="glass" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, marginBottom: 10 }}>
              <div className="row" style={{ gap: 12 }}>
                <Avatar f={i.user} size={44} />
                <div>
                  <div style={{ fontWeight: 600 }}>{i.user.first_name}</div>
                  {i.user.username && <div style={{ fontSize: 12, color: "var(--muted)" }}>@{i.user.username}</div>}
                </div>
              </div>
              <div className="row" style={{ gap: 6 }}>
                <button onClick={() => decline(i.invite_id)} aria-label="Отклонить" style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--muted)", cursor: "pointer", fontSize: 16 }}>✕</button>
                <button onClick={() => accept(i.invite_id)} aria-label="Принять" style={{ width: 38, height: 38, borderRadius: 10, border: 0, background: "var(--accent)", color: "var(--accent-ink)", cursor: "pointer", fontSize: 16 }}>✓</button>
              </div>
            </Card>
          ))}
          {outgoing.length > 0 && <div className="eyebrow" style={{ margin: "16px 0 10px" }}>Отправленные</div>}
          {outgoing.map(i => (
            <Card key={i.invite_id} className="glass" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, marginBottom: 10 }}>
              <div className="row" style={{ gap: 12 }}>
                <Avatar f={i.user} size={44} />
                <div>
                  <div style={{ fontWeight: 600 }}>{i.user.first_name}</div>
                  {i.user.username && <div style={{ fontSize: 12, color: "var(--muted)" }}>@{i.user.username}</div>}
                </div>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Ожидает</div>
            </Card>
          ))}
          <Btn kind="ghost" onClick={() => setShowAdd(true)} style={{ width: "100%", marginTop: 6 }}>Добавить друга</Btn>
        </>
      )}

      {/* Добавить друга — bottom sheet */}
      {showAdd && (
        <div onClick={() => setShowAdd(false)} style={{ position: "fixed", inset: 0, background: "var(--sheet-scrim)", display: "flex", alignItems: "flex-end", zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, margin: "0 auto", background: "var(--bg)", borderRadius: "20px 20px 0 0", padding: 24, paddingBottom: "calc(24px + var(--safe-b))", animation: "rise .3s ease" }}>
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 700 }}>Добавить друга</h2>
              <p style={{ margin: 0, fontSize: 14, color: "var(--muted)" }}>Введи код приглашения друга</p>
            </div>
            <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="AI-XXXXXX" autoFocus
              onKeyDown={e => e.key === "Enter" && addFriend()}
              style={{ width: "100%", textAlign: "center", fontSize: 20, fontWeight: 700, letterSpacing: ".08em", fontFamily: "var(--display)", marginBottom: 16 }} />
            <div className="row" style={{ gap: 10 }}>
              <Btn kind="ghost" onClick={() => setShowAdd(false)} style={{ flex: 1 }}>Отмена</Btn>
              <Btn kind="accent" onClick={addFriend} disabled={!code.trim() || adding} style={{ flex: 1 }}>{adding ? "…" : "Добавить"}</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: "calc(90px + var(--safe-b))", display: "flex", justifyContent: "center", zIndex: 200, pointerEvents: "none" }}>
          <div style={{ background: "var(--ink)", color: "var(--ink-contrast)", padding: "10px 18px", borderRadius: 12, fontSize: 14, fontWeight: 500, maxWidth: "80%", textAlign: "center", boxShadow: "var(--shadow-lg)" }}>{toast}</div>
        </div>
      )}
    </div>
  );
}

// Карточка тренировки внутри сообщения (kind === "workout_share").
function WorkoutShareCard({ p, mine }: { p: { title: string; exercises_total: number; duration_sec: number }; mine: boolean }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: 14, maxWidth: 260,
      background: mine ? "color-mix(in srgb, var(--ink) 92%, var(--accent))" : "var(--card)",
      border: mine ? "none" : "1px solid var(--line)", borderRadius: 16,
      borderBottomRightRadius: mine ? 6 : 16, borderBottomLeftRadius: mine ? 16 : 6,
      boxShadow: mine ? "none" : "var(--shadow)",
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
        background: mine ? "rgba(255,255,255,.14)" : "var(--accent-soft)", color: mine ? "#fff" : "var(--accent)",
      }}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5l11 11" /><path d="M4 8l2.5-2.5L9 8l-2.5 2.5z" /><path d="M15 15l2.5-2.5L20 15l-2.5 2.5z" /><path d="M4 4l2 2M18 18l2 2" /></svg>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: mine ? "#fff" : "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</div>
        <div style={{ fontSize: 12.5, color: mine ? "rgba(255,255,255,.75)" : "var(--muted)", marginTop: 2 }}>{p.exercises_total} упражнений · {fmtMin(p.duration_sec)}</div>
      </div>
    </div>
  );
}

// --- Личный чат с другом (polling каждые 3 с) ---
function Chat({ friend, onBack }: { friend: FriendBrief; onBack: () => void }) {
  const [msgs, setMsgs] = useState<FriendMsg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [sessions, setSessions] = useState<RecentSession[] | null>(null);
  const [sharing, setSharing] = useState<number | null>(null);
  const lastId = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const bump = (list: FriendMsg[]) => { if (list.length) lastId.current = Math.max(lastId.current, ...list.map(m => m.id)); };

  useEffect(() => {
    let alive = true;
    (async () => {
      try { const m = await api.friendMessages(friend.id); if (alive) { setMsgs(m); bump(m); } }
      catch {} finally { if (alive) setLoading(false); }
    })();
    const poll = setInterval(async () => {
      try {
        const m = await api.friendMessages(friend.id, lastId.current);
        if (alive && m.length) { setMsgs(prev => [...prev, ...m]); bump(m); }
      } catch {}
    }, 3000);
    return () => { alive = false; clearInterval(poll); };
  }, [friend.id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setText(""); setSending(true);
    try { const m = await api.friendSend(friend.id, t); setMsgs(prev => [...prev, m]); bump([m]); }
    catch { setText(t); } finally { setSending(false); }
  };

  const openShare = async () => {
    haptic();
    setShowShare(true);
    if (sessions === null) {
      try { setSessions(await api.recentSessions(10)); } catch { setSessions([]); }
    }
  };
  const shareWorkout = async (sessionId: number) => {
    if (sharing) return;
    setSharing(sessionId);
    try {
      const m = await api.shareWorkout(friend.id, sessionId);
      setMsgs(prev => [...prev, m]); bump([m]);
      setShowShare(false);
    } catch { /* тихо игнорируем — пользователь может попробовать ещё раз */ }
    finally { setSharing(null); }
  };

  return (
    <div className="screen no-nav" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* paddingRight резервирует место под глобальный плеер (MusicWidget), который по умолчанию
          сидит в правом верхнем углу — иначе имя друга уходит под него и обрезается. */}
      <div className="row between" style={{ marginBottom: 8, paddingRight: 64 }}>
        <IconBtn onClick={onBack} aria-label="Назад">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </IconBtn>
        <div className="row" style={{ gap: 8, minWidth: 0 }}>
          <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 130 }}>{friend.first_name}</span>
          <Avatar f={friend} size={32} />
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, padding: "12px 0 calc(84px + var(--safe-b))" }}>
        {loading ? <div style={{ color: "var(--muted)", textAlign: "center", marginTop: 20 }}>Загрузка…</div>
          : msgs.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--muted)", marginTop: 40 }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Начните переписку</div>
              <div style={{ fontSize: 13 }}>Напишите {friend.first_name} первое сообщение</div>
            </div>
          ) : msgs.map(m => (
            <div key={m.id} style={{ display: "flex", justifyContent: m.from_me ? "flex-end" : "flex-start" }}>
              {m.kind === "workout_share" && m.payload
                ? <WorkoutShareCard p={m.payload} mine={m.from_me} />
                : <div className={`bubble ${m.from_me ? "user" : "ai"}`}>{m.text}</div>}
            </div>
          ))}
        <div ref={endRef} />
      </div>
      {/* position:fixed (не sticky) — тот же приём, что и у нижней навигации (.nav):
          на Android при появлении клавиатуры sticky-элемент внутри flex-колонки может
          "уехать" за пределы видимой (сжатой клавиатурой) области. fixed относительно
          viewport работает предсказуемо и здесь уже проверено на .nav. */}
      <div className="row" style={{ position: "fixed", left: 0, right: 0, bottom: 0, maxWidth: 480, margin: "0 auto", background: "var(--glass-bg)", WebkitBackdropFilter: "blur(var(--glass-blur))", backdropFilter: "blur(var(--glass-blur))", borderTop: "1px solid var(--glass-border)", padding: "10px 18px calc(10px + var(--safe-b))", gap: 8, zIndex: 60 }}>
        <IconBtn onClick={openShare} aria-label="Поделиться тренировкой" style={{ width: 52, height: 52 }}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5l11 11" /><path d="M4 8l2.5-2.5L9 8l-2.5 2.5z" /><path d="M15 15l2.5-2.5L20 15l-2.5 2.5z" /><path d="M4 4l2 2M18 18l2 2" /></svg>
        </IconBtn>
        <input placeholder="Сообщение…" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
          style={{ flex: 1, minWidth: 0 }} />
        <button className="btn accent sm" style={{ height: 52, width: 52 }} onClick={send} disabled={sending || !text.trim()}>→</button>
      </div>

      {/* Поделиться тренировкой — bottom sheet */}
      {showShare && (
        <div onClick={() => setShowShare(false)} style={{ position: "fixed", inset: 0, background: "var(--sheet-scrim)", display: "flex", alignItems: "flex-end", zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, margin: "0 auto", background: "var(--bg)", borderRadius: "20px 20px 0 0", padding: 24, paddingBottom: "calc(24px + var(--safe-b))", maxHeight: "70vh", overflowY: "auto", animation: "rise .3s ease" }}>
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 700 }}>Поделиться тренировкой</h2>
              <p style={{ margin: 0, fontSize: 14, color: "var(--muted)" }}>Выбери завершённую тренировку</p>
            </div>
            {sessions === null ? (
              <div style={{ color: "var(--muted)", textAlign: "center", padding: "20px 0" }}>Загрузка…</div>
            ) : sessions.length === 0 ? (
              <div style={{ color: "var(--muted)", textAlign: "center", padding: "20px 0" }}>Пока нет завершённых тренировок</div>
            ) : (
              <div className="stack">
                {sessions.map(s => (
                  <button key={s.id} onClick={() => shareWorkout(s.id)} disabled={sharing !== null}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", textAlign: "left", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14, padding: "12px 14px", cursor: sharing !== null ? "default" : "pointer", opacity: sharing !== null && sharing !== s.id ? 0.5 : 1 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{s.title}</div>
                      <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>{s.exercises_total} упражнений · {fmtMin(s.duration_sec)}</div>
                    </div>
                    <span style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>{sharing === s.id ? "…" : "Отправить"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
