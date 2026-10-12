"""Utilidades para traducir errores de SQLite a respuestas HTTP claras."""
import sqlite3

from fastapi import HTTPException


def integrity_error(exc: sqlite3.IntegrityError, mensaje_fk: str) -> HTTPException:
    """409 con mensaje comprensible según el tipo de violación de integridad."""
    texto = str(exc).upper()
    if "UNIQUE" in texto:
        return HTTPException(409, "Ya existe un registro con ese valor único (nombre duplicado).")
    if "FOREIGN KEY" in texto:
        return HTTPException(409, mensaje_fk)
    return HTTPException(422, "Los datos no cumplen las restricciones de la base de datos.")


def no_encontrado(nombre: str, femenino: bool = False) -> HTTPException:
    return HTTPException(404, f"{nombre} no encontrad{'a' if femenino else 'o'}")
