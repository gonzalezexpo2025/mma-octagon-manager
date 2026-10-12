"""Endpoint de estadísticas para el panel principal."""
import sqlite3

from fastapi import APIRouter, Depends

from app.database import get_db

router = APIRouter(prefix="/api/estadisticas", tags=["Estadísticas"])


@router.get("")
def resumen(db: sqlite3.Connection = Depends(get_db)):
    def uno(sql: str) -> int:
        return db.execute(sql).fetchone()[0]

    def varias(sql: str):
        return [dict(f) for f in db.execute(sql).fetchall()]

    proximo = db.execute(
        "SELECT * FROM evento WHERE estado = 'Programado' ORDER BY fecha LIMIT 1"
    ).fetchone()

    return {
        "total_peleadores": uno("SELECT COUNT(*) FROM peleador"),
        "total_eventos": uno("SELECT COUNT(*) FROM evento"),
        "total_peleas": uno("SELECT COUNT(*) FROM pelea"),
        "peleas_disputadas": uno("SELECT COUNT(*) FROM pelea WHERE metodo IS NOT NULL"),
        "proximo_evento": dict(proximo) if proximo else None,
        "por_metodo": varias(
            """SELECT metodo, COUNT(*) AS total FROM pelea
               WHERE metodo IS NOT NULL GROUP BY metodo ORDER BY total DESC"""
        ),
        "top_peleadores": varias(
            """SELECT p.id, p.nombre, p.apodo, COUNT(pe.id) AS victorias
               FROM peleador p JOIN pelea pe ON pe.ganador_id = p.id
               GROUP BY p.id ORDER BY victorias DESC, p.nombre LIMIT 5"""
        ),
        "por_categoria": varias(
            """SELECT c.nombre, COUNT(p.id) AS total
               FROM categoria_peso c LEFT JOIN peleador p ON p.categoria_id = c.id
               GROUP BY c.id ORDER BY c.limite_lb"""
        ),
    }
