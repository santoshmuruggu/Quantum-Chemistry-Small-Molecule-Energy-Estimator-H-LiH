from src.drivers import build_problem

def test_build_h2():
    problem, meta = build_problem("H2", 0.735, "sto3g", freeze_core=False, active=(2,2))
    assert problem.num_spatial_orbitals >= 2
    assert meta["molecule"] == "H2"
