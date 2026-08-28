// Обёртка над Telegram WebApp SDK. Вне Telegram — безопасные заглушки для разработки.
declare global { interface Window { Telegram?: any } }
export const tg = window.Telegram?.WebApp;
export const inTelegram = Boolean(tg?.initData);

const LIGHT_BG = "#F7F7F5";
const DARK_BG = "#121214";

function currentScheme(): "light" | "dark" {
  if (tg?.colorScheme === "dark" || tg?.colorScheme === "light") return tg.colorScheme;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
function applyTelegramTheme() {
  const scheme = currentScheme();
  document.documentElement.dataset.theme = scheme;
  const bg = scheme === "dark" ? DARK_BG : LIGHT_BG;
  tg?.setHeaderColor?.(bg); tg?.setBackgroundColor?.(bg);
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
