-- Удаление старых таблиц
DROP TABLE IF EXISTS optimization_input_parameters;
DROP TABLE IF EXISTS optimization_results;
DROP TABLE IF EXISTS optimization_methods;

-- Таблица методов оптимизации (без изменений)
CREATE TABLE optimization_methods (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    parameters JSONB NOT NULL,
    file_path TEXT NOT NULL DEFAULT ''
);

-- Основная таблица результатов оптимизации
CREATE TABLE optimization_results (
    id SERIAL PRIMARY KEY,
    result_id TEXT NOT NULL UNIQUE,
    method_id INTEGER NOT NULL REFERENCES optimization_methods(id) ON DELETE CASCADE,
    algorithm_name TEXT NOT NULL,
    algorithm_version TEXT NOT NULL,
    dimension INTEGER NOT NULL,
    instance_id INTEGER NOT NULL,
    n_iter INTEGER NOT NULL,
    algorithm INTEGER NOT NULL,
    seed INTEGER NOT NULL,
    expected_budget INTEGER NOT NULL,
    actual_budget INTEGER NOT NULL,
    best_result_x DOUBLE PRECISION[] NOT NULL,
    best_result_f DOUBLE PRECISION NOT NULL
);

-- Новая таблица: входные параметры, которые задаёт пользователь
CREATE TABLE optimization_input_parameters (
    id SERIAL PRIMARY KEY,
    result_id TEXT NOT NULL REFERENCES optimization_results(result_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    value_text TEXT,                -- сырое представление
    value_numeric DOUBLE PRECISION,-- для числовых полей
    type TEXT NOT NULL,             -- "int", "float", "string", "bool"
    CONSTRAINT uq_input_param UNIQUE (result_id, name)
);

-- Индексы для ускорения поиска по входным параметрам
CREATE INDEX idx_input_param_result ON optimization_input_parameters(result_id);
CREATE INDEX idx_input_param_name_num ON optimization_input_parameters(name, value_numeric);

-- Пример вставки метода PSO
INSERT INTO optimization_methods (name, parameters) VALUES (
  'algorithms.pso',
  '{
    "n_particles": { "type": "int", "default": 15 },
    "inertia_start": { "type": "float", "default": 0.9 },
    "inertia_end": { "type": "float", "default": 0.4 },
    "nostalgia": { "type": "float", "default": 2.1 },
    "societal": { "type": "float", "default": 2.1 },
    "topology": { "type": "string", "default": "gbest" },
    "tol_thres": { "type": "float", "default": null, "nullable": true },
    "tol_win": { "type": "int", "default": 5 }
  }'
);


INSERT INTO optimization_methods (name, parameters) VALUES (
  'algorithms.test',
  '{}'
);