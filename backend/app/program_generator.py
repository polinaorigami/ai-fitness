"""Бесплатный детерминированный генератор программ (fallback без AI).
AI-провайдер может только переупорядочить/адаптировать результат, но выбирает из базы."""
from .exercises import available, BY_ID

WEEKDAYS = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"]
GOAL_LABEL = {"weight_loss": "Снижение веса", "muscle": "Набор мышц", "recomp": "Рекомпозиция тела",
              "strength": "Стать сильнее", "fitness": "Улучшить физическую форму", "endurance": "Развить выносливость"}

# Шаблоны дней: название + список (группа, кол-во упражнений)
SPLITS = {
    2: [("Всё тело", [("legs",2),("glutes",1),("chest",1),("back",1),("abs",1)]),
        ("Всё тело", [("legs",2),("back",1),("shoulders",1),("chest",1),("abs",1)])],
    3: [("Ноги + ягодицы", [("legs",3),("glutes",2),("abs",1)]),
        ("Верх тела", [("chest",2),("back",2),("shoulders",1),("abs",1)]),
        ("Всё тело", [("legs",2),("back",1),("chest",1),("glutes",1),("abs",1)])],
    4: [("Ноги", [("legs",4),("glutes",1),("abs",1)]),
        ("Верх тела", [("chest",2),("back",2),("shoulders",1),("triceps",1)]),
        ("Ноги + ягодицы", [("glutes",3),("legs",2),("abs",1)]),
        ("Спина + руки", [("back",3),("biceps",1),("triceps",1),("abs",1)])],
    5: [("Ноги", [("legs",4),("glutes",1),("abs",1)]),
        ("Грудь + плечи", [("chest",3),("shoulders",2),("triceps",1)]),
        ("Спина + бицепс", [("back",3),("biceps",2),("abs",1)]),
        ("Ягодицы + ноги", [("glutes",3),("legs",2),("abs",1)]),
        ("Кардио + пресс", [("cardio",3),("abs",3)])],
    6: [("Ноги", [("legs",4),("glutes",1),("abs",1)]),
        ("Грудь + трицепс", [("chest",3),("triceps",2),("abs",1)]),
        ("Спина + бицепс", [("back",3),("biceps",2)]),
        ("Ягодицы", [("glutes",4),("legs",1),("abs",1)]),
        ("Плечи + пресс", [("shoulders",3),("abs",3)]),
        ("Кардио + мобильность", [("cardio",2),("mobility",3)])],
}
DAY_SLOTS = {2:[0,3], 3:[0,2,4], 4:[0,2,4,5], 5:[0,1,2,4,5], 6:[0,1,2,3,4,5]}
LEVEL_RANK = {"beginner":0, "intermediate":1, "advanced":2}
FOCUS = {"weight_loss":["Ноги","Ягодицы","Пресс","Кардио"], "muscle":["Ноги","Спина","Грудь","Плечи"],
         "recomp":["Ноги","Ягодицы","Спина","Пресс"], "strength":["Ноги","Спина","Грудь"],
         "fitness":["Всё тело","Пресс","Мобильность"], "endurance":["Кардио","Ноги","Пресс"]}

# Акцентная зона: если задана (не "full"), программа почти целиком строится вокруг неё,
# а не по стандартному сплиту — так пользователь не получает дни на группы, которые не хочет качать.
ZONE_LABEL = {"glutes": "Ягодицы", "abs": "Пресс", "arms": "Руки", "back": "Спина", "chest": "Грудь", "legs": "Ноги"}
GROUP_LABEL = {"legs": "ноги", "back": "спина", "chest": "грудь", "abs": "пресс", "glutes": "ягодицы",
               "cardio": "кардио", "shoulders": "плечи", "mobility": "мобильность", "biceps": "бицепс", "triceps": "трицепс"}
ZONE_GROUPS = {
    "glutes": ["glutes", "legs", "abs"],
    "abs": ["abs", "cardio", "legs"],
    "arms": ["biceps", "triceps", "shoulders"],
    "back": ["back", "biceps", "abs"],
    "chest": ["chest", "triceps", "shoulders"],
    "legs": ["legs", "glutes", "abs"],
}
ZONE_VARIANTS = [
    [(0, 3), (1, 2), (2, 1)],
    [(0, 4), (1, 1), (2, 1)],
    [(0, 3), (1, 1), (2, 2)],
]

def _zone_template(zone: str, days: int):
    groups = ZONE_GROUPS[zone]
    label = ZONE_LABEL[zone]
    out = []
    for i in range(days):
        variant = ZONE_VARIANTS[i % len(ZONE_VARIANTS)]
        plan = [(groups[gi], n) for gi, n in variant if gi < len(groups)]
        second = GROUP_LABEL.get(groups[1], groups[1]) if len(groups) > 1 else ""
        title = f"{label} · акцент" if i % 2 == 0 and second else f"{label} + {second}".strip(" +")
        out.append((title, plan))
    return out

def _pick(pool, group, n, used, level):
    cands = [e for e in pool if e["group"] == group and e["id"] not in used
             and LEVEL_RANK[e["level"]] <= LEVEL_RANK[level]]
    cands.sort(key=lambda e: (-LEVEL_RANK[e["level"]], -e["rest_sec"], e["id"]))  # базовые (долгий отдых) — первыми
    out = cands[:n]
    used.update(e["id"] for e in out)
    return out

def _adapt(ex, goal, level, weight_kg):
    sets, reps, rest = ex["sets"], ex["reps"], ex["rest_sec"]
    if goal == "strength" and ex["group"] not in ("abs","cardio","mobility"):
        sets, reps, rest = max(sets,4), "5–6", max(rest,150)
    elif goal in ("weight_loss","endurance") and ex["group"] not in ("cardio","mobility"):
        reps, rest = "12–15", min(rest,60)
    if level == "beginner":
        sets = min(sets, 3)
    # стартовый вес: только для снарядов; консервативно от массы тела
    w = 0.0
    if "bodyweight" in ex["equipment"]:
        w = 0
    elif "barbell" in ex["equipment"] or "machine" in ex["equipment"]:
        base = {"legs":0.5,"glutes":0.5,"back":0.35,"chest":0.35,"shoulders":0.2}.get(ex["group"],0.15)
        mult = {"beginner":0.6,"intermediate":1.0,"advanced":1.4}[level]
        w = round((weight_kg or 70)*base*mult/2.5)*2.5
    elif "dumbbell" in ex["equipment"] or "kettlebell" in ex["equipment"]:
        w = {"beginner":6,"intermediate":10,"advanced":14}[level]
        if ex["group"] in ("shoulders","biceps","triceps"): w = max(2, w-4)
    return {"exercise_id": ex["id"], "sets": sets, "reps": reps, "rest_sec": rest, "weight_kg": w}

def _fit_time(exs, minutes):
    """~3.5 мин на упражнение с подходами; обрезаем под лимит времени."""
    est = lambda lst: 5 + sum(x["sets"]*0.75 + x["sets"]*x["rest_sec"]/60 for x in lst)
    while len(exs) > 3 and est(exs) > minutes:
        exs.pop()
    return exs

def generate(user) -> dict:
    days = user.days_per_week or 3
    goal = user.goal or "fitness"
    level = user.level or "beginner"
    minutes = user.minutes or 45
    pool = available(user.equipment or [], user.location or "home")
    zone = getattr(user, "focus_zone", None)
    zone = zone if zone in ZONE_GROUPS else None
    template = _zone_template(zone, days) if zone else SPLITS[days]
    slots = DAY_SLOTS[days]
    week = [{"weekday": WEEKDAYS[i], "title": "Отдых", "rest": True, "exercises": []} for i in range(7)]
    for slot, (title, plan) in zip(slots, template):
        used, exs = set(), []
        for group, n in plan:
            exs += _pick(pool, group, n, used, level)
        if len(exs) < 4:  # мало оборудования — добираем bodyweight
            fallback = ZONE_GROUPS[zone][0] if zone else "abs"
            exs += _pick(pool, fallback, 1, used, level) + _pick(pool, "cardio", 1, used, level)
        exs = _fit_time([_adapt(e, goal, level, user.weight_kg) for e in exs], minutes)
        for x in exs: x.update(name=BY_ID[x["exercise_id"]]["name"])
        week[slot] = {"weekday": WEEKDAYS[slot], "title": title, "rest": False, "exercises": exs}
    focus = [ZONE_LABEL[zone]] if zone else FOCUS[goal]
    strategy = {"goal": goal, "goal_label": GOAL_LABEL[goal], "days": days, "focus": focus,
                "avg_minutes": minutes, "level": level,
                "progression": "Если все подходы выполнены с запасом (RPE ≤ 6) — на следующей тренировке +2,5 кг на штанге или +1–2 повторения.",
                "source": "template"}
    return {"strategy": strategy, "week": week}
