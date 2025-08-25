from __future__ import annotations
from typing import Any
from qiskit_algorithms.minimum_eigensolvers import NumPyMinimumEigensolver

def exact_ground_energy(problem: Any, mapper: Any) -> float:
    """
    Exact energy via diagonalizing the mapped qubit Hamiltonian.
    Works across qiskit-nature 0.7.x without factories.
    """
    qubit_op = mapper.map(problem.hamiltonian.second_q_op())
    solver = NumPyMinimumEigensolver()
    res = solver.compute_minimum_eigenvalue(operator=qubit_op)
    return float(res.eigenvalue.real)
