import os
from pathlib import Path
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    openrouter_api_key: str = os.getenv("OPENROUTER_API_KEY", "")
    ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    database_url: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./novel_automation.db")
    chroma_persist_dir: str = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")
    output_dir: str = os.getenv("OUTPUT_DIR", "./output")
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8000"))

    class Config:
        env_file = ".env"


settings = Settings()

BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = Path(settings.output_dir)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
