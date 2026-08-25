"""AIProvider — единый интерфейс. Приложение обязано работать с RulesProvider (без модели, бесплатно).
Ollama — бесплатно локально. OpenAI-совместимый API — может быть платным (см. README)."""
from abc import ABC, abstractmethod
import json, httpx
from ..config import AI_PROVIDER, OLLAMA_URL, OLLAMA_MODEL, OPENAI_COMPAT_URL, OPENAI_COMPAT_KEY, OPENAI_COMPAT_MODEL
from ..exercises import BY_ID

SAFETY = ("Ты — AI-тренер приложения AI FITNESS. Отвечай только по-русски, коротко и по делу. "
          "Никогда не ставь диагнозы, не называй процент жира, не обещай конкретный внешний вид или гарантированный результат. "
          "При жалобах на боль или травму — скажи, что не заменяешь врача, и посоветуй обратиться к специалисту. "
          "Не придумывай упражнения: используй только названия из списка, который тебе дали.")

class AIProvider(ABC):
    name = "base"
    @abstractmethod
    async def analyze_strategy(self, user, program: dict) -> dict: ...
    @abstractmethod
    async def coach_reply(self, user, history: list[dict], text: str, context: dict) -> dict: ...

# ---------- 1. Бесплатно, без модели ----------
class RulesProvider(AIProvider):
    name = "rules"
    async def analyze_strategy(self, user, program):
        s = program["strategy"]
        s["summary"] = (f"Цель — {s['goal_label'].lower()}. {s['days']} тренировки в неделю по ~{s['avg_minutes']} минут. "
                        f"Основной акцент: {', '.join(s['focus']).lower()}. Первые 2 недели — освоение техники, затем плавная прогрессия.")
        s["source"] = "rules"
        return program

    async def coach_reply(self, user, history, text, context):
        t = text.lower()
        if any(w in t for w in ("боль", "болит", "травм", "тянет", "хруст")):
            return {"text": "Если есть боль или травма — я не заменяю врача. Лучше сделать паузу и показаться специалисту. Могу временно убрать нагрузку на эту зону из программы.", "actions": ["УБРАТЬ НАГРУЗКУ", "ОСТАВИТЬ КАК ЕСТЬ"]}
        if any(w in t for w in ("не могу", "не успе", "нет времени", "пропущу", "устал")):
            return {"text": "Ничего страшного. Можем перенести тренировку на завтра или сделать короткую 20-минутную тренировку. Что выбираешь?", "actions": ["ПЕРЕНЕСТИ", "20 МИНУТ", "ОСТАВИТЬ КАК ЕСТЬ"]}
        if any(w in t for w in ("легко", "лёгк", "мало")):
            return {"text": "Понял. На следующей тренировке можем немного увеличить нагрузку, если техника остаётся стабильной: +2,5 кг или +1–2 повторения.", "actions": ["УВЕЛИЧИТЬ", "ОСТАВИТЬ КАК ЕСТЬ"]}
        if any(w in t for w in ("тяжело", "тяжёл", "сложно", "не получается")):
            return {"text": "Снизим нагрузку на 10% и сделаем на один подход меньше. Техника важнее веса.", "actions": ["СНИЗИТЬ", "ОСТАВИТЬ КАК ЕСТЬ"]}
        if any(w in t for w in ("вес", "питан", "еда", "калори", "диет")):
            return {"text": "Я тренер по нагрузкам, а не диетолог. Общий принцип: для снижения веса — небольшой дефицит калорий и достаточно белка; для набора — небольшой профицит. Точные цифры лучше обсудить с врачом или диетологом.", "actions": []}
        if any(w in t for w in ("привет", "здравств", "hi")):
            return {"text": f"Привет, {user.first_name or 'друг'}! Я твой AI-тренер. Напиши, если нужно перенести тренировку, что-то тяжело или легко, или есть вопрос по упражнению.", "actions": []}
        day = context.get("today_title")
        if day:
            return {"text": f"Сегодня по плану: {day}. Если хочешь что-то изменить — напиши «перенести», «слишком легко» или «слишком тяжело».", "actions": ["ПЕРЕНЕСТИ", "ОСТАВИТЬ КАК ЕСТЬ"]}
        return {"text": "Я могу перенести тренировку, скорректировать нагрузку или объяснить упражнение. Что нужно?", "actions": []}

# ---------- 2. Бесплатно локально: Ollama ----------
class OllamaProvider(RulesProvider):
    name = "ollama"
    async def _chat(self, messages, json_mode=False):
        async with httpx.AsyncClient(timeout=60) as c:
            r = await c.post(f"{OLLAMA_URL}/api/chat", json={"model": OLLAMA_MODEL, "messages": messages, "stream": False,
                                                              **({"format": "json"} if json_mode else {})})
            r.raise_for_status()
            return r.json()["message"]["content"]

    async def analyze_strategy(self, user, program):
        try:
            names = [BY_ID[x["exercise_id"]]["name"] for d in program["week"] for x in d["exercises"]]
            prompt = (f"Профиль: цель {program['strategy']['goal_label']}, уровень {user.level}, {user.days_per_week} тренировок, "
                      f"возраст {user.age}, рост {user.height_cm}, вес {user.weight_kg}. Упражнения программы: {', '.join(names)}. "
                      "Напиши 2–3 предложения: краткая стратегия и на что обратить внимание. Верни JSON {\"summary\": \"...\"}.")
            out = json.loads(await self._chat([{"role":"system","content":SAFETY},{"role":"user","content":prompt}], True))
            program["strategy"]["summary"] = out.get("summary", "")
            program["strategy"]["source"] = "ollama"
            return program
        except Exception:
            return await super().analyze_strategy(user, program)

    async def coach_reply(self, user, history, text, context):
        rules = await super().coach_reply(user, history, text, context)
        try:
            msgs = [{"role":"system","content":SAFETY + f" Сегодня по плану: {context.get('today_title','отдых')}. Упражнения программы: {context.get('exercise_names','')}. Верни JSON {{\"text\": \"...\"}}."}]
            msgs += [{"role": "assistant" if m["role"]=="ai" else "user", "content": m["text"]} for m in history[-8:]]
            msgs.append({"role":"user","content":text})
            out = json.loads(await self._chat(msgs, True))
            return {"text": out.get("text") or rules["text"], "actions": rules["actions"]}
        except Exception:
            return rules

# ---------- 3. Внешний OpenAI-совместимый API (может быть платным) ----------
class OpenAICompatProvider(OllamaProvider):
    name = "openai_compat"
    async def _chat(self, messages, json_mode=False):
        async with httpx.AsyncClient(timeout=60) as c:
            r = await c.post(f"{OPENAI_COMPAT_URL.rstrip('/')}/chat/completions",
                             headers={"Authorization": f"Bearer {OPENAI_COMPAT_KEY}"},
                             json={"model": OPENAI_COMPAT_MODEL, "messages": messages,
                                   **({"response_format": {"type": "json_object"}} if json_mode else {})})
            r.raise_for_status()
            return r.json()["choices"][0]["message"]["content"]

def get_provider() -> AIProvider:
    return {"ollama": OllamaProvider, "openai_compat": OpenAICompatProvider}.get(AI_PROVIDER, RulesProvider)()
