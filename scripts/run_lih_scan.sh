#!/usr/bin/env bash
set -euo pipefail
python -m src.sweep --molecule LiH --basis sto3g \
  --r-min 1.2 --r-max 2.2 --r-step 0.1 \
  --freeze-core --active 2e2o --mapping parity \
  --ansatz uccsd --backend ideal \
  --out results/csv/pec_lih_sto3g.csv
python -m src.plotting results/csv/pec_lih_sto3g.csv --out results/figs/pec_lih.png
