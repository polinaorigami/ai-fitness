import { Btn } from "../components/UI";

export default function WhatsNew({ onNext }: { onNext: () => void }) {
  return (
    <div className="screen no-nav rise">
      <div className="eyebrow">AI FITNESS</div>
      <h1 className="display" style={{ fontSize: 40 }}>
        Что нового в<br />
        <span style={{ color: "var(--accent)" }}>AI Fitness</span>
      </h1>
      <p className="sub" style={{ marginBottom: 24 }}>
        Мы обновили интерфейс, чтобы тренировки были ещё удобнее. Новый дизайн, улучшенная навигация и персональные рекомендации.
      </p>
      <div className="stack" style={{ gap: 12, marginBottom: 32 }}>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ fontSize: 20 }}>✨</div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Премиальный дизайн</div>
            <div style={{ fontSize: 14, color: "var(--muted)" }}>Современный интерфейс с новой типографией и цветовой палитрой</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ fontSize: 20 }}>🎨</div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Выбор тем</div>
            <div style={{ fontSize: 14, color: "var(--muted)" }}>Переключайтесь между светлой и тёмной темой, выбирайте любимый цвет акцента</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ fontSize: 20 }}>⚡</div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Быстрее и удобнее</div>
            <div style={{ fontSize: 14, color: "var(--muted)" }}>Оптимизированная навигация и улучшенный опыт использования</div>
          </div>
        </div>
      </div>
      <Btn kind="accent" onClick={onNext} style={{ width: "100%" }}>
        Начать
      </Btn>
    </div>
  );
}
