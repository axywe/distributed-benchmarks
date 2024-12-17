CREATE TABLE optimization_results (
    id SERIAL PRIMARY KEY,                     -- Уникальный идентификатор строки
    problem TEXT NOT NULL,                     -- Название задачи
    dim SMALLINT NOT NULL,                     -- Размерность
    n_init SMALLINT NOT NULL,                  -- Количество начальных выборок
    n_iter SMALLINT NOT NULL,                  -- Количество итераций
    metric TEXT NOT NULL,                      -- Название метрики
    solution_f NUMERIC(10, 4) NOT NULL,        -- Значение функции решения
    seed INTEGER NOT NULL,                     -- Значение инициализирующего seed
    iteration INTEGER NOT NULL,                -- Номер итерации
    nu NUMERIC(10, 4),                         -- Параметр (может быть NULL)
    length_scale NUMERIC(10, 4),               -- Масштаб длины (может быть NULL)
    metric_values TEXT,                        -- Метрики
    x TEXT,                                    -- Координаты
    f NUMERIC(10, 4),                          -- Значение целевой функции (может быть NULL)
    f_model NUMERIC(10, 4),                    -- Модельное значение функции (может быть NULL)
    time NUMERIC(10, 6),                       -- Время выполнения в секундах (может быть NULL)
    x_best TEXT,                               -- Лучшие координаты
    f_best NUMERIC(10, 4) NOT NULL             -- Лучшее значение функции
);
