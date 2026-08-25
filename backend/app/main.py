import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .db import Base, engine
from .routers.api import r
from .config import UPLOAD_DIR, WEBAPP_URL

Base.metadata.create_all(engine)
os.makedirs(UPLOAD_DIR, exist_ok=True)
app = FastAPI(title="AI FITNESS API")
app.add_middleware(CORSMiddleware, allow_origins=[WEBAPP_URL, "http://localhost:5173"], allow_methods=["*"], allow_headers=["*"])
app.include_router(r)

@app.get("/health")
def health(): return {"ok": True}
