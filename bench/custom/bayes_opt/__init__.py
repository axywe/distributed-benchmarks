# https://github.com/fmfn/BayesianOptimization
# https://arxiv.org/pdf/1012.2599v1.pdf


import importlib.metadata

import bayes_opt
import numpy as np
import sklearn.gaussian_process.kernels

from .. import _algorithm


class Algorithm(_algorithm.Algorithm):
    """Bayesian optimization algorithm"""

    VERSION = importlib.metadata.version("bayesian-optimization")

    def __init__(self):
        super(Algorithm, self).__init__(
            options=[
                _algorithm.Option(
                    name="seed",
                    description="Random seed.",
                    value_type="int",
                    default=0,
                ),
                _algorithm.Option(
                    name="verbose",
                    description=" The level of verbosity.",
                    value_type="int",
                    default=0,
                ),
                _algorithm.Option(
                    name="init_points",
                    description="Number of randomly chosen points to sample the target function before fitting the gp.",
                    value_type="int",
                    default=5,
                ),
                _algorithm.Option(
                    name="n_iter",
                    description="Total number of times the process is to repeated.",
                    value_type="int",
                    default=25,
                ),
                _algorithm.Option(
                    name="acq",
                    description="Acquisition function: upper confidence bound (ucb), "
                    "expected improvement (ei), probability  of improvement (poi).",
                    value_type="str",
                    default="ei",
                ),
                _algorithm.Option(
                    name="kappa",
                    description="For ucb",
                    value_type="float",
                    default=2.576,
                ),
                _algorithm.Option(
                    name="xi",
                    description="For ei and poi",
                    value_type="float",
                    default=0.0,
                ),
                _algorithm.Option(
                    name="nu",
                    description="Main parameter of Matern kernel ~(0, 10)",
                    value_type="float",
                    default=2.5,
                ),
                _algorithm.Option(
                    name="init_x",
                    description="Initial sample for variables",
                    value_type="np.ndarray",
                    default=None,
                ),
                _algorithm.Option(
                    name="init_f",
                    description="Initial sample for responses",
                    value_type="np.ndarray",
                    default=None,
                ),
            ]
        )

    def solve(self, problem, options=None):
        """Solve optimization problem."""

        def func(**kwargs):
            x = [value for (key, value) in sorted(kwargs.items())]
            f = problem.calc(x)[0][0]
            return -f if np.isfinite(f) else -(10**30)

        options = self.get_options() | (options or {})
        pbounds = zip(*problem.variable_bounds)
        pbounds = dict(zip(problem.variable_names, pbounds))

        bo = bayes_opt.BayesianOptimization(
            f=func,
            pbounds=pbounds,
            verbose=options["verbose"],
            random_state=options["seed"],
        )

        if options["init_x"] is not None:
            for i in range(len(options["init_x"])):
                xi = bo.space.array_to_params(options["init_x"][i])
                if options["init_f"] is not None:
                    fi = -float(options["init_f"][i])
                    bo.register(params=xi, target=fi)
                else:
                    bo.probe(params=xi, lazy=True)

        bo.set_gp_params(
            kernel=sklearn.gaussian_process.kernels.Matern(nu=options["nu"]),
            normalize_y=True,
        )
        # Solve problem
        bo.maximize(
            init_points=options["init_points"],
            n_iter=options["n_iter"],
            acquisition_function=bayes_opt.util.UtilityFunction(
                kind=options["acq"], xi=options["xi"], kappa=options["kappa"]
            ),
        )

        x = np.array([bo.max["params"][_] for _ in bo.space.keys])
        f = np.array(-bo.max["target"])
        return _algorithm.Solution(x=x, f=f)

    def expected_budget(self, problem, options=None):
        options = self.get_options() | (options or {})
        init_points = options["init_points"]
        n_iter = options["n_iter"]
        return init_points + n_iter