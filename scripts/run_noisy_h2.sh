#!/usr/bin/env bash
set -euo pipefail
python -m src.vqe_noisy --molecule H2 --basis sto3g --r 0.735 \
  --shots 8192 --optimizer SPSA --restarts 7 --noise generic
