import json, pathlib
_PATH = pathlib.Path(__file__).parent / "data" / "exercises.json"
EXERCISES: list[dict] = json.loads(_PATH.read_text(encoding="utf-8"))
BY_ID: dict[str, dict] = {e["id"]: e for e in EXERCISES}

def available(equipment: list[str], location: str) -> list[dict]:
    """Упражнения, доступные с оборудованием пользователя. Зал даёт всё."""
    if location == "gym":
        return EXERCISES
    eq = set(equipment) | {"bodyweight"}
    if location == "both":
        eq |= {"machine", "cable", "barbell", "rack", "bench", "treadmill", "bike", "dip_bars"}
    return [e for e in EXERCISES if any(x in eq for x in e["equipment"])]
