import os
from dotenv import load_dotenv
load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
WEBAPP_URL = os.getenv("WEBAPP_URL", "http://localhost:5173")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./aifitness.db")
AI_PROVIDER = os.getenv("AI_PROVIDER", "rules")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")
OPENAI_COMPAT_URL = os.getenv("OPENAI_COMPAT_URL", "")
OPENAI_COMPAT_KEY = os.getenv("OPENAI_COMPAT_KEY", "")
OPENAI_COMPAT_MODEL = os.getenv("OPENAI_COMPAT_MODEL", "")
DEV_SKIP_AUTH = os.getenv("DEV_SKIP_AUTH", "false").lower() == "true"
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
