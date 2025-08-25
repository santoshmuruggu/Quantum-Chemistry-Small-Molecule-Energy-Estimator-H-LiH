from __future__ import annotations
from typing import Any, Literal, Dict, Optional
import time

from qiskit.primitives import Estimator
from qiskit.quantum_info import SparsePauliOp
from qiskit_algorithms.minimum_eigensolvers import VQE
from qiskit_algorithms.optimizers import SLSQP, COBYLA

def _to_qubit_op(problem: Any, mapper: Any) -> SparsePauliOp:
    op = problem.hamiltonian.second_q_op()
    return mapper.map(op)

def run_vqe(
    problem: Any,
    mapper: Any,
    ansatz: Any,
    init_point: Optional[list] = None,
    optimizer: Literal["SLSQP", "COBYLA"] = "SLSQP",
) -> Dict:
    qubit_op = _to_qubit_op(problem, mapper)

    if optimizer.upper() == "SLSQP":
        opt = SLSQP(maxiter=1000)
    elif optimizer.upper() == "COBYLA":
        opt = COBYLA(maxiter=1000)
    else:
        raise ValueError("Unsupported optimizer for ideal runs")

    if init_point is None:
        vqe = VQE(Estimator(), ansatz=ansatz, optimizer=opt)
    else:
        vqe = VQE(Estimator(), ansatz=ansatz, optimizer=opt, initial_point=init_point)

    t0 = time.time()
    res = vqe.compute_minimum_eigenvalue(operator=qubit_op)
    wall = time.time() - t0

    return {
        "energy": float(res.eigenvalue.real),
        "optimal_parameters": getattr(res, "optimal_parameters", None),
        "eval_count": getattr(res, "cost_function_evals", None),
        "walltime_sec": wall,
    }
