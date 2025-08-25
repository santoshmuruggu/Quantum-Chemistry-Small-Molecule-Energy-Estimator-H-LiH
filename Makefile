.PHONY: h2 lih noisy plots all clean venv

PY=python

h2:
	$(PY) -m src.sweep --molecule H2 --basis sto3g \
	  --r-min 0.4 --r-max 2.4 --r-step 0.1 \
	  --mapping jw --ansatz uccsd --backend ideal \
	  --out results/csv/pec_h2_sto3g.csv
	$(PY) -m src.plotting results/csv/pec_h2_sto3g.csv --out results/figs/pec_h2.png

lih:
	$(PY) -m src.sweep --molecule LiH --basis sto3g \
	  --r-min 1.2 --r-max 2.2 --r-step 0.1 \
	  --freeze-core --active 2e2o --mapping parity \
	  --ansatz uccsd --backend ideal \
	  --out results/csv/pec_lih_sto3g.csv
	$(PY) -m src.plotting results/csv/pec_lih_sto3g.csv --out results/figs/pec_lih.png

noisy:
	$(PY) -m src.vqe_noisy --molecule H2 --basis sto3g --r 0.735 \
	  --shots 8192 --optimizer SPSA --restarts 7 --noise generic

plots:
	$(PY) -m src.plotting results/csv/pec_h2_sto3g.csv --out results/figs/pec_h2.png || true
	$(PY) -m src.plotting results/csv/pec_lih_sto3g.csv --out results/figs/pec_lih.png || true

clean:
	rm -rf results/csv/* results/figs/*

venv:
	python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
