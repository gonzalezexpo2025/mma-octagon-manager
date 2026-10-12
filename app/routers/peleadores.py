"""Endpoints CRUD de peleadores (incluye récord calculado desde las peleas)."""
import sqlite3
from typing import List, Optional

from fastapi import APIRouter, Depends, Query

from app.database import get_db
from app.errors import integrity_error, no_encontrado
from app.schemas import PeleadorIn

router = APIRouter(prefix="/api/peleadores", tags=["Peleadores"])

MSG_EN_USO = "No se puede eliminar: el peleador tiene peleas registradas."
MSG_REF = "La categoría indicada no existe."

# El récord (victorias/derrotas/empates) se calcula con subconsultas: no se duplica en la tabla.
SELECT_PELEADOR = """
SELECT p.*, c.nombre AS categoria,
  (SELECT COUNT(*) FROM pelea WHERE ganador_id = p.id) AS victorias,
  (SELECT COUNT(*) FROM pelea
     WHERE ganador_id IS NOT NULL AND ganador_id <> p.id
       AND p.id IN (peleador_rojo_id, peleador_azul_id)) AS derrotas,
  (SELECT COUNT(*) FROM pelea
     WHERE metodo = 'Empate' AND p.id IN (peleador_rojo_id, peleador_azul_id)) AS empates
FROM peleador p
JOIN categoria_peso c ON c.id = p.categoria_id
"""


def _obtener(db: sqlite3.Connection, peleador_id: int) -> dict:
    fila = db.execute(SELECT_PELEADOR + " WHERE p.id = ?", (peleador_id,)).fetchone()
    if fila is None:
        raise no_encontrado("Peleador")
    return dict(fila)


def _valores(d: PeleadorIn) -> tuple:
    apodo = d.apodo.strip() if d.apodo and d.apodo.strip() else None
    return (d.nombre.strip(), apodo, d.pais.strip(), d.fecha_nacimiento.isoformat(),
            d.altura_cm, d.alcance_cm, d.estilo.strip(), 1 if d.activo else 0, d.categoria_id)


@router.get("")
def listar(
    buscar: Optional[str] = Query(None, description="Texto en nombre, apodo o país"),
    categoria_id: Optional[int] = Query(None),
    db: sqlite3.Connection = Depends(get_db),
) -> List[dict]:
    sql, params, filtros = SELECT_PELEADOR, [], []
    if buscar:
        filtros.append("(p.nombre LIKE ? OR p.apodo LIKE ? OR p.pais LIKE ?)")
        params += [f"%{buscar}%"] * 3
    if categoria_id:
        filtros.append("p.categoria_id = ?")
        params.append(categoria_id)
    if filtros:
        sql += " WHERE " + " AND ".join(filtros)
    sql += " ORDER BY c.limite_lb, p.nombre"
    return [dict(f) for f in db.execute(sql, params).fetchall()]


@router.get("/{peleador_id}")
def detalle(peleador_id: int, db: sqlite3.Connection = Depends(get_db)):
    return _obtener(db, peleador_id)


@router.get("/{peleador_id}/peleas")
def historial(peleador_id: int, db: sqlite3.Connection = Depends(get_db)) -> List[dict]:
    """Historial de peleas de un peleador."""
    _obtener(db, peleador_id)
    filas = db.execute(
        """SELECT pe.id, ev.nombre AS evento, ev.fecha, pe.metodo, pe.round_final, pe.tiempo,
                  CASE WHEN pe.peleador_rojo_id = ? THEN a.nombre ELSE r.nombre END AS oponente,
                  CASE WHEN pe.ganador_id = ? THEN 'Victoria'
                       WHEN pe.metodo = 'Empate' THEN 'Empate'
                       WHEN pe.ganador_id IS NOT NULL THEN 'Derrota'
                       ELSE 'Pendiente' END AS resultado
           FROM pelea pe
           JOIN evento ev   ON ev.id = pe.evento_id
           JOIN peleador r  ON r.id = pe.peleador_rojo_id
           JOIN peleador a  ON a.id = pe.peleador_azul_id
           WHERE ? IN (pe.peleador_rojo_id, pe.peleador_azul_id)
           ORDER BY ev.fecha DESC""",
        (peleador_id, peleador_id, peleador_id),
    ).fetchall()
    return [dict(f) for f in filas]


@router.post("", status_code=201)
def crear(datos: PeleadorIn, db: sqlite3.Connection = Depends(get_db)):
    try:
        cur = db.execute(
            """INSERT INTO peleador (nombre, apodo, pais, fecha_nacimiento, altura_cm,
                                     alcance_cm, estilo, activo, categoria_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            _valores(datos),
        )
        db.commit()
    except sqlite3.IntegrityError as exc:
        raise integrity_error(exc, MSG_REF)
    return _obtener(db, cur.lastrowid)


@router.put("/{peleador_id}")
def actualizar(peleador_id: int, datos: PeleadorIn, db: sqlite3.Connection = Depends(get_db)):
    _obtener(db, peleador_id)
    try:
        db.execute(
            """UPDATE peleador SET nombre = ?, apodo = ?, pais = ?, fecha_nacimiento = ?,
                      altura_cm = ?, alcance_cm = ?, estilo = ?, activo = ?, categoria_id = ?
               WHERE id = ?""",
            _valores(datos) + (peleador_id,),
        )
        db.commit()
    except sqlite3.IntegrityError as exc:
        raise integrity_error(exc, MSG_REF)
    return _obtener(db, peleador_id)


@router.delete("/{peleador_id}", status_code=204)
def eliminar(peleador_id: int, db: sqlite3.Connection = Depends(get_db)):
    _obtener(db, peleador_id)
    try:
        db.execute("DELETE FROM peleador WHERE id = ?", (peleador_id,))
        db.commit()
    except sqlite3.IntegrityError as exc:
        raise integrity_error(exc, MSG_EN_USO)
