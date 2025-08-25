from __future__ import annotations
from typing import Literal
from qiskit_nature.second_q.mappers import JordanWignerMapper, ParityMapper

def get_mapper(name: Literal["jw", "parity"]):
    name = name.lower()
    if name == "jw":
        return JordanWignerMapper()
    if name == "parity":
        return ParityMapper()
    raise ValueError(f"Unknown mapping: {name}")

# Note: 2-qubit reduction is NOT auto-applied here to keep this template stable across versions.
# Add TaperedQubitMapper later if you want parity+two-qubit reduction.
