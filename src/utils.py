from __future__ import annotations
import os, json, time, random, pathlib
from typing import Any, Dict
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
RESULTS = ROOT / "results"
(RESULTS / "csv").mkdir(parents=True, exist_ok=True)
(RESULTS / "figs").mkdir(parents=True, exist_ok=True)

def set_seed(seed: int = 42):
    random.seed(seed)
    np.random.seed(seed)

def now_ts() -> str:
    return time.strftime("%Y-%m-%d %H:%M:%S")

def save_json(obj: Dict[str, Any], path: os.PathLike):
    path = pathlib.Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2)

def ensure_parent(path: os.PathLike):
    pathlib.Path(path).parent.mkdir(parents=True, exist_ok=True)

def pretty_kv(d: Dict[str, Any]) -> str:
    return ", ".join(f"{k}={v}" for k, v in d.items())
