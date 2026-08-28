// Смена акцентного цвета приложения. Хранится локально на устройстве (localStorage).
const THEME_KEY = "aifitness_theme_accent";

export const THEME_PRESETS: { id: string; label: string; accent: string; soft: string }[] = [
  { id: "blue", label: "Синий", accent: "#2F5BFF", soft: "#E9EEFF" },
  { id: "green", label: "Зелёный", accent: "#1DB367", soft: "#E3F7ED" },
  { id: "orange", label: "Оранжевый", accent: "#FF7A1A", soft: "#FFEEE0" },
  { id: "purple", label: "Фиолетовый", accent: "#7C4DFF", soft: "#EFE8FF" },
  { id: "pink", label: "Розовый", accent: "#FF4D8D", soft: "#FFE6EE" },
  { id: "black", label: "Чёрный", accent: "#0B0B0C", soft: "#EDEDED" },
];

export function applyTheme(id: string) {
  const t = THEME_PRESETS.find(p => p.id === id) || THEME_PRESETS[0];
  document.documentElement.style.setProperty("--accent", t.accent);
  document.documentElement.style.setProperty("--accent-soft", t.soft);
}

export function getTheme(): string {
  try { return localStorage.getItem(THEME_KEY) || "blue"; } catch { return "blue"; }
}

export function setTheme(id: string) {
  try { localStorage.setItem(THEME_KEY, id); } catch {}
  applyTheme(id);
}

export function initTheme() { applyTheme(getTheme()); }
