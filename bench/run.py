import argparse
import boela.optimizer
import boela.problems
import algorithms.bayes_opt
import pandas as pd
import json

# Argument parser
parser = argparse.ArgumentParser(description="Run optimization using Boela")
parser.add_argument("--dimension", type=int, default=2, help="Dimension of the problem")
parser.add_argument("--instance_id", type=int, default=0, help="Instance ID of the problem")
parser.add_argument("--init_points", type=int, default=5, help="Initial points for algorithm")
parser.add_argument("--n_iter", type=int, default=10, help="Number of iterations for algorithm")

args = parser.parse_args()

# Problem settings
dimension = args.dimension
instance_id = args.instance_id
problem_type = boela.problems.bbob.rosenbrock
problem: boela.problems.ProblemBase = problem_type.Problem(dim_x=dimension, instance=instance_id)

# Algorithm settings
algorithm = algorithms.bayes_opt.Algorithm()
algorithm.update_options({
    "init_points": args.init_points,
    "n_iter": args.n_iter
})

print(algorithm.NAME)
print(algorithm.VERSION)
print(algorithm.describe_options())

# Solve problem
algorithm.solve(problem)
history = pd.DataFrame(
    data=problem.history,
    columns=problem.variable_names + problem.objective_names + problem.constraint_names,
)

actual_budget = history.shape[0]
expected_budget = algorithm.expected_budget(problem)
print(history.to_markdown())
print(expected_budget, actual_budget)

# Сохранение результатов в файл Excel в формате .xlsx
xlsx_file = "results.xlsx"
json_file = "results.json"
history.to_excel(xlsx_file, index=False)

# Сохранение результатов в JSON
results_json = {
    "algorithm_name": algorithm.NAME,
    "algorithm_version": algorithm.VERSION,
    "dimension": dimension,
    "instance_id": instance_id,
    "expected_budget": expected_budget,
    "actual_budget": actual_budget,
    "history": history.to_dict(orient="records")
}

with open(json_file, "w") as f:
    json.dump(results_json, f, indent=4)

print(f"Results saved to {xlsx_file} and {json_file}")
