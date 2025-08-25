from __future__ import annotations
import argparse, math, time

from qiskit_aer import AerSimulator
from qiskit_aer.noise import NoiseModel, depolarizing_error, ReadoutError
from qiskit.primitives import BackendEstimator
from qiskit_algorithms.minimum_eigensolvers import VQE
from qiskit_algorithms.optimizers import SPSA

from .drivers import build_problem
from .mappings import get_mapper
from .ansatz import build_ansatz

def build_generic_noise_model(p1: float = 0.001, p2: float = 0.01) -> NoiseModel:
    nm = NoiseModel()
    de1 = depolarizing_error(p1, 1)
    de2 = depolarizing_error(p2, 2)
    ro = ReadoutError([[1 - p1, p1], [p1, 1 - p1]])
    for g in ["x", "y", "z", "h", "s", "sdg", "t", "tdg"]:
        nm.add_all_qubit_quantum_error(de1, g)
    for g in ["cx", "cz"]:
        nm.add_all_qubit_quantum_error(de2, g)
    nm.add_all_qubit_readout_error(ro)
    return nm

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--molecule", required=True, choices=["H2", "LiH"])
    ap.add_argument("--basis", default="sto3g")
    ap.add_argument("--r", type=float, required=True)
    ap.add_argument("--mapping", default="jw", choices=["jw", "parity"])
    ap.add_argument("--shots", type=int, default=8192)
    ap.add_argument("--optimizer", default="SPSA", choices=["SPSA"])
    ap.add_argument("--restarts", type=int, default=3)
    ap.add_argument("--noise", default="generic", choices=["generic", "none"])
    args = ap.parse_args()

    problem, _ = build_problem(
        args.molecule, args.r, args.basis,
        freeze_core=(args.molecule == "LiH"),
        active=(2, 2) if args.molecule in ("H2", "LiH") else None,
    )
    mapper = get_mapper(args.mapping)
    ansatz, _ = build_ansatz(problem, mapper, "uccsd")

    backend = AerSimulator(noise_model=build_generic_noise_model() if args.noise == "generic" else None)
    est = BackendEstimator(backend=backend, options={"shots": args.shots})

    best_e = math.inf
    best = None
    for k in range(args.restarts):
        spsa = SPSA(maxiter=300, blocking=True, trust_region=True)
        vqe = VQE(estimator=est, ansatz=ansatz, optimizer=spsa)
        t0 = time.time()
        res = vqe.compute_minimum_eigenvalue(operator=mapper.map(problem.hamiltonian.second_q_op()))
        wall = time.time() - t0
        e = float(res.eigenvalue.real)
        if e < best_e:
            best_e = e
            best = {"restart": k + 1, "energy": e, "walltime_sec": wall}
        print(f"[restart {k+1}/{args.restarts}] energy = {e:.6f} Ha (wall {wall:.1f}s)")

    print("=== Best ===", best)

if __name__ == "__main__":
    main()
