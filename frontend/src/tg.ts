// Обёртка над Telegram WebApp SDK. Вне Telegram — безопасные заглушки для разработки.
declare global { interface Window { Telegram?: any } }
export const tg = window.Telegram?.WebApp;
export const inTelegram = Boolean(tg?.initData);

const LIGHT_BG = "#F7F7F5";
const DARK_BG = "#0B0B0D";

// Режим темы, который выбрал пользователь. "system" — следовать за Telegram/системой,
// иначе принудительно светлая/тёмная. Хранится локально на устройстве.
const MODE_KEY = "aifitness_theme_mode";
export type ThemeMode = "system" | "light" | "dark";

export function getMode(): ThemeMode {
  try { return (localStorage.getItem(MODE_KEY) as ThemeMode) || "system"; } catch { return "system"; }
}

function currentScheme(): "light" | "dark" {
  if (tg?.colorScheme === "dark" || tg?.colorScheme === "light") return tg.colorScheme;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
function resolvedScheme(): "light" | "dark" {
  const m = getMode();
  return m === "system" ? currentScheme() : m;
}
function applyTelegramTheme() {
  const scheme = resolvedScheme();
  document.documentElement.dataset.theme = scheme;
  const bg = scheme === "dark" ? DARK_BG : LIGHT_BG;
  tg?.setHeaderColor?.(bg); tg?.setBackgroundColor?.(bg);
}

// Сменить режим темы (вызывается из настроек профиля).
export function setMode(m: ThemeMode) {
  try { localStorage.setItem(MODE_KEY, m); } catch {}
  applyTelegramTheme();
}

export function initTelegram() {
  applyTelegramTheme();
  if (!tg) {
    window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", applyTelegramTheme);
    return;
  }
  tg.ready(); tg.expand();
  tg.onEvent?.("themeChanged", applyTelegramTheme);
  tg.disableVerticalSwipes?.();
}
export const tgUser = () => tg?.initDataUnsafe?.user as { id: number; first_name: string; username?: string; photo_url?: string } | undefined;
export const haptic = (t: "light" | "medium" | "heavy" = "light") => tg?.HapticFeedback?.impactOccurred(t);
export const notify = (t: "success" | "error" | "warning") => tg?.HapticFeedback?.notificationOccurred(t);
export const openLink = (url: string) => (tg ? tg.openLink(url) : window.open(url, "_blank"));
export const tzOffset = () => -new Date().getTimezoneOffset();
