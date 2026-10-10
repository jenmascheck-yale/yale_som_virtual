"""FastAPI back end for the AI professors.

Run from backend/:  .venv\\Scripts\\python -m uvicorn app.main:app --port 8000
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import agents, db
from .config import ALLOWED_ORIGINS, OPENAI_MODEL, has_api_key

log = logging.getLogger("professors")


@asynccontextmanager
async def lifespan(_: FastAPI):
    db.seed_professors()
    yield


app = FastAPI(title="Evans Hall AI Professors", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=ALLOWED_ORIGINS, allow_methods=["GET", "POST"], allow_headers=["*"])

PUBLIC_FIELDS = ("id", "name", "room_id", "room_name", "course_number", "greeting", "voice_pitch", "voice_rate", "voice_prefs")


class ChatIn(BaseModel):
    professor_id: str
    message: str = Field(min_length=1, max_length=2000)
    session_id: str = Field(min_length=1, max_length=100)


class ChatOut(BaseModel):
    reply: str


@app.get("/api/health")
def health():
    return {"ok": True, "model": OPENAI_MODEL, "api_key_loaded": has_api_key()}


@app.get("/api/professors")
def professors():
    return [{k: p[k] for k in PUBLIC_FIELDS} for p in db.list_professors()]


@app.post("/api/chat", response_model=ChatOut)
async def chat(body: ChatIn):
    prof = db.get_professor(body.professor_id)
    if not prof:
        raise HTTPException(404, "Unknown professor")
    if not has_api_key():
        raise HTTPException(503, "OPENAI_API_KEY is not set on the server")
    try:
        reply = await agents.chat(prof, body.session_id, body.message.strip())
    except Exception as e:  # don't leak provider details (or keys) to the browser
        log.exception("chat failed for %s", prof["id"])
        raise HTTPException(502, f"The professor couldn't answer ({type(e).__name__}). Try again.") from e
    return ChatOut(reply=reply)
