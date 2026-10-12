"""Endpoints CRUD de peleas."""
import sqlite3
from typing import List, Optional

from fastapi import APIRouter, Depends, Query

from app.database import get_db
from app.errors import integrity_error, no_encontrado
from app.schemas import PeleaIn

router = APIRouter(prefix="/api/peleas", tags=["Peleas"])

MSG_REF = "El evento, los peleadores o la categoría indicados no existen."

SELECT_PELEA = """
SELECT pe.*, ev.nombre AS evento, ev.fecha AS fecha_evento,
       r.nombre AS rojo, a.nombre AS azul, g.nombre AS ganador, c.nombre AS categoria
FROM pelea pe
JOIN evento ev        ON ev.id = pe.evento_id
JOIN peleador r       ON r.id  = pe.peleador_rojo_id
JOIN peleador a       ON a.id  = pe.peleador_azul_id
JOIN categoria_peso c ON c.id  = pe.categoria_id
LEFT JOIN peleador g  ON g.id  = pe.ganador_id
"""


def _obtener(db: sqlite3.Connection, pelea_id: int) -> dict:
    fila = db.execute(SELECT_PELEA + " WHERE pe.id = ?", (pelea_id,)).fetchone()
    if fila is None:
        raise no_encontrado("Pelea", True)
    return dict(fila)


def _valores(d: PeleaIn) -> tuple:
    return (d.evento_id, d.peleador_rojo_id, d.peleador_azul_id, d.categoria_id, d.rounds,
            1 if d.es_titulo else 0, d.ganador_id, d.metodo, d.round_final, d.tiempo)


@router.get("")
def listar(
    evento_id: Optional[int] = Query(None),
    db: sqlite3.Connection = Depends(get_db),
) -> List[dict]:
    sql, params = SELECT_PELEA, []
    if evento_id:
        sql += " WHERE pe.evento_id = ?"
        params.append(evento_id)
    sql += " ORDER BY ev.fecha DESC, pe.es_titulo DESC, pe.id"
    return [dict(f) for f in db.execute(sql, params).fetchall()]


@router.get("/{pelea_id}")
def detalle(pelea_id: int, db: sqlite3.Connection = Depends(get_db)):
    return _obtener(db, pelea_id)


@router.post("", status_code=201)
def crear(datos: PeleaIn, db: sqlite3.Connection = Depends(get_db)):
    try:
        cur = db.execute(
            """INSERT INTO pelea (evento_id, peleador_rojo_id, peleador_azul_id, categoria_id,
                                  rounds, es_titulo, ganador_id, metodo, round_final, tiempo)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            _valores(datos),
        )
        db.commit()
    except sqlite3.IntegrityError as exc:
        raise integrity_error(exc, MSG_REF)
    return _obtener(db, cur.lastrowid)


@router.put("/{pelea_id}")
def actualizar(pelea_id: int, datos: PeleaIn, db: sqlite3.Connection = Depends(get_db)):
    _obtener(db, pelea_id)
    try:
        db.execute(
            """UPDATE pelea SET evento_id = ?, peleador_rojo_id = ?, peleador_azul_id = ?,
                      categoria_id = ?, rounds = ?, es_titulo = ?, ganador_id = ?,
                      metodo = ?, round_final = ?, tiempo = ?
               WHERE id = ?""",
            _valores(datos) + (pelea_id,),
        )
        db.commit()
    except sqlite3.IntegrityError as exc:
        raise integrity_error(exc, MSG_REF)
    return _obtener(db, pelea_id)


@router.delete("/{pelea_id}", status_code=204)
def eliminar(pelea_id: int, db: sqlite3.Connection = Depends(get_db)):
    _obtener(db, pelea_id)
    db.execute("DELETE FROM pelea WHERE id = ?", (pelea_id,))
    db.commit()
