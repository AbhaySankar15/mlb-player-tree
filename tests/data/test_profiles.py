import json, os
import pandas as pd
import pytest
import build_profiles as bp

TS = {"2000-AL-AAA": 0, "2000-NL-BBB": 1, "2001-AL-AAA": 2}


def frame(rows, cols):
    return pd.DataFrame(rows, columns=["playerID", "yearID", "stint", "teamID", "lgID"] + cols, dtype=str)


def test_stints_for_same_team_season_are_summed():
    df = frame([["p1", "2000", "1", "AAA", "AL", "10", "5"], ["p1", "2000", "2", "AAA", "AL", "3", "2"]], ["G", "H"])
    g = bp._agg(df, ["G", "H"], TS)
    assert len(g) == 1 and g.G.iloc[0] == 13 and g.H.iloc[0] == 7


def test_different_teams_same_year_stay_separate():
    df = frame([["p1", "2000", "1", "AAA", "AL", "10", "5"], ["p1", "2000", "2", "BBB", "NL", "3", "2"]], ["G", "H"])
    g = bp._agg(df, ["G", "H"], TS)
    assert sorted(g.tsi) == [0, 1]


def test_missing_values_stay_null_not_zero():
    df = frame([["p1", "2000", "1", "AAA", "AL", "10", ""]], ["G", "SB"])
    rows = bp.rows_by_player(bp._agg(df, ["G", "SB"], TS), ["G", "SB"])
    assert rows["p1"] == [[0, 10, None]]


def test_same_playerid_different_players_not_merged():
    df = frame([["p1", "2000", "1", "AAA", "AL", "10"], ["p2", "2000", "1", "AAA", "AL", "7"]], ["G"])
    rows = bp.rows_by_player(bp._agg(df, ["G"], TS), ["G"])
    assert rows["p1"] == [[0, 10]] and rows["p2"] == [[0, 7]]


real = pytest.mark.skipif(not os.path.exists("public/data/profiles/p0.json"), reason="run scripts/build_profiles.py first")


@real
def test_real_career_totals_match_raw_csv():
    g = json.load(open("public/data/graph.json"))
    ids = g["players"]["id"]
    raw = pd.read_csv("data/raw/Pitching.csv", encoding="utf-8-sig", keep_default_na=False, dtype=str)
    teams = json.load(open("public/data/teams.json"))
    checked = 0
    for pid in ["hillri01", "paigesa01", ids[0], ids[-1]]:
        i = ids.index(pid)
        prof = json.load(open(f"public/data/profiles/p{i // teams['chunk']}.json"))[pid]
        sub = raw[raw.playerID == pid]
        if len(sub):
            so_col = teams["pit"].index("SO")
            assert sum(r[1 + so_col] or 0 for r in prof["pit"]) == pd.to_numeric(sub.SO, errors="coerce").sum()
            checked += 1
        assert all(0 <= a[0] < len(g["teamSeasons"]) for a in prof["apps"])
    assert checked >= 2


@real
def test_every_player_has_a_profile_with_teams():
    g = json.load(open("public/data/graph.json"))
    teams = json.load(open("public/data/teams.json"))
    assert len(teams["name"]) == len(g["teamSeasons"])
    n = 0
    for c in range((len(g["players"]["id"]) + teams["chunk"] - 1) // teams["chunk"]):
        part = json.load(open(f"public/data/profiles/p{c}.json"))
        n += len(part)
        assert all(p["apps"] for p in part.values())
    assert n == len(g["players"]["id"])
