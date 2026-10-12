import os, pytest
import export_graph as eg
import normalize_data as nd

pytestmark = pytest.mark.skipif(not os.path.exists("data/raw/Appearances.csv"), reason="run scripts/download_data.py first")


@pytest.fixture(scope="module")
def b():
    return eg.build()


def test_negro_leagues_included(b):
    lg = set(b["ts"].leagueId)
    assert {"NNL", "NAL"} <= lg and len(lg & nd.NEGRO) >= 5


def test_national_association_not_dropped(b):
    assert "NA" in set(b["ts"].leagueId)  # 'NA' must not be parsed as NaN


def test_all_appearance_players_present_once(b):
    assert len(b["pl"]) == b["pl"].playerID.nunique() == len(b["dist"])


def test_root_is_argmax_degree(b):
    assert b["degree"][b["root"]] == max(b["degree"].values())


def test_tree_edge_count(b):
    assert sum(1 for p in b["parent"].values() if p is not None) == len(b["dist"]) - len(b["comps"])
