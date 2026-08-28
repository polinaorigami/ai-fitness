import logging, os
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from .db import Base, engine
from .migrate import run_migrations
from .routers.api import r
from .config import UPLOAD_DIR, WEBAPP_URL

log = logging.getLogger("aifitness")

Base.metadata.create_all(engine)
run_migrations()
os.makedirs(UPLOAD_DIR, exist_ok=True)
app = FastAPI(title="AI FITNESS API")


class ErrorsWithCors(BaseHTTPMiddleware):
    """Ловит необработанные исключения и отдаёт их как обычный JSON-ответ.

    Без этого Starlette возвращает «голый» 500 в обход CORS-мидлвари: браузер
    не видит заголовок Access-Control-Allow-Origin и показывает не текст ошибки,
    а бесполезное «Load failed». Теперь настоящая причина видна в приложении.
    """

    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except Exception:
            log.exception("Необработанная ошибка на %s %s", request.method, request.url.path)
            return JSONResponse({"detail": "Внутренняя ошибка сервера"}, status_code=500)


# Порядок важен: CORS добавляется последним, значит он снаружи и проставляет
# заголовки в том числе на ответы с ошибками.
app.add_middleware(ErrorsWithCors)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[WEBAPP_URL, "http://localhost:5173"],
    allow_origin_regex=r"https://.*\.onrender\.com",
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(r)


@app.get("/health")
def health(): return {"ok": True}
