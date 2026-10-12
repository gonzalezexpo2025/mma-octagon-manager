"""Octagon Manager - API REST con FastAPI + SQLite."""
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.database import init_db
from app.routers import categorias, estadisticas, eventos, peleadores, peleas

# Crea la base de datos (tablas + datos de ejemplo) si todavía no existe.
init_db()

app = FastAPI(
    title="Octagon Manager API",
    description="Gestión de peleadores, eventos y peleas de MMA.",
    version="1.0.0",
    docs_url="/api/docs",          # Swagger UI (también funciona en Vercel)
    openapi_url="/api/openapi.json",
)

app.include_router(categorias.router)
app.include_router(peleadores.router)
app.include_router(eventos.router)
app.include_router(peleas.router)
app.include_router(estadisticas.router)


@app.get("/api/health", tags=["Sistema"])
def health():
    return {"status": "ok"}


# En local, FastAPI también sirve el frontend (carpeta public/).
# En Vercel, public/ lo sirve directamente la CDN.
PUBLIC_DIR = Path(__file__).resolve().parent.parent / "public"
if PUBLIC_DIR.exists():
    app.mount("/", StaticFiles(directory=PUBLIC_DIR, html=True), name="frontend")
