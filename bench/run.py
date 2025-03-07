import argparse
import json
import pandas as pd  # type: ignore
import logging
import sys

import boela.optimizer  # type: ignore
import boela.problems  # type: ignore

import algorithms.pso
import algorithms.bayes_opt

def main():
    # Настройка логирования
    logging.basicConfig(
        level=logging.INFO,
        format="[%(asctime)s] %(levelname)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        stream=sys.stdout
    )
    
    logging.info("Запуск скрипта оптимизации.")

    # Парсинг аргументов командной строки
    parser = argparse.ArgumentParser(description="Run optimization using Boela")
    parser.add_argument("--dimension", type=int, default=2, help="Dimension of the problem")
    parser.add_argument("--instance_id", type=int, default=0, help="Instance ID of the problem")
    parser.add_argument("--n_iter", type=int, default=10, help="Number of iterations for algorithm")
    parser.add_argument("--algorithm", type=int, default=1, help="Algorithm (1 - PSO, иначе байесовская оптимизация)")

    parser.add_argument("--seed", type=int, default=0, help="Random seed")
    parser.add_argument("--n_particles", type=int, default=15, help="Number of particles")
    parser.add_argument("--inertia_start", type=float, default=0.9, help="Initial inertia weight")
    parser.add_argument("--inertia_end", type=float, default=0.4, help="Ending inertia weight")
    parser.add_argument("--nostalgia", type=float, default=2.1, help="Nostalgia weight")
    parser.add_argument("--societal", type=float, default=2.1, help="Societal weight")
    parser.add_argument("--topology", type=str, default="gbest", help="Neighborhood topology")
    parser.add_argument("--tol_thres", type=float, default=None, help="Tolerance stop criteria")
    parser.add_argument("--tol_win", type=int, default=5, help="Tolerance stagnation rate")

    args = parser.parse_args()
    logging.info(f"Аргументы командной строки: {args}")

    # Инициализация задачи
    logging.info("Настройка задачи оптимизации.")
    problem_type = boela.problems.bbob.rosenbrock
    problem = problem_type.Problem(dim_x=args.dimension, instance=args.instance_id)
    logging.info(f"Создан экземпляр задачи с dimension={args.dimension} и instance_id={args.instance_id}.")

    # Выбор алгоритма оптимизации
    logging.info("Выбор алгоритма оптимизации.")
    if args.algorithm == 1:
        algorithm = algorithms.pso.Algorithm()
        logging.info("Выбран алгоритм PSO.")
    else:
        algorithm = algorithms.bayes_opt.Algorithm()
        logging.info("Выбран алгоритм байесовской оптимизации.")

    update_dict = {
        "seed": args.seed,
        "n_particles": args.n_particles,
        "max_iterations": args.n_iter,
        "inertia_start": args.inertia_start,
        "inertia_end": args.inertia_end,
        "nostalgia": args.nostalgia,
        "societal": args.societal,
        "topology": args.topology,
        "tol_thres": args.tol_thres,
        "tol_win": args.tol_win,
    }

    logging.info("Обновление параметров алгоритма.")
    algorithm.update_options(update_dict)

    logging.info(f"Algorithm Name: {algorithm.NAME}")
    logging.info(f"Algorithm Version: {algorithm.VERSION}")
    logging.info(f"Algorithm Options: {algorithm.describe_options()}")

    # Запуск оптимизации
    logging.info("Запуск процесса оптимизации.")
    algorithm.solve(problem)
    logging.info("Процесс оптимизации завершён.")

    # Сбор истории оптимизации в DataFrame
    logging.info("Сбор истории оптимизации в DataFrame.")
    history = pd.DataFrame(
        data=problem.history,
        columns=problem.variable_names + problem.objective_names + problem.constraint_names,
    )
    logging.info(f"DataFrame истории создан, размер: {history.shape}.")

    # Определение столбца с целевой функцией
    if "f" in history.columns:
        obj_col = 'f[1]'
        logging.info("Найден столбец 'f[1]' для целевой функции.")
    else:
        obj_col = history.columns[-1]
        logging.warning(f"Предупреждение: не найден столбец 'f[1]', выбран столбец '{obj_col}' как целевой.")
        logging.info(f"Все столбцы DataFrame: {history.columns.tolist()}")
        logging.info(f"Первые строки DataFrame:\n{history.head()}")

    # Поиск лучшего результата
    best_index = history[obj_col].idxmin()
    best_result = history.loc[best_index].to_dict()
    logging.info(f"Лучший результат найден в строке {best_index}: {best_result}")

    # Подсчёт бюджета вычислений
    expected_budget = algorithm.expected_budget(problem)
    actual_budget = history.shape[0]
    logging.info(f"Ожидаемый бюджет вычислений: {expected_budget}")
    logging.info(f"Фактическое число выполненных вычислений: {actual_budget}")

    # Формирование и сохранение результатов
    results = {
        "algorithm_name": algorithm.NAME,
        "algorithm_version": algorithm.VERSION,
        "parameters": vars(args),
        "expected_budget": expected_budget,
        "actual_budget": actual_budget,
        "best_result": best_result,
    }

    logging.info("Сохранение результатов в файл results.json")
    with open("results.json", "w") as json_file:
        json.dump(results, json_file, indent=4)

    logging.info("Сохранение истории оптимизации в файл results.csv")
    history.to_csv("results.csv", index=False)

    logging.info("Результаты сохранены в файлы results.json и results.csv")
    logging.info("Скрипт оптимизации завершён успешно.")

if __name__ == "__main__":
    main()
