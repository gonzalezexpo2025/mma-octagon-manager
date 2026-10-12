"""Conexión a SQLite e inicialización de la base de datos."""
import os
import sqlite3
from pathlib import Path
from typing import Iterator

BASE_DIR = Path(__file__).resolve().parent.parent
SQL_DIR = BASE_DIR / "database"

# En Vercel solo se puede escribir en /tmp (almacenamiento temporal).
# En local se usa database/mma.db.
if os.environ.get("VERCEL"):
    DB_PATH = Path("/tmp/mma.db")
else:
    DB_PATH = SQL_DIR / "mma.db"


def get_connection() -> sqlite3.Connection:
    """Crea una conexión con filas tipo diccionario y llaves foráneas activas."""
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def get_db() -> Iterator[sqlite3.Connection]:
    """Dependencia de FastAPI: una conexión por petición."""
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()


def init_db() -> None:
    """Crea las tablas y carga los datos de ejemplo si la BD aún no existe."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = get_connection()
    try:
        existe = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='pelea'"
        ).fetchone()
        if not existe:
            conn.executescript((SQL_DIR / "schema.sql").read_text(encoding="utf-8"))
            conn.executescript((SQL_DIR / "seed.sql").read_text(encoding="utf-8"))
            conn.commit()
    finally:
        conn.close()
