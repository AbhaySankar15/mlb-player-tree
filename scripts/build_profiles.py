"""Build lazily-loaded player profile chunks (bio, per-team-season batting/pitching lines) and teams.json.

Output (public/data/): profiles/p<chunk>.json  (CHUNK players each, chunk = graph index // CHUNK)
                       teams.json              (columns parallel to graph.json teamSeasons)
Stats are summed over stints for the same player/team-season. Empty source cells stay null (never coerced to 0).
"""
import json, os
import pandas as pd

CHUNK = 400
BAT = ["G", "AB", "R", "H", "2B", "3B", "HR", "RBI", "SB", "CS", "BB", "SO", "IBB", "HBP", "SH", "SF", "GIDP"]
PIT = ["W", "L", "G", "GS", "CG", "SHO", "SV", "IPouts", "H", "ER", "HR", "BB", "SO", "BFP"]
POS = {"P": "G_p", "C": "G_c", "1B": "G_1b", "2B": "G_2b", "3B": "G_3b", "SS": "G_ss", "LF": "G_lf", "CF": "G_cf", "RF": "G_rf", "DH": "G_dh"}
BIO = ["nameGiven", "birthYear", "birthCity", "birthState", "birthCountry", "deathYear", "height", "weight", "bats", "throws", "debut", "finalGame", "bbrefID"]


def _num(s):
    return pd.to_numeric(s, errors="coerce")


def _agg(df, cols, tsmap):
    """Sum stints per (player, team-season); a column is null only if every stint is empty."""
    d = df.copy()
    d["ts"] = d.yearID + "-" + d.lgID + "-" + d.teamID
    for c in cols:
        d[c] = _num(d[c])
    g = d.groupby(["playerID", "ts"], sort=True)[cols].sum(min_count=1).reset_index()
    g["tsi"] = g.ts.map(tsmap)
    return g


def rows_by_player(g, cols):
    out = {}
    arr = g[["playerID", "tsi"] + cols].to_numpy(dtype=object)
    for rec in arr:
        out.setdefault(rec[0], []).append([int(rec[1])] + [None if pd.isna(v) else int(v) for v in rec[2:]])
    return out


def build(raw, ids, teamseasons):
    rd = lambda f: pd.read_csv(f"{raw}/{f}.csv", encoding="utf-8-sig", keep_default_na=False, dtype=str, low_memory=False)
    people, app, teams, bat, pit = rd("People"), rd("Appearances"), rd("Teams"), rd("Batting"), rd("Pitching")
    tsmap = {t: i for i, t in enumerate(teamseasons)}
    # team columns parallel to teamSeasons
    teams["ts"] = teams.yearID + "-" + teams.lgID + "-" + teams.teamID
    t = teams.drop_duplicates("ts").set_index("ts")
    tcols = {"name": [], "w": [], "l": [], "rank": []}
    for ts in teamseasons:
        r = t.loc[ts] if ts in t.index else None
        tcols["name"].append(r["name"] if r is not None else "")
        for k, c in (("w", "W"), ("l", "L"), ("rank", "Rank")):
            v = _num(pd.Series([r[c]])).iloc[0] if r is not None else float("nan")
            tcols[k].append(None if pd.isna(v) else int(v))
    # participation
    app["ts"] = app.yearID + "-" + app.lgID + "-" + app.teamID
    app["tsi"] = app.ts.map(tsmap)
    for c in ["G_all"] + list(POS.values()):
        app[c] = _num(app[c])
    apps = {}
    for pid, tsi, g in app[["playerID", "tsi", "G_all"]].sort_values(["playerID", "tsi"]).itertuples(index=False):
        apps.setdefault(pid, []).append([int(tsi), None if pd.isna(g) else int(g)])
    posg = app.groupby("playerID")[list(POS.values())].sum()
    bg, pg = _agg(bat, BAT, tsmap), _agg(pit, PIT, tsmap)
    brow, prow = rows_by_player(bg, BAT), rows_by_player(pg, PIT)
    pp = people.set_index("playerID")
    profiles = {}
    for pid in ids:
        bio = {k: (pp.at[pid, k] or None) for k in BIO}
        pos = posg.loc[pid]
        top = pos.idxmax() if pos.max() > 0 else None
        prof = {"bio": bio, "apps": apps.get(pid, [])}
        if top:
            prof["pos"] = next(k for k, v in POS.items() if v == top)
        if pid in brow: prof["bat"] = brow[pid]
        if pid in prow: prof["pit"] = prow[pid]
        profiles[pid] = prof
    return profiles, tcols, dict(batRows=len(bg), pitRows=len(pg))


def write(profiles, ids, tcols, out="public/data"):
    os.makedirs(f"{out}/profiles", exist_ok=True)
    for f in os.listdir(f"{out}/profiles"):
        os.remove(f"{out}/profiles/{f}")
    n = (len(ids) + CHUNK - 1) // CHUNK
    for c in range(n):
        part = {pid: profiles[pid] for pid in ids[c * CHUNK:(c + 1) * CHUNK]}
        json.dump(part, open(f"{out}/profiles/p{c}.json", "w"), separators=(",", ":"))
    json.dump(dict(bat=BAT, pit=PIT, chunk=CHUNK, **tcols), open(f"{out}/teams.json", "w"), separators=(",", ":"))
    return n


if __name__ == "__main__":
    import sys
    sys.path.insert(0, os.path.dirname(__file__))
    g = json.load(open("public/data/graph.json"))
    ids, tsl = g["players"]["id"], g["teamSeasons"]
    prof, tc, st = build("data/raw", ids, tsl)
    print("chunks", write(prof, ids, tc), st)
