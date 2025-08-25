from src.drivers import build_problem
from src.mappings import get_mapper
from src.exact_ref import exact_ground_energy

def test_exact_energy_runs():
    p, _ = build_problem("H2", 0.735, "sto3g", False, (2,2))
    e = exact_ground_energy(p, get_mapper("jw"))
    assert e < 0.0
