-- ============================================================
--  Octagon Manager - Esquema de base de datos (SQLite)
--  Tablas: categoria_peso, peleador, evento, pelea
-- ============================================================
PRAGMA foreign_keys = ON;

-- Divisiones de peso (Mosca, Gallo, Pluma, ...)
CREATE TABLE IF NOT EXISTS categoria_peso (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre      TEXT    NOT NULL UNIQUE,
    limite_lb   REAL    NOT NULL CHECK (limite_lb > 0),
    limite_kg   REAL    NOT NULL CHECK (limite_kg > 0)
);

-- Atletas registrados. Cada uno compite en una categoría de peso (1:N).
CREATE TABLE IF NOT EXISTS peleador (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre           TEXT    NOT NULL,
    apodo            TEXT,
    pais             TEXT    NOT NULL,
    fecha_nacimiento TEXT    NOT NULL,                       -- AAAA-MM-DD
    altura_cm        INTEGER CHECK (altura_cm  BETWEEN 120 AND 250),
    alcance_cm       INTEGER CHECK (alcance_cm BETWEEN 120 AND 260),
    estilo           TEXT    NOT NULL,                       -- Muay Thai, BJJ, Boxeo...
    activo           INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
    categoria_id     INTEGER NOT NULL,
    FOREIGN KEY (categoria_id) REFERENCES categoria_peso(id) ON DELETE RESTRICT
);

-- Eventos / carteleras.
CREATE TABLE IF NOT EXISTS evento (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre  TEXT NOT NULL,
    fecha   TEXT NOT NULL,                                   -- AAAA-MM-DD
    sede    TEXT NOT NULL,
    ciudad  TEXT NOT NULL,
    pais    TEXT NOT NULL,
    estado  TEXT NOT NULL DEFAULT 'Programado'
            CHECK (estado IN ('Programado', 'Finalizado', 'Cancelado'))
);

-- Peleas. Une evento (N:1) con dos peleadores (rojo y azul) y una categoría.
-- Si la pelea aun no se disputa, ganador_id y metodo son NULL.
CREATE TABLE IF NOT EXISTS pelea (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    evento_id         INTEGER NOT NULL,
    peleador_rojo_id  INTEGER NOT NULL,
    peleador_azul_id  INTEGER NOT NULL,
    categoria_id      INTEGER NOT NULL,
    rounds            INTEGER NOT NULL DEFAULT 3 CHECK (rounds IN (3, 5)),
    es_titulo         INTEGER NOT NULL DEFAULT 0 CHECK (es_titulo IN (0, 1)),
    ganador_id        INTEGER,
    metodo            TEXT CHECK (metodo IS NULL OR metodo IN
                      ('KO/TKO', 'Sumisión', 'Decisión unánime', 'Decisión dividida', 'Empate', 'Sin resultado')),
    round_final       INTEGER CHECK (round_final IS NULL OR round_final BETWEEN 1 AND 5),
    tiempo            TEXT,                                  -- m:ss
    FOREIGN KEY (evento_id)        REFERENCES evento(id)         ON DELETE CASCADE,
    FOREIGN KEY (peleador_rojo_id) REFERENCES peleador(id)       ON DELETE RESTRICT,
    FOREIGN KEY (peleador_azul_id) REFERENCES peleador(id)       ON DELETE RESTRICT,
    FOREIGN KEY (categoria_id)     REFERENCES categoria_peso(id) ON DELETE RESTRICT,
    FOREIGN KEY (ganador_id)       REFERENCES peleador(id)       ON DELETE RESTRICT,
    CHECK (peleador_rojo_id <> peleador_azul_id),
    CHECK (ganador_id IS NULL OR ganador_id IN (peleador_rojo_id, peleador_azul_id))
);

CREATE INDEX IF NOT EXISTS idx_peleador_categoria ON peleador(categoria_id);
CREATE INDEX IF NOT EXISTS idx_pelea_evento       ON pelea(evento_id);
CREATE INDEX IF NOT EXISTS idx_pelea_rojo         ON pelea(peleador_rojo_id);
CREATE INDEX IF NOT EXISTS idx_pelea_azul         ON pelea(peleador_azul_id);
CREATE INDEX IF NOT EXISTS idx_pelea_ganador      ON pelea(ganador_id);
