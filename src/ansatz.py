from __future__ import annotations
from typing import Any, Optional
import numpy as np
from qiskit_nature.second_q.circuit.library import UCCSD, HartreeFock

def build_ansatz(problem: Any, mapper: Any, name: str = "uccsd"):
    if name.lower() != "uccsd":
        raise ValueError("Only UCCSD is supported in this template.")

    num_spatial_orbitals = problem.num_spatial_orbitals
    num_particles = problem.num_particles

    hf = HartreeFock(num_spatial_orbitals, num_particles, mapper)

    # Qiskit Nature 0.7.x expects num_spatial_orbitals (NOT num_spin_orbitals)
    ansatz = UCCSD(
        num_spatial_orbitals=num_spatial_orbitals,
        num_particles=num_particles,
        qubit_mapper=mapper,
        initial_state=hf,
    )

    # Some versions don’t expose .initial_point(); fall back to zeros
    try:
        init_point = ansatz.initial_point()
    except Exception:
        try:
            init_point = np.zeros(ansatz.num_parameters, dtype=float)
        except Exception:
            init_point = None  # worst case: let VQE pick defaults

    return ansatz, init_point
