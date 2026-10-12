"""Endpoints CRUD de categorías de peso."""
import sqlite3
from typing import List

from fastapi import APIRouter, Depends

from app.database import get_db
from app.errors import integrity_error, no_encontrado
from app.schemas import CategoriaIn

router = APIRouter(prefix="/api/categorias", tags=["Categorías de peso"])

MSG_FK = "No se puede eliminar: hay peleadores o peleas que usan esta categoría."


def _obtener(db: sqlite3.Connection, categoria_id: int) -> dict:
    fila = db.execute("SELECT * FROM categoria_peso WHERE id = ?", (categoria_id,)).fetchone()
    if fila is None:
        raise no_encontrado("Categoría", True)
    return dict(fila)


@router.get("")
def listar(db: sqlite3.Connection = Depends(get_db)) -> List[dict]:
    filas = db.execute("SELECT * FROM categoria_peso ORDER BY limite_lb").fetchall()
    return [dict(f) for f in filas]


@router.get("/{categoria_id}")
def detalle(categoria_id: int, db: sqlite3.Connection = Depends(get_db)):
    return _obtener(db, categoria_id)


@router.post("", status_code=201)
def crear(datos: CategoriaIn, db: sqlite3.Connection = Depends(get_db)):
    try:
        cur = db.execute(
            "INSERT INTO categoria_peso (nombre, limite_lb, limite_kg) VALUES (?, ?, ?)",
            (datos.nombre.strip(), datos.limite_lb, datos.limite_kg),
        )
        db.commit()
    except sqlite3.IntegrityError as exc:
        raise integrity_error(exc, MSG_FK)
    return _obtener(db, cur.lastrowid)


@router.put("/{categoria_id}")
def actualizar(categoria_id: int, datos: CategoriaIn, db: sqlite3.Connection = Depends(get_db)):
    _obtener(db, categoria_id)
    try:
        db.execute(
            "UPDATE categoria_peso SET nombre = ?, limite_lb = ?, limite_kg = ? WHERE id = ?",
            (datos.nombre.strip(), datos.limite_lb, datos.limite_kg, categoria_id),
        )
        db.commit()
    except sqlite3.IntegrityError as exc:
        raise integrity_error(exc, MSG_FK)
    return _obtener(db, categoria_id)


@router.delete("/{categoria_id}", status_code=204)
def eliminar(categoria_id: int, db: sqlite3.Connection = Depends(get_db)):
    _obtener(db, categoria_id)
    try:
        db.execute("DELETE FROM categoria_peso WHERE id = ?", (categoria_id,))
        db.commit()
    except sqlite3.IntegrityError as exc:
        raise integrity_error(exc, MSG_FK)
