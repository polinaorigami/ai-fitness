// Обёртка над Telegram WebApp SDK. Вне Telegram — безопасные заглушки для разработки.
declare global { interface Window { Telegram?: any } }
export const tg = window.Telegram?.WebApp;
export const inTelegram = Boolean(tg?.initData);
export function initTelegram() {
  if (!tg) return;
  tg.ready(); tg.expand();
  tg.setHeaderColor?.("#F7F7F5"); tg.setBackgroundColor?.("#F7F7F5");
  tg.disableVerticalSwipes?.();
}
export const tgUser = () => tg?.initDataUnsafe?.user as { id: number; first_name: string; username?: string; photo_url?: string } | undefined;
export const haptic = (t: "light" | "medium" | "heavy" = "light") => tg?.HapticFeedback?.impactOccurred(t);
export const notify = (t: "success" | "error" | "warning") => tg?.HapticFeedback?.notificationOccurred(t);
export const openLink = (url: string) => (tg ? tg.openLink(url) : window.open(url, "_blank"));
export const tzOffset = () => -new Date().getTimezoneOffset();
