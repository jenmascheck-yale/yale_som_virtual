"""SQLite access.

- courses: the course catalog in data/yale_som.db (opened read-only).
- professors: one row per AI professor (persona, room, voice) in backend/professors.db,
  seeded from personas.py on startup.
"""

import sqlite3
from contextlib import closing

from .config import COURSE_DB, PROFESSOR_DB
from .personas import PROFESSORS


def _courses():
    con = sqlite3.connect(f"file:{COURSE_DB.as_posix()}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    return con


def _profs():
    con = sqlite3.connect(PROFESSOR_DB)
    con.row_factory = sqlite3.Row
    return con


# ---------- professors

def seed_professors() -> None:
    """(Re)create the professors table from personas.py so edits there always take effect."""
    with closing(_profs()) as con, con:
        con.execute("DROP TABLE IF EXISTS professors")
        con.execute(
            """CREATE TABLE professors (
                id TEXT PRIMARY KEY, name TEXT, room_id TEXT, room_name TEXT, course_number TEXT,
                persona TEXT, greeting TEXT, voice_pitch REAL, voice_rate REAL, voice_prefs TEXT
            )"""
        )
        con.executemany(
            "INSERT INTO professors VALUES (:id, :name, :room_id, :room_name, :course_number,"
            " :persona, :greeting, :voice_pitch, :voice_rate, :voice_prefs)",
            PROFESSORS,
        )


def list_professors() -> list[dict]:
    with closing(_profs()) as con:
        return [dict(r) for r in con.execute("SELECT * FROM professors ORDER BY room_id")]


def get_professor(prof_id: str) -> dict | None:
    with closing(_profs()) as con:
        r = con.execute("SELECT * FROM professors WHERE id = ?", (prof_id,)).fetchone()
        return dict(r) if r else None


# ---------- courses

def get_course(course_number: str) -> dict | None:
    """One course with all its sections merged (rows in the DB are per section)."""
    num = " ".join(course_number.upper().replace("MGT", "MGT ").split())
    with closing(_courses()) as con:
        rows = con.execute("SELECT * FROM courses WHERE course_number = ?", (num,)).fetchall()
    if not rows:
        return None
    first = max(rows, key=lambda r: len(r["course_description"] or ""))
    faculty = {}
    for r in rows:
        if r["faculty_1"] and r["faculty_1"] not in faculty:
            faculty[r["faculty_1"]] = r["faculty_bio"]
    sections = sorted({f'{r["daytimes"].strip()} in {r["room"]}' for r in rows if r["daytimes"] and r["room"]})
    return {
        "course_number": first["course_number"],
        "title": first["course_title"],
        "category": first["course_category"],
        "session": first["course_session"],
        "units": first["units"],
        "description": first["course_description"],
        "faculty": [{"name": n, "bio": b} for n, b in faculty.items()],
        "sections": sections,
        "syllabus": next((r["syllabus"] for r in rows if r["syllabus"]), ""),
    }


def search_courses(query: str, limit: int = 8) -> list[dict]:
    """Keyword search over number, title, description and faculty; one hit per course."""
    q = f"%{query.strip()}%"
    with closing(_courses()) as con:
        rows = con.execute(
            """SELECT course_number, course_title, faculty_1, course_session,
                      substr(course_description, 1, 240) AS blurb
               FROM courses
               WHERE course_number LIKE ? OR course_title LIKE ? OR course_description LIKE ? OR faculty_1 LIKE ?
               GROUP BY course_number ORDER BY course_number LIMIT ?""",
            (q, q, q, q, limit),
        ).fetchall()
    return [dict(r) for r in rows]


def course_catalog_summary() -> str:
    """Compact one-line-per-course list so every professor knows about the other classes."""
    with closing(_courses()) as con:
        rows = con.execute(
            "SELECT course_number, course_title, group_concat(DISTINCT faculty_1) AS fac"
            " FROM courses GROUP BY course_number, course_title ORDER BY course_number"
        ).fetchall()
    return "\n".join(f'{r["course_number"]}: {r["course_title"]} ({r["fac"] or "TBA"})' for r in rows)
