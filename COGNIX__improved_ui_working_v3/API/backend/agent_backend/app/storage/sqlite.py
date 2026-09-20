import sqlite3
from pathlib import Path
from app.models import DiagnosticState

class SQLiteStore:
    def __init__(self,path="cognix.db"):
        self.path=Path(path); self._init()

    def _init(self):
        with sqlite3.connect(self.path) as c:
            c.execute("CREATE TABLE IF NOT EXISTS diagnostic_state (student_id TEXT PRIMARY KEY, version INTEGER NOT NULL, state_json TEXT NOT NULL)")

    def save(self,state):
        with sqlite3.connect(self.path) as c:
            c.execute(
                "INSERT INTO diagnostic_state(student_id,version,state_json) VALUES(?,?,?) "
                "ON CONFLICT(student_id) DO UPDATE SET version=excluded.version,state_json=excluded.state_json",
                (state.student_id,state.version,state.model_dump_json()))

    def load(self,student_id):
        with sqlite3.connect(self.path) as c:
            row=c.execute("SELECT state_json FROM diagnostic_state WHERE student_id=?",(student_id,)).fetchone()
        return DiagnosticState.model_validate_json(row[0]) if row else None
