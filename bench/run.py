import argparse
import importlib
import json
import logging
import pandas as pd  # type: ignore
import sys
from typing import Dict, Any

import boela.optimizer  # type: ignore
import boela.problems  # type: ignore


def parse_known_args() -> (argparse.Namespace, Dict[str, Any]):
    parser = argparse.ArgumentParser(description="Run optimization using Boela")

    # Фиксированные параметры
    parser.add_argument("--dimension", type=int, default=2)
    parser.add_argument("--instance_id", type=int, default=0)
    parser.add_argument("--n_iter", type=int, default=10)
    parser.add_argument("--method", type=str, required=True,
                        help="Full import path to algorithm, e.g. algorithms.pso or custom.test")

    # Остальные аргументы — динамические
    known_args, unknown = parser.parse_known_args()
    dynamic_args = {}

    i = 0
    while i < len(unknown):
        if unknown[i].startswith("--"):
            key = unknown[i][2:]
            if i + 1 < len(unknown) and not unknown[i + 1].startswith("--"):
                val = unknown[i + 1]
                i += 1
            else:
                val = "true"
            try:
                if "." in val:
                    val = float(val)
                else:
                    val = int(val)
            except ValueError:
                if val.lower() == "true":
                    val = True
                elif val.lower() == "false":
                    val = False
            dynamic_args[key] = val
        i += 1

    return known_args, dynamic_args


def load_algorithm(full_path: str):
    """Импортирует модуль по строке и возвращает экземпляр Algorithm"""
    logging.info(f"Попытка загрузить алгоритм «{full_path}»…")
    try:
        module = importlib.import_module(full_path)
        if not hasattr(module, "Algorithm"):
            raise ImportError(f"в модуле нет класса Algorithm")
        return module.Algorithm()
    except Exception as e:
        logging.info(f"Не удалось загрузить алгоритм «{full_path}»: {e}")
        return None


def main():
    logging.basicConfig(
        level=logging.INFO,
        format="[%(asctime)s] %(levelname)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        stream=sys.stdout
    )

    logging.info("Запуск скрипта оптимизации.")
    args, dynamic_args = parse_known_args()
    logging.info(f"Фиксированные аргументы: {args}")
    logging.info(f"Динамические аргументы: {dynamic_args}")

    # Инициализация задачи
    logging.info("Создание задачи Rosenbrock.")
    problem_type = boela.problems.bbob.rosenbrock
    problem = problem_type.Problem(dim_x=args.dimension, instance=args.instance_id)

    # Загрузка и инициализация алгоритма
    algorithm = load_algorithm(args.method)
    if algorithm is None:
        return 1

    # Добавление параметров
    full_options = dynamic_args.copy()

    # Специфичный параметр итераций — используем нужное имя
    if "max_iterations" in algorithm.get_options():
        full_options["max_iterations"] = args.n_iter
    elif "n_iter" in algorithm.get_options():
        full_options["n_iter"] = args.n_iter

    full_options.pop("algorithm", None)
    logging.info(f"Параметры алгоритма: {full_options}")
    algorithm.update_options(full_options)

    logging.info(f"Algorithm Name: {algorithm.NAME}")
    logging.info(f"Algorithm Version: {algorithm.VERSION}")
    logging.info(f"Options: {algorithm.get_options()}")

    # Запуск алгоритма
    algorithm.solve(problem)
    logging.info("Оптимизация завершена.")

    # Сбор результатов
    history = pd.DataFrame(
        data=problem.history,
        columns=problem.variable_names + problem.objective_names + problem.constraint_names,
    )
    obj_col = "f[1]" if "f[1]" in history.columns else history.columns[-1]
    best_index = history[obj_col].idxmin()
    best_result = history.loc[best_index].to_dict()

    expected_budget = algorithm.expected_budget(problem)
    actual_budget = history.shape[0]

    results = {
        "algorithm_name": algorithm.NAME,
        "algorithm_version": algorithm.VERSION,
        "parameters": {**vars(args), **dynamic_args},
        "expected_budget": expected_budget,
        "actual_budget": actual_budget,
        "best_result": best_result,
    }

    with open("results.json", "w") as f:
        json.dump(results, f, indent=4)
    history.to_csv("results.csv", index=False)

    logging.info("Результаты сохранены.")


if __name__ == "__main__":
    main()
