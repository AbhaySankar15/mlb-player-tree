import graph_core as gc
import compute_layout as cl

# Synthetic: A,B share T1 (2019) and T2 (2020); B,C share T3; D alone (T4); E,F share T5 (separate component).
# X traded: T6 with G, T7 with H. Two distinct players with identical names have distinct IDs.
M = [("A", "T1"), ("B", "T1"), ("A", "T2"), ("B", "T2"), ("B", "T3"), ("C", "T3"), ("D", "T4"),
     ("E", "T5"), ("F", "T5"), ("X", "T6"), ("G", "T6"), ("X", "T7"), ("H", "T7"), ("A", "T1")]


def idx():
    return gc.build_index(M)


def test_same_team_season_are_teammates_and_different_not():
    p2t, t2p = idx(); nb = gc.unique_teammates(p2t, t2p)
    assert "B" in nb["A"] and "C" not in nb["A"] and "E" not in nb["A"]


def test_no_self_teammate_and_repeat_overlap_counts_once():
    p2t, t2p = idx(); nb = gc.unique_teammates(p2t, t2p)
    assert "A" not in nb["A"]
    assert len(nb["A"]) == 1  # B shared two team-seasons, counted once


def test_multi_team_career_unions_teammates():
    p2t, t2p = idx(); nb = gc.unique_teammates(p2t, t2p)
    assert nb["X"] == {"G", "H"}
    assert nb["B"] == {"A", "C"}


def test_isolated_player_has_zero_and_is_kept():
    p2t, t2p = idx(); nb = gc.unique_teammates(p2t, t2p)
    assert nb["D"] == set() and "D" in p2t


def test_root_max_degree_and_deterministic_tie_break():
    p2t, t2p = idx(); nb = gc.unique_teammates(p2t, t2p)
    deg = {p: len(s) for p, s in nb.items()}
    assert gc.pick_root(list(p2t), deg) == "B"
    assert gc.pick_root(["F", "E"], deg) == "E"  # tie -> smallest id
    assert gc.pick_root(["E", "F"], deg) == "E"


def test_components_count_and_sizes():
    p2t, t2p = idx(); comps = gc.components(p2t, t2p)
    assert sorted(len(c) for c in comps) == [1, 2, 3, 3]


def test_bfs_distances_parent_and_tree_edges():
    p2t, t2p = idx()
    dist, parent, evid = gc.bfs_tree("A", p2t, t2p)
    assert dist == {"A": 0, "B": 1, "C": 2}
    assert parent["C"] == "B" and parent["A"] is None
    assert evid["C"] == "T3" and evid["B"] == "T1"  # evidence is a shared team-season
    assert len(dist) - 1 == sum(1 for p in parent.values() if p is not None)  # N-1 edges, one parent each


def test_bfs_parent_tiebreak_smallest_id():
    # R shares T1 with P and Q; P and Q share T2 with Z. Parent of Z must be P (smaller id).
    p2t, t2p = gc.build_index([("R", "T1"), ("P", "T1"), ("Q", "T1"), ("P", "T2"), ("Q", "T2"), ("Z", "T2")])
    dist, parent, _ = gc.bfs_tree("R", p2t, t2p)
    assert dist["Z"] == 2 and parent["Z"] == "P"


def test_same_name_different_ids_stay_separate():
    p2t, t2p = gc.build_index([("smithjo01", "T1"), ("smithjo02", "T2")])
    assert len(gc.components(p2t, t2p)) == 2


def test_layout_deterministic_and_all_nodes_placed():
    p2t, t2p = idx()
    dist, parent, _ = gc.bfs_tree("A", p2t, t2p)
    nodes = sorted(dist)
    a, ra = cl.layout_tree(nodes, parent, dist)
    b, rb = cl.layout_tree(nodes, parent, dist)
    assert a == b and set(a) == set(nodes) and a["A"] == (0.0, 0.0)
    offs = cl.place_satellites([(a, ra)], 100.0)
    assert len(offs) == 1
