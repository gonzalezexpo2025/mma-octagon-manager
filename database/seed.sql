-- Datos de ejemplo (peleadores y eventos ficticios)
PRAGMA foreign_keys = ON;

INSERT INTO categoria_peso (id, nombre, limite_lb, limite_kg) VALUES
 (1, 'Peso Mosca',      125, 56.7),
 (2, 'Peso Gallo',      135, 61.2),
 (3, 'Peso Pluma',      145, 65.8),
 (4, 'Peso Ligero',     155, 70.3),
 (5, 'Peso Welter',     170, 77.1),
 (6, 'Peso Medio',      185, 83.9),
 (7, 'Peso Semipesado', 205, 93.0),
 (8, 'Peso Pesado',     265, 120.2);

INSERT INTO peleador (id, nombre, apodo, pais, fecha_nacimiento, altura_cm, alcance_cm, estilo, activo, categoria_id) VALUES
 (1,  'Mateo Ramírez',     'El Relámpago', 'Costa Rica', '1995-03-14', 168, 173, 'Muay Thai',   1, 1),
 (2,  'Kenji Takahashi',   'Ronin',        'Japón',      '1993-07-02', 165, 170, 'Judo',        1, 1),
 (3,  'Diego Salazar',     'El Cobra',     'Costa Rica', '1994-11-21', 170, 176, 'Jiu-Jitsu',   1, 2),
 (4,  'Rafael Montoya',    'Pantera',      'Colombia',   '1996-01-30', 172, 178, 'Boxeo',       1, 2),
 (5,  'Andrés Villalobos', 'La Máquina',   'Costa Rica', '1992-05-09', 175, 180, 'Lucha',       1, 3),
 (6,  'Lucas Ferreira',    'Furia',        'Brasil',     '1995-09-17', 177, 183, 'Capoeira',    1, 3),
 (7,  'Santiago Herrera',  'El Toro',      'México',     '1991-12-05', 178, 184, 'Boxeo',       1, 4),
 (8,  'Bruno Costa',       'Tiburón',      'Brasil',     '1993-04-25', 180, 185, 'Jiu-Jitsu',   1, 4),
 (9,  'Esteban Quesada',   'Zurdo',        'Costa Rica', '1997-08-12', 179, 182, 'Kickboxing',  1, 4),
 (10, 'Javier Morales',    'El Martillo',  'España',     '1990-02-18', 182, 188, 'Lucha',       1, 5),
 (11, 'Tomás Núñez',       'Cóndor',       'Argentina',  '1994-06-23', 183, 190, 'Muay Thai',   1, 5),
 (12, 'Isaac Brenes',      'Relámpago Jr', 'Costa Rica', '1998-10-03', 181, 186, 'Kickboxing',  1, 5),
 (13, 'Alejandro Vargas',  'El Vikingo',   'Costa Rica', '1992-01-11', 187, 193, 'Lucha',       1, 6),
 (14, 'Marcos Duarte',     'Lobo',         'Portugal',   '1994-03-29', 185, 191, 'Jiu-Jitsu',   1, 6),
 (15, 'Ricardo Solís',     'Titán',        'México',     '1989-07-14', 190, 196, 'Boxeo',       1, 7),
 (16, 'Gabriel Rojas',     'Roca',         'Costa Rica', '1993-12-27', 191, 198, 'Lucha',       1, 7),
 (17, 'Fernando Castillo', 'El Gigante',   'Perú',       '1990-05-06', 196, 203, 'Kickboxing',  1, 8),
 (18, 'Óscar Mora',        'Oso',          'Costa Rica', '1991-09-08', 193, 200, 'Judo',        1, 8);

INSERT INTO evento (id, nombre, fecha, sede, ciudad, pais, estado) VALUES
 (1, 'Octagon Arena 1: Inicio',    '2026-02-14', 'Arena Nacional',          'San José',   'Costa Rica', 'Finalizado'),
 (2, 'Octagon Arena 2: Rivalidad', '2026-05-09', 'Palacio de los Deportes', 'Heredia',    'Costa Rica', 'Finalizado'),
 (3, 'Octagon Arena 3: Fuego',     '2026-08-22', 'Arena del Pacífico',      'Puntarenas', 'Costa Rica', 'Finalizado'),
 (4, 'Octagon Arena 4: Campeones', '2026-11-28', 'Arena Nacional',          'San José',   'Costa Rica', 'Programado');

INSERT INTO pelea (id, evento_id, peleador_rojo_id, peleador_azul_id, categoria_id, rounds, es_titulo, ganador_id, metodo, round_final, tiempo) VALUES
 -- Evento 1
 (1,  1, 1,  2,  1, 3, 0, 1,    'Decisión unánime',  3, '5:00'),
 (2,  1, 3,  4,  2, 3, 0, 4,    'KO/TKO',            2, '3:41'),
 (3,  1, 5,  6,  3, 3, 0, 5,    'Sumisión',          1, '4:12'),
 (4,  1, 7,  8,  4, 5, 1, 7,    'Decisión dividida', 5, '5:00'),
 (5,  1, 13, 14, 6, 3, 0, 13,   'KO/TKO',            1, '1:58'),
 -- Evento 2
 (6,  2, 2,  1,  1, 5, 1, 1,    'Sumisión',          4, '2:27'),
 (7,  2, 8,  9,  4, 3, 0, 8,    'Decisión unánime',  3, '5:00'),
 (8,  2, 10, 11, 5, 3, 0, 10,   'KO/TKO',            3, '0:49'),
 (9,  2, 15, 16, 7, 3, 0, NULL, 'Empate',            3, '5:00'),
 (10, 2, 17, 18, 8, 3, 0, 18,   'KO/TKO',            2, '4:05'),
 -- Evento 3
 (11, 3, 4,  3,  2, 3, 0, 3,    'Decisión unánime',  3, '5:00'),
 (12, 3, 6,  5,  3, 5, 1, 5,    'KO/TKO',            3, '1:33'),
 (13, 3, 11, 12, 5, 3, 0, 11,   'Decisión unánime',  3, '5:00'),
 (14, 3, 9,  7,  4, 3, 0, 7,    'Sumisión',          2, '3:10'),
 (15, 3, 16, 15, 7, 3, 0, 16,   'KO/TKO',            1, '0:37'),
 -- Evento 4 (programado, sin resultado)
 (16, 4, 3,  4,  2, 5, 1, NULL, NULL, NULL, NULL),
 (17, 4, 1,  2,  1, 3, 0, NULL, NULL, NULL, NULL),
 (18, 4, 13, 14, 6, 3, 0, NULL, NULL, NULL, NULL),
 (19, 4, 7,  8,  4, 5, 1, NULL, NULL, NULL, NULL);
