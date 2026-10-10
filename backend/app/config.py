"""Settings, loaded from environment variables.

The real .env lives OUTSIDE this repo (in the course workspace folder). find_dotenv()
walks up from this file until it finds it, so no secrets are ever copied in here.
"""

import os
from pathlib import Path

from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv())

BACKEND_DIR = Path(__file__).resolve().parent.parent
REPO_DIR = BACKEND_DIR.parent

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-6-luna")
COURSE_DB = Path(os.getenv("COURSE_DB", REPO_DIR / "data" / "yale_som.db"))
PROFESSOR_DB = Path(os.getenv("PROFESSOR_DB", BACKEND_DIR / "professors.db"))
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")


def has_api_key() -> bool:
    return bool(os.getenv("OPENAI_API_KEY"))
