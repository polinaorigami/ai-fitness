// Смена акцентного цвета приложения. Хранится локально на устройстве (localStorage).
// Оттенки (soft/strong) считаются в CSS через color-mix, поэтому здесь задаём только сам акцент —
// и он корректно работает и в светлой, и в тёмной теме.
const THEME_KEY = "aifitness_theme_accent";

export const THEME_PRESETS: { id: string; label: string; accent: string }[] = [
  { id: "pink", label: "Розовый", accent: "#FF4D8D" },
  { id: "coral", label: "Коралловый", accent: "#FF6B5E" },
  { id: "violet", label: "Фиолетовый", accent: "#8B5CF6" },
  { id: "blue", label: "Синий", accent: "#3B82F6" },
  { id: "green", label: "Зелёный", accent: "#22C08B" },
  { id: "amber", label: "Янтарный", accent: "#F5A524" },
];

const DEFAULT = "pink";

export function applyTheme(id: string) {
  const t = THEME_PRESETS.find(p => p.id === id) || THEME_PRESETS[0];
  document.documentElement.style.setProperty("--accent", t.accent);
}

export function getTheme(): string {
  try { return localStorage.getItem(THEME_KEY) || DEFAULT; } catch { return DEFAULT; }
}

export function setTheme(id: string) {
  try { localStorage.setItem(THEME_KEY, id); } catch {}
  applyTheme(id);
}

export function initTheme() { applyTheme(getTheme()); }
