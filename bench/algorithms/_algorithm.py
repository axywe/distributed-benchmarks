import dataclasses
from typing import Any, Dict, List, Optional

import boela.problems
import numpy as np


@dataclasses.dataclass
class Option:
    """Single option of optimization algorithm"""

    name: str
    description: str
    value_type: str
    default: Any
    value: Optional[Any] = None

    def get_value(self) -> Any:
        """Get the option's value. If not set, returns the default value."""
        if self.value is None:
            return self.default
        else:
            return self.value


@dataclasses.dataclass
class Solution:
    """Optimal values found by optimization algorithm."""

    x: np.ndarray = dataclasses.field(default_factory=lambda: np.array([[]]))
    f: np.ndarray = dataclasses.field(default_factory=lambda: np.array([[]]))
    c: np.ndarray = dataclasses.field(default_factory=lambda: np.array([[]]))
    count: int = 0

    def __post_init__(self):
        self.x = np.atleast_2d(self.x).astype(float)
        self.f = np.atleast_2d(self.f).astype(float)
        self.c = np.atleast_2d(self.c).astype(float)
        self.count = self.x.shape[0]


class Algorithm:
    """Base class for integrating optimization algorithms."""

    VERSION: str = "-"

    def __init__(self, options: List[Option]):
        self.NAME: str = self.__module__
        self._options_by_name: Dict[str, Option] = {
            option.name: option for option in options
        }

    def set_option_value(self, name: str, value=None):
        """Set option values."""
        if name not in self._options_by_name:
            known_options = list(self._options_by_name)
            raise ValueError(
                f"Unknown option name '{name}', "
                f"expected one of the following: {known_options}"
            )
        self._options_by_name[name].value = value

    def update_options(self, options: Optional[Dict[str, Any]] = None):
        """Get the values of all the options."""
        if options is not None:
            for name, value in options.items():
                self.set_option_value(name, value)

    def get_option_value(self, name: str) -> Any:
        """Get the current value of the option."""
        if name not in self._options_by_name:
            known_options = list(self._options_by_name)
            raise ValueError(
                f"Unknown option name '{name}', "
                f"expected one of the following: {known_options}"
            )

        return self._options_by_name[name].get_value()

    def get_options(self, ignore_defaults=False) -> Dict[str, Any]:
        """Get the values of all the options."""
        result = {}
        for name, option in self._options_by_name.items():
            if ignore_defaults and option.value is None:
                continue
            result[name] = option.get_value()
        return result

    def describe_options(self) -> List[Dict[str, Any]]:
        """Get algorithm's options description."""
        result = []
        for option in self._options_by_name.values():
            option_data = dataclasses.asdict(option)
            option_data.pop("value")
            result.append(option_data)
        return result

    def solve(
        self,
        problem: boela.problems.ProblemBase,
        options: Optional[Dict[str, Any]] = None,
    ):
        """Solve optimization problem."""
        raise NotImplementedError("Method not implemented")

    def expected_budget(
        self,
        problem: boela.problems.ProblemBase,
        options: Optional[Dict[str, Any]] = None,
    ) -> int:
        """Estimate expected number of optimization problem calls."""
        raise NotImplementedError("Method not implemented")