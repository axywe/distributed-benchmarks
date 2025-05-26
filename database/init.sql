DROP TABLE IF EXISTS optimization_input_parameters;
DROP TABLE IF EXISTS optimization_results;
DROP TABLE IF EXISTS optimization_methods;
DROP TABLE IF EXISTS users;

CREATE TABLE optimization_methods (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    parameters JSONB NOT NULL,
    file_path TEXT NOT NULL DEFAULT ''
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    login TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    "group" TEXT
);

CREATE TABLE optimization_results (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    result_id TEXT NOT NULL UNIQUE,
    method_id INTEGER NOT NULL REFERENCES optimization_methods(id) ON DELETE CASCADE,
    problem TEXT NOT NULL,
    algorithm_name TEXT NOT NULL,
    algorithm_version TEXT NOT NULL,
    dimension INTEGER NOT NULL,
    instance_id INTEGER NOT NULL,
    algorithm INTEGER NOT NULL,
    seed INTEGER NOT NULL,
    expected_budget INTEGER NOT NULL,
    actual_budget INTEGER NOT NULL,
    best_result_x DOUBLE PRECISION[] NOT NULL,
    best_result_f DOUBLE PRECISION NOT NULL
);

CREATE TABLE optimization_input_parameters (
    id SERIAL PRIMARY KEY,
    result_id TEXT NOT NULL REFERENCES optimization_results(result_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    value_text TEXT,
    value_numeric DOUBLE PRECISION,
    type TEXT NOT NULL,
    CONSTRAINT uq_input_param UNIQUE (result_id, name)
);

CREATE INDEX idx_input_param_result ON optimization_input_parameters(result_id);
CREATE INDEX idx_input_param_name_num ON optimization_input_parameters(name, value_numeric);

INSERT INTO optimization_methods (name, parameters) VALUES (
  'algorithms.pso',
  '{
    "max_iterations": { "type": "int", "default": 10 },
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

-- INSERT INTO optimization_methods (name, parameters) VALUES (
--   'algorithms.bayes_opt',
--   '{
--     "seed": { "type": "int", "default": 0 },
--     "verbose": { "type": "int", "default": 0 },
--     "init_points": { "type": "int", "default": 5 },
--     "n_iter": { "type": "int", "default": 25 },
--     "acq": { "type": "string", "default": "ei" },
--     "kappa": { "type": "float", "default": 2.576 },
--     "xi": { "type": "float", "default": 0.0 },
--     "nu": { "type": "float", "default": 2.5 },
--     "init_x": { "type": "string", "default": null, "nullable": true },
--     "init_f": { "type": "string", "default": null, "nullable": true }
--   }'
-- );