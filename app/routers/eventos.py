"""Endpoints CRUD de eventos."""
import sqlite3
from typing import List

from fastapi import APIRouter, Depends

from app.database import get_db
from app.errors import integrity_error, no_encontrado
from app.schemas import EventoIn

router = APIRouter(prefix="/api/eventos", tags=["Eventos"])

SELECT_EVENTO = """
SELECT e.*, (SELECT COUNT(*) FROM pelea WHERE evento_id = e.id) AS total_peleas
FROM evento e
"""


def _obtener(db: sqlite3.Connection, evento_id: int) -> dict:
    fila = db.execute(SELECT_EVENTO + " WHERE e.id = ?", (evento_id,)).fetchone()
    if fila is None:
        raise no_encontrado("Evento")
    return dict(fila)


def _valores(d: EventoIn) -> tuple:
    return (d.nombre.strip(), d.fecha.isoformat(), d.sede.strip(),
            d.ciudad.strip(), d.pais.strip(), d.estado)


@router.get("")
def listar(db: sqlite3.Connection = Depends(get_db)) -> List[dict]:
    return [dict(f) for f in db.execute(SELECT_EVENTO + " ORDER BY e.fecha DESC").fetchall()]


@router.get("/{evento_id}")
def detalle(evento_id: int, db: sqlite3.Connection = Depends(get_db)):
    return _obtener(db, evento_id)


@router.get("/{evento_id}/peleas")
def cartelera(evento_id: int, db: sqlite3.Connection = Depends(get_db)) -> List[dict]:
    """Cartelera: peleas del evento con nombres de peleadores."""
    _obtener(db, evento_id)
    filas = db.execute(
        """SELECT pe.id, pe.es_titulo, pe.rounds, pe.metodo, pe.round_final, pe.tiempo,
                  c.nombre AS categoria, r.nombre AS rojo, a.nombre AS azul, g.nombre AS ganador
           FROM pelea pe
           JOIN categoria_peso c ON c.id = pe.categoria_id
           JOIN peleador r ON r.id = pe.peleador_rojo_id
           JOIN peleador a ON a.id = pe.peleador_azul_id
           LEFT JOIN peleador g ON g.id = pe.ganador_id
           WHERE pe.evento_id = ?
           ORDER BY pe.es_titulo DESC, pe.id""",
        (evento_id,),
    ).fetchall()
    return [dict(f) for f in filas]


@router.post("", status_code=201)
def crear(datos: EventoIn, db: sqlite3.Connection = Depends(get_db)):
    cur = db.execute(
        "INSERT INTO evento (nombre, fecha, sede, ciudad, pais, estado) VALUES (?, ?, ?, ?, ?, ?)",
        _valores(datos),
    )
    db.commit()
    return _obtener(db, cur.lastrowid)


@router.put("/{evento_id}")
def actualizar(evento_id: int, datos: EventoIn, db: sqlite3.Connection = Depends(get_db)):
    _obtener(db, evento_id)
    db.execute(
        "UPDATE evento SET nombre = ?, fecha = ?, sede = ?, ciudad = ?, pais = ?, estado = ? WHERE id = ?",
        _valores(datos) + (evento_id,),
    )
    db.commit()
    return _obtener(db, evento_id)


@router.delete("/{evento_id}", status_code=204)
def eliminar(evento_id: int, db: sqlite3.Connection = Depends(get_db)):
    """Elimina el evento y, por ON DELETE CASCADE, sus peleas."""
    _obtener(db, evento_id)
    try:
        db.execute("DELETE FROM evento WHERE id = ?", (evento_id,))
        db.commit()
    except sqlite3.IntegrityError as exc:
        raise integrity_error(exc, "No se puede eliminar el evento.")
