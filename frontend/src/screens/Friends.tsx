import { useState } from "react";
import { Btn, Card } from "../components/UI";
import { User } from "../api";

interface Friend {
  id: number;
  first_name: string;
  username?: string;
  photo_url?: string;
  status: "active" | "pending";
}

export default function Friends({ user }: { user: User }) {
  const [friends, setFriends] = useState<Friend[]>([
    { id: 1, first_name: "Полина", username: "polinapeiv", photo_url: "https://via.placeholder.com/44", status: "active" },
    { id: 2, first_name: "Иван", username: "ivan_fit", photo_url: "https://via.placeholder.com/44", status: "active" },
  ]);
  const [inviteCode, setInviteCode] = useState("");
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [activeTab, setActiveTab] = useState<"friends" | "workouts" | "invites">("friends");

  const friendCode = `AI-${user.id.toString().padStart(6, "0")}`;

  const copyCode = () => {
    navigator.clipboard.writeText(friendCode);
    alert("Код скопирован!");
  };

  const addFriend = async () => {
    if (!inviteCode.trim()) return;
    // API call would go here
    setInviteCode("");
    setShowAddFriend(false);
    alert("Приглашение отправлено!");
  };

  return (
    <div className="screen fade">
      <div className="row between">
        <div>
          <div className="eyebrow">ВМЕСТЕ</div>
          <h1 className="display" style={{ fontSize: 26 }}>Твоя сеть 👥</h1>
        </div>
      </div>

      {/* Мой код */}
      <Card accent>
        <div className="eyebrow">Мой код приглашения</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, gap: 12 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "var(--display)", letterSpacing: ".04em" }}>{friendCode}</div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>Поделись с друзьями</div>
          </div>
          <Btn kind="ghost" onClick={copyCode} style={{ width: "auto", padding: "8px 12px", fontSize: 13 }}>Копировать</Btn>
        </div>
      </Card>

      {/* Табы */}
      <div className="row" style={{ gap: 6, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: 4, marginBottom: 16 }}>
        {(["friends", "workouts", "invites"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              border: 0,
              borderRadius: 11,
              padding: "9px 0",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              background: activeTab === tab ? "var(--card)" : "transparent",
              color: activeTab === tab ? "var(--ink)" : "var(--muted)",
              boxShadow: activeTab === tab ? "var(--shadow)" : "none",
              transition: "all .2s"
            }}
          >
            {tab === "friends" && `Друзья (${friends.length})`}
            {tab === "workouts" && "Тренировки"}
            {tab === "invites" && "Приглашения"}
          </button>
        ))}
      </div>

      {/* Friends Tab */}
      {activeTab === "friends" && (
        <>
          {friends.length > 0 ? (
            <div style={{ marginBottom: 20 }}>
              {friends.map((friend, i) => (
                <Card
                  key={friend.id}
                  className="toggle"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: 12,
                    marginBottom: 10,
                    animation: `slideInUp 0.4s ease ${i * 0.1}s both`,
                  }}
                >
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    {friend.photo_url && <img src={friend.photo_url} style={{ width: 40, height: 40, borderRadius: 12 }} alt={friend.first_name} />}
                    <div>
                      <div style={{ fontWeight: 600 }}>{friend.first_name}</div>
                      {friend.username && <div style={{ fontSize: 12, color: "var(--muted)" }}>@{friend.username}</div>}
                    </div>
                  </div>
                  <button
                    style={{
                      padding: "6px 12px",
                      fontSize: 12,
                      fontWeight: 600,
                      border: "1px solid var(--line)",
                      borderRadius: 8,
                      background: "var(--surface)",
                      cursor: "pointer",
                      color: "var(--ink)",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "var(--surface)")}
                  >
                    Чат
                  </button>
                </Card>
              ))}
            </div>
          ) : (
            <Card style={{ textAlign: "center", padding: 32, animation: "slideInUp 0.4s ease both" }}>
              <div style={{ fontSize: 48, marginBottom: 12, animation: "bounce 0.6s ease" }}>👫</div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Ещё нет друзей</div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>Пригласи друзей, чтобы тренироваться вместе</div>
            </Card>
          )}
          <Btn kind="accent" onClick={() => setShowAddFriend(true)} style={{ width: "100%", marginTop: 10 }}>
            + Добавить друга
          </Btn>
          <style>{`
            @keyframes slideInUp {
              from {
                opacity: 0;
                transform: translateY(20px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            @keyframes bounce {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.1); }
            }
          `}</style>
        </>
      )}

      {/* Workouts Tab */}
      {activeTab === "workouts" && (
        <Card style={{ textAlign: "center", padding: 32, animation: "slideInUp 0.4s ease both" }}>
          <div style={{ fontSize: 48, marginBottom: 12, animation: "bounce 0.6s ease" }}>🏋️</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Пока нет совместных тренировок</div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>Скоро сможешь тренироваться с друзьями вместе</div>
        </Card>
      )}

      {/* Invites Tab */}
      {activeTab === "invites" && (
        <Card style={{ textAlign: "center", padding: 32, animation: "slideInUp 0.4s ease both" }}>
          <div style={{ fontSize: 48, marginBottom: 12, animation: "bounce 0.6s ease 0.1s" }}>📬</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Нет приглашений</div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>Когда друзья пришлют приглашения, появятся здесь</div>
        </Card>
      )}

      {/* Add Friend Modal */}
      {showAddFriend && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "var(--sheet-scrim)",
          display: "flex",
          alignItems: "flex-end",
          zIndex: 100,
          padding: 18
        }}>
          <div style={{
            width: "100%",
            maxWidth: "480px",
            background: "var(--bg)",
            borderRadius: "20px 20px 0 0",
            padding: 24,
            paddingTop: 20,
            animation: "rise .3s ease"
          }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700 }}>Добавить друга</h2>
              <p style={{ margin: 0, fontSize: 14, color: "var(--muted)" }}>Введи код приглашения</p>
            </div>
            <input
              type="text"
              placeholder="AI-XXXXXX"
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value.toUpperCase())}
              style={{
                width: "100%",
                padding: "14px 16px",
                marginBottom: 16,
                border: "1px solid var(--line)",
                borderRadius: 12,
                fontSize: 16,
                fontFamily: "var(--body)",
                background: "var(--card)",
                color: "var(--ink)"
              }}
              autoFocus
            />
            <div style={{ display: "flex", gap: 10 }}>
              <Btn kind="ghost" onClick={() => setShowAddFriend(false)} style={{ flex: 1 }}>Отмена</Btn>
              <Btn kind="accent" onClick={addFriend} style={{ flex: 1 }} disabled={!inviteCode.trim()}>Добавить</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
