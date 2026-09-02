// Настройка «Быстрых действий» на главном экране: какие показывать и в каком порядке.
// Хранится локально на устройстве (localStorage). В отличие от нижней навигации (navPrefs.ts),
// здесь можно скрыть вообще все — обязательных пунктов нет.
const QA_KEY = "aifitness_quick_actions";

export type QuickActionId = "friends" | "stretch" | "meditation" | "breathing" | "music" | "workout" | "schedule" | "progress" | "achievements";

export const QUICK_ACTION_ITEMS: { id: QuickActionId; label: string; icon: string }[] = [
  { id: "friends", label: "Вместе", icon: "friends" },
  { id: "stretch", label: "Растяжка", icon: "stretch" },
  { id: "meditation", label: "Медитация", icon: "meditation" },
  { id: "breathing", label: "Дыхание", icon: "breathing" },
  { id: "music", label: "Музыка", icon: "music" },
  { id: "workout", label: "Тренировки", icon: "workout" },
  { id: "schedule", label: "Расписание", icon: "schedule" },
  { id: "progress", label: "Прогресс", icon: "progress" },
  { id: "achievements", label: "Достижения", icon: "achievements" },
];

// «Вместе» — первой, по просьбе Полины.
const DEFAULT_VISIBLE: QuickActionId[] = ["friends", "stretch", "meditation", "breathing", "music"];

export function getQuickActions(): QuickActionId[] {
  try {
    const raw = localStorage.getItem(QA_KEY);
    if (raw !== null) {
      const ids = JSON.parse(raw) as QuickActionId[];
      return ids.filter(id => QUICK_ACTION_ITEMS.some(n => n.id === id));
    }
  } catch {}
  return DEFAULT_VISIBLE;
}

export function setQuickActions(ids: QuickActionId[]) {
  try { localStorage.setItem(QA_KEY, JSON.stringify(ids)); } catch {}
}
