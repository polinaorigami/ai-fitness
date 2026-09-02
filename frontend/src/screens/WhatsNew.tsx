import { Btn } from "../components/UI";
import { api, WhatsNewData } from "../api";

export default function WhatsNew({ data, onNext }: { data: WhatsNewData; onNext: () => void }) {
  const finish = async () => {
    try { await api.whatsnewSeen(); } catch {}
    onNext();
  };

  return (
    <div className="screen no-nav rise">
      <div className="row between" style={{ alignItems: "center" }}>
        <div className="eyebrow">AI FITNESS · ЧТО НОВОГО</div>
        <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>Версия {data.version}</div>
      </div>
      <h1 className="display" style={{ fontSize: 34, marginTop: 10 }}>{data.title}</h1>
      <div style={{ height: 10 }} />
      <div className="stack" style={{ gap: 12, marginBottom: 32 }}>
        {data.items.map((it, i) => (
          <div key={i} style={{ display: "flex", gap: 12 }}>
            <div style={{ fontSize: 20 }}>{it.icon}</div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{it.title}</div>
              <div style={{ fontSize: 14, color: "var(--muted)" }}>{it.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <Btn kind="accent" onClick={finish} style={{ width: "100%" }}>
        Понятно
      </Btn>
    </div>
  );
}
