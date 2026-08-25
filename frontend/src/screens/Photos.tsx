import { useRef, useState } from "react";
import { Btn, Err } from "../components/UI";
import { api } from "../api";

export default function Photos({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<{ f: File; url: string }[]>([]);
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const add = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []).slice(0, 3 - files.length);
    setFiles([...files, ...list.map(f => ({ f, url: URL.createObjectURL(f) }))]);
  };
  const go = async () => {
    setBusy(true); setErr("");
    try { for (const x of files) await api.uploadPhoto(x.f, "profile"); onDone(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="screen no-nav fade">
      <div className="eyebrow">Шаг 9</div>
      <h1 className="display">СОЗДАЙ СВОЙ ПРОФИЛЬ</h1>
      <p className="sub">Загрузи фотографию, чтобы AI мог персонализировать тренировочную стратегию.</p>
      <div className="card">
        <div className="eyebrow" style={{ marginBottom: 10 }}>Для лучшего анализа</div>
        <div className="stack" style={{ fontSize: 15 }}><div>• полный рост</div><div>• хорошее освещение</div><div>• нейтральная поза</div><div>• камера примерно на уровне тела</div></div>
        <div style={{ marginTop: 12, fontSize: 13, color: "var(--muted)" }}>Рекомендуется: спереди, сбоку, сзади. Минимум — одна фотография.</div>
      </div>
      <div className="grid2" style={{ gridTemplateColumns: "repeat(3,1fr)", marginBottom: 14 }}>
        {files.map((x, i) => <img key={i} src={x.url} style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", borderRadius: 16 }} />)}
      </div>
      <input ref={ref} type="file" accept="image/*" multiple hidden onChange={add} />
      <div className="stack">
        {files.length < 3 && <Btn kind="ghost" onClick={() => ref.current?.click()}>{files.length ? "Добавить ещё" : "Загрузить фото"}</Btn>}
        {err && <Err e={err} />}
        <Btn kind="accent" disabled={!files.length || busy} onClick={go}>{busy ? "Загружаем…" : "Продолжить"}</Btn>
        <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center" }}>Фото хранятся только на нашем сервере, не передаются сторонним сервисам и не используются для обучения моделей. Удалить их можно в профиле.</div>
      </div>
    </div>
  );
}
