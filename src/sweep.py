from __future__ import annotations
import argparse, csv, re
from pathlib import Path
from typing import Tuple, Optional, List

from .drivers import build_problem
from .mappings import get_mapper
from .ansatz import build_ansatz
from .vqe_runner import run_vqe
from .exact_ref import exact_ground_energy
from .utils import ensure_parent

def parse_active(arg: Optional[str]) -> Optional[Tuple[int, int]]:
    if not arg:
        return None
    m = re.fullmatch(r"(\d+)e(\d+)o", arg.strip().lower())
    if not m:
        raise SystemExit("--active expects format like 2e2o")
    return int(m.group(1)), int(m.group(2))

def linspace_inclusive(a: float, b: float, step: float) -> List[float]:
    n = int(round((b - a) / step)) + 1
    return [round(a + i * step, 10) for i in range(n)]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--molecule", required=True, choices=["H2", "LiH"])
    ap.add_argument("--basis", default="sto3g")
    ap.add_argument("--r", type=float)
    ap.add_argument("--r-min", type=float)
    ap.add_argument("--r-max", type=float)
    ap.add_argument("--r-step", type=float, default=0.1)
    ap.add_argument("--freeze-core", action="store_true")
    ap.add_argument("--active", type=str, help="e.g., 2e2o")
    ap.add_argument("--mapping", default="jw", choices=["jw", "parity"])
    ap.add_argument("--ansatz", default="uccsd")
    ap.add_argument("--backend", default="ideal", choices=["ideal"])
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    act = parse_active(args.active)

    if args.r is not None:
        r_values = [args.r]
    else:
        if args.r_min is None or args.r_max is None:
            raise SystemExit("Provide --r or (--r-min and --r-max)")
        r_values = linspace_inclusive(args.r_min, args.r_max, args.r_step)

    rows = [("bond_length_angstrom", "vqe_energy_ha", "exact_energy_ha", "delta_ha")]

    for r in r_values:
        problem, _ = build_problem(args.molecule, r, args.basis, args.freeze_core, act)
        mapper = get_mapper(args.mapping)
        ansatz, init_point = build_ansatz(problem, mapper, args.ansatz)
        vqe_res = run_vqe(problem, mapper, ansatz, init_point, optimizer="SLSQP")
        exact_e = exact_ground_energy(problem, mapper)
        delta = vqe_res["energy"] - exact_e
        print(f"R={r:5.3f} Å | VQE={vqe_res['energy']:.6f} Ha | Exact={exact_e:.6f} Ha | Δ={delta:.6f} Ha")
        rows.append((r, vqe_res["energy"], exact_e, delta))

    out = Path(args.out)
    ensure_parent(out)
    with open(out, "w", newline="", encoding="utf-8") as f:
        csv.writer(f).writerows(rows)

if __name__ == "__main__":
    main()
