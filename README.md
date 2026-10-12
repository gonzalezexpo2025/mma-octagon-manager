# 🥊 Octagon Manager

Sistema web para gestionar **peleadores, categorías de peso, eventos y peleas de MMA**.
Proyecto del curso: Python + FastAPI + SQLite, con frontend en HTML/CSS/JavaScript, control de
versiones en GitHub y publicación en Vercel.

## Descripción

Octagon Manager permite a una promotora de MMA registrar sus atletas, armar carteleras, programar
combates y registrar resultados. El récord de cada peleador (victorias, derrotas, empates) se calcula
automáticamente a partir de las peleas, y el panel muestra estadísticas generales.

Documentación completa de análisis y diseño (problema, objetivo, usuarios, diagrama ER, tablas, llaves
y relaciones): [`docs/ANALISIS_Y_DISENO.md`](docs/ANALISIS_Y_DISENO.md)

![Diagrama ER](docs/diagrama_ER.png)

## Tecnologías utilizadas

| Capa | Tecnología |
|---|---|
| Backend | Python 3.10+ · FastAPI · Pydantic |
| Base de datos | SQLite (módulo `sqlite3` de la biblioteca estándar) |
| Frontend | HTML5 · CSS3 · JavaScript (sin frameworks) |
| Control de versiones | Git + GitHub |
| Publicación | Vercel |

## Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/<tu-usuario>/mma-octagon-manager.git
cd mma-octagon-manager

# 2. Crear y activar un entorno virtual
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux

# 3. Instalar dependencias
pip install -r requirements.txt
```

## Ejecución

```bash
uvicorn app.main:app --reload
```

Abrir en el navegador:

- Aplicación: <http://127.0.0.1:8000>
- Documentación interactiva de la API (Swagger): <http://127.0.0.1:8000/api/docs>

Si el archivo `database/mma.db` no existe, se crea automáticamente a partir de
`database/schema.sql` y `database/seed.sql` (con datos de ejemplo ficticios).
Para reiniciar los datos, basta con borrar `database/mma.db` y volver a ejecutar.

## Estructura del proyecto

```
mma-octagon-manager/
├── app/
│   ├── main.py            # Aplicación FastAPI (registra routers y sirve el frontend)
│   ├── database.py        # Conexión SQLite e inicialización
│   ├── schemas.py         # Modelos Pydantic (validaciones)
│   ├── errors.py          # Traducción de errores de SQLite a respuestas HTTP
│   └── routers/           # Endpoints: categorias, peleadores, eventos, peleas, estadisticas
├── api/
│   └── index.py           # Punto de entrada para Vercel
├── database/
│   ├── schema.sql         # Creación de tablas
│   ├── seed.sql           # Datos de ejemplo
│   └── mma.db             # Base de datos SQLite
├── public/                # Frontend
│   ├── index.html
│   ├── css/styles.css
│   └── js/app.js
├── docs/                  # Análisis, diagramas ER (PNG, SVG, DOT)
├── requirements.txt
├── vercel.json
├── .gitignore
└── README.md
```

## API (resumen)

CRUD completo para `categorias`, `peleadores`, `eventos` y `peleas`:

```
GET    /api/peleadores            POST   /api/peleadores
GET    /api/peleadores/{id}       PUT    /api/peleadores/{id}      DELETE /api/peleadores/{id}
GET    /api/peleadores/{id}/peleas
GET    /api/eventos/{id}/peleas
GET    /api/estadisticas
```

La lista completa de endpoints está en `docs/ANALISIS_Y_DISENO.md` y en `/api/docs`.

## Despliegue en Vercel

1. Subir el proyecto a GitHub.
2. En [vercel.com](https://vercel.com) → **Add New → Project** → importar el repositorio.
3. Dejar la configuración por defecto (Vercel detecta `api/index.py` y `public/` gracias a `vercel.json`) y pulsar **Deploy**.

> ⚠️ **Limitación de SQLite en Vercel:** el sistema de archivos de Vercel es de solo lectura, excepto
> `/tmp`, que es temporal. En producción la aplicación crea la base de datos en `/tmp` con los datos de
> ejemplo; los cambios funcionan (crear, editar, eliminar) mientras la instancia siga activa, pero **pueden
> reiniciarse** cuando Vercel recicle la función. Para persistencia permanente en producción se recomienda
> una base de datos compatible con SQLite en la nube (por ejemplo Turso/libSQL). En ejecución local los
> datos se guardan de forma permanente en `database/mma.db`.

## Autor

Proyecto desarrollado por **<tu nombre>** — Curso de Desarrollo Web con Python.
