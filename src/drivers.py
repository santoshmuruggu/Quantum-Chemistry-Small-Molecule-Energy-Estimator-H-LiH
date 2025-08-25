from __future__ import annotations
from typing import Tuple, Optional, Dict, Any, List

from qiskit_nature.units import DistanceUnit
from qiskit_nature.second_q.drivers import PySCFDriver
from qiskit_nature.second_q.transformers import ActiveSpaceTransformer, FreezeCoreTransformer

class BuildError(RuntimeError):
    pass

def _geom_for(molecule: str, r: float) -> List[tuple[str, List[float]]]:
    m = molecule.lower()
    if m == "h2":
        return [("H", [0.0, 0.0, 0.0]), ("H", [0.0, 0.0, r])]
    if m == "lih":
        return [("Li", [0.0, 0.0, 0.0]), ("H", [0.0, 0.0, r])]
    raise BuildError(f"Unsupported molecule: {molecule}")

def _atom_string(geom: List[tuple[str, List[float]]]) -> str:
    # Format required by PySCFDriver in qiskit-nature 0.7.x
    parts = []
    for sym, (x, y, z) in geom:
        parts.append(f"{sym} {x:.12f} {y:.12f} {z:.12f}")
    return "; ".join(parts)

def build_problem(
    molecule: str,
    r: float,
    basis: str = "sto3g",
    freeze_core: bool = False,
    active: Optional[Tuple[int, int]] = None,  # (active_electrons, active_spatial_orbitals)
) -> Tuple[Any, Dict[str, Any]]:
    """
    Construct an ElectronicStructureProblem with optional transformers.
    Returns (problem, meta).
    """
    geom = _geom_for(molecule, r)
    atom = _atom_string(geom)

    driver = PySCFDriver(
        atom=atom,
        unit=DistanceUnit.ANGSTROM,
        charge=0,
        spin=0,         # multiplicity 1
        basis=basis,
    )
    problem = driver.run()  # ElectronicStructureProblem

    if freeze_core:
        problem = FreezeCoreTransformer().transform(problem)

    if active is not None:
        ne, nso = active
        problem = ActiveSpaceTransformer(num_electrons=ne, num_spatial_orbitals=nso).transform(problem)

    meta = {
        "molecule": molecule,
        "r_angstrom": float(r),
        "basis": basis,
        "freeze_core": bool(freeze_core),
        "active": active,
        "num_particles": problem.num_particles,
        "num_spatial_orbitals": problem.num_spatial_orbitals,
        "num_spin_orbitals": problem.num_spatial_orbitals * 2,
    }
    return problem, meta
