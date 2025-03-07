DROP TABLE IF EXISTS optimization_results;

CREATE TABLE optimization_results (
    id SERIAL PRIMARY KEY,
    algorithm_name TEXT NOT NULL,
    algorithm_version TEXT NOT NULL,
    dimension INTEGER NOT NULL,
    instance_id INTEGER NOT NULL,
    n_iter INTEGER NOT NULL,
    algorithm INTEGER NOT NULL,
    seed INTEGER NOT NULL,
    n_particles INTEGER NOT NULL,
    inertia_start DOUBLE PRECISION NOT NULL,
    inertia_end DOUBLE PRECISION NOT NULL,
    nostalgia DOUBLE PRECISION NOT NULL,
    societal DOUBLE PRECISION NOT NULL,
    topology TEXT NOT NULL,
    tol_thres DOUBLE PRECISION,         -- допускается NULL
    tol_win INTEGER NOT NULL,
    expected_budget INTEGER NOT NULL,
    actual_budget INTEGER NOT NULL,
    best_result_x DOUBLE PRECISION[] NOT NULL,  -- массив для переменных x
    best_result_f DOUBLE PRECISION NOT NULL     -- значение f[1]
);
