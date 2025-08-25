from src.drivers import build_problem
from src.mappings import get_mapper
from src.ansatz import build_ansatz

def test_ansatz_params():
    p, _ = build_problem("H2", 0.735, "sto3g", False, (2,2))
    mapper = get_mapper("jw")
    ansatz, init = build_ansatz(p, mapper)
    assert ansatz.num_parameters == len(init)
