# https://github.com/willfurnass/pyshoal
import numpy as np

from .. import _algorithm
from . import _pso_core


class Algorithm(_algorithm.Algorithm):
    """PSO optimization algorithm"""

    VERSION = "0.1"

    def __init__(self):
        super(Algorithm, self).__init__(
            options=[
                _algorithm.Option(
                    name="seed",
                    description="Random seed",
                    value_type="int",
                    default=0,
                ),
                _algorithm.Option(
                    name="n_particles",
                    description="Number of particles",
                    value_type="int",
                    default=15,
                ),
                _algorithm.Option(
                    name="max_iterations",
                    description="Maximum iterations",
                    value_type="int",
                    default=100,
                ),
                _algorithm.Option(
                    name="inertia_start",
                    description="Initial inertia weight",
                    value_type="float",
                    default=0.9,
                ),
                _algorithm.Option(
                    name="inertia_end",
                    description="Ending inertia weight",
                    value_type="float",
                    default=0.4,
                ),
                _algorithm.Option(
                    name="nostalgia",
                    description="Nostalgia weight",
                    value_type="float",
                    default=2.1,
                ),
                _algorithm.Option(
                    name="societal",
                    description="Societal weight",
                    value_type="float",
                    default=2.1,
                ),
                _algorithm.Option(
                    name="topology",
                    description="Neighborhood topology",
                    value_type="string",
                    default="gbest",
                ),
                _algorithm.Option(
                    name="tol_thres",
                    description="Tolerance stop criteria",
                    value_type="float",
                    default=None,
                ),
                _algorithm.Option(
                    name="tol_win",
                    description="Tolerance stagnation rate",
                    value_type="int",
                    default=5,
                ),
            ]
        )

    def solve(self, problem, options=None):
        """Solve optimization problem."""

        # Extract objective function
        def func(*x):
            outputs = problem.calc(x)
            f = outputs[0][0]
            return 10**30 if np.isnan(f) else f

        # Set run options
        options = self.get_options() | (options or {})

        np.random.seed(options.pop("seed"))
        keys_run = ["max_iterations", "tol_thres", "tol_win"]
        kwargs_init, kwargs_run = {}, {}
        for name, value in options.items():
            (kwargs_run if name in keys_run else kwargs_init)[name] = value

        # Solve problem
        pso = _pso_core.PSO(
            obj_func=func,
            box_bounds=list(map(list, zip(*problem.variable_bounds))),
            **kwargs_init
        )
        result = pso.run(**kwargs_run)

        # Return result
        return _algorithm.Solution(x=result[0], f=result[1])

    def expected_budget(self, problem, options=None):
        options = self.get_options() | (options or {})
        n_particles = options["n_particles"]
        max_iterations = options["max_iterations"]
        return n_particles * (max_iterations + 1)