import { Btn } from "../components/UI";
export default function Welcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="screen no-nav fade" style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", minHeight: "100vh" }}>
      <div className="eyebrow">AI FITNESS</div>
      <h1 className="display" style={{ fontSize: 48, marginTop: 14 }}>ТВОЙ<br />AI-ТРЕНЕР</h1>
      <p className="sub" style={{ fontSize: 18, marginBottom: 40 }}>Персональные тренировки, адаптированные под тебя.</p>
      <Btn kind="accent" onClick={onNext}>Начать</Btn>
    </div>
  );
}
