// Настройка нижней навигации: какие вкладки показывать и в каком порядке.
// Хранится локально на устройстве (localStorage).
const NAV_KEY = "aifitness_nav_order";

export type NavId = "home" | "workout" | "schedule" | "progress" | "friends" | "mind" | "achievements" | "profile";

export const NAV_ITEMS: { id: NavId; label: string }[] = [
  { id: "home", label: "Сегодня" },
  { id: "workout", label: "Тренировки" },
  { id: "schedule", label: "Расписание" },
  { id: "progress", label: "Прогресс" },
  { id: "friends", label: "Вместе" },
  { id: "mind", label: "Mind" },
  { id: "achievements", label: "Достижения" },
  { id: "profile", label: "Профиль" },
];

const DEFAULT_VISIBLE: NavId[] = ["home", "workout", "friends", "mind", "profile"];

export function getNavOrder(): NavId[] {
  try {
    const raw = localStorage.getItem(NAV_KEY);
    if (raw) {
      const ids = JSON.parse(raw) as NavId[];
      const valid = ids.filter(id => NAV_ITEMS.some(n => n.id === id));
      if (valid.length) return valid.includes("profile") ? valid : [...valid, "profile"];
    }
  } catch {}
  return DEFAULT_VISIBLE;
}

export function setNavOrder(ids: NavId[]) {
  const safe = ids.includes("profile") ? ids : [...ids, "profile"];
  try { localStorage.setItem(NAV_KEY, JSON.stringify(safe)); } catch {}
}
