// Анатомическая карта тела: силуэт, где подсвечивается выбранная мышечная зона.
// Заменяет случайные emoji (🦅, 🍑) на понятную визуальную структуру.

export type ZoneKey = "full" | "chest" | "back" | "arms" | "abs" | "glutes" | "legs";

export const ZONE_LABELS: [ZoneKey, string][] = [
  ["full", "Всё тело"],
  ["chest", "Грудь"],
  ["back", "Спина"],
  ["arms", "Руки"],
  ["abs", "Пресс"],
  ["glutes", "Ягодицы"],
  ["legs", "Ноги"],
];

// какие регионы силуэта подсвечивать для каждой зоны
const REGIONS: Record<ZoneKey, string[]> = {
  full: ["head", "torso", "armL", "armR", "legL", "legR"],
  chest: ["chest"],
  back: ["backL", "backR"],
  arms: ["armL", "armR"],
  abs: ["abs"],
  glutes: ["hips"],
  legs: ["legL", "legR"],
};

export function BodyMap({ zone, size = 130 }: { zone: ZoneKey; size?: number }) {
  const active = new Set(REGIONS[zone] || []);
  const base = "var(--surface)";
  const line = "var(--line)";
  const hl = "var(--accent)";
  const on = (id: string) => (active.has(id) ? hl : base);
  const full = zone === "full";

  return (
    <svg viewBox="0 0 120 220" width={size} height={size * (220 / 120)} style={{ display: "block", margin: "0 auto" }}>
      {/* контур тела (заливка = базовый цвет или акцент для «всё тело») */}
      <g stroke={line} strokeWidth="1.5">
        {/* голова */}
        <circle cx="60" cy="20" r="13" fill={full ? hl : base} />
        {/* шея */}
        <rect x="54" y="31" width="12" height="8" fill={full ? hl : base} />
        {/* торс */}
        <path d="M40 40 h40 a6 6 0 0 1 6 6 l-3 46 a4 4 0 0 1-4 4 H41 a4 4 0 0 1-4-4 l-3-46 a6 6 0 0 1 6-6 Z" fill={full ? hl : base} />
        {/* руки */}
        <path d="M40 41 l-11 4 -6 40 a4 4 0 0 0 7 2 l10-38 Z" fill={on("armL")} />
        <path d="M80 41 l11 4 6 40 a4 4 0 0 1-7 2 l-10-38 Z" fill={on("armR")} />
        {/* ноги */}
        <path d="M42 98 h16 l-2 76 a5 5 0 0 1-10 0 l-4-72 Z" fill={on("legL")} />
        <path d="M78 98 h-16 l2 76 a5 5 0 0 0 10 0 l4-72 Z" fill={on("legR")} />
      </g>
      {/* подсвечиваемые мышечные группы поверх торса */}
      <g stroke="none">
        {/* грудь */}
        <path d="M44 46 h32 l-2 16 a3 3 0 0 1-3 3 H49 a3 3 0 0 1-3-3 Z" fill={on("chest")} opacity={active.has("chest") ? 1 : 0} />
        {/* пресс */}
        <rect x="50" y="66" width="20" height="26" rx="4" fill={on("abs")} opacity={active.has("abs") ? 1 : 0} />
        {/* спина (верх торса по бокам) */}
        <path d="M44 46 h14 v40 h-11 a3 3 0 0 1-3-3 Z" fill={on("backL")} opacity={active.has("backL") ? 1 : 0} />
        <path d="M76 46 h-14 v40 h11 a3 3 0 0 0 3-3 Z" fill={on("backR")} opacity={active.has("backR") ? 1 : 0} />
        {/* бёдра/ягодицы */}
        <path d="M41 92 h38 l-1 12 H42 Z" fill={on("hips")} opacity={active.has("hips") ? 1 : 0} />
      </g>
    </svg>
  );
}
