from __future__ import annotations
import argparse
from pathlib import Path
import pandas as pd
import matplotlib.pyplot as plt

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("csv_path")
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    df = pd.read_csv(args.csv_path)
    if "bond_length_angstrom" not in df.columns:
        raise SystemExit("CSV needs 'bond_length_angstrom' column")

    plt.figure()
    plt.plot(df["bond_length_angstrom"], df["vqe_energy_ha"], label="VQE")
    if "exact_energy_ha" in df.columns:
        plt.plot(df["bond_length_angstrom"], df["exact_energy_ha"], linestyle="--", label="Exact")
    plt.xlabel("Bond length (Å)")
    plt.ylabel("Energy (Ha)")
    plt.title("Potential Energy Curve")
    plt.legend()
    plt.grid(True, alpha=0.3)

    if args.out:
        Path(args.out).parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(args.out, dpi=180, bbox_inches="tight")
    else:
        plt.show()

if __name__ == "__main__":
    main()
