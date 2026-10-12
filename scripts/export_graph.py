"""Build the full pipeline and export public/data/graph.json (+ data/work/build.json for validation)."""
import json, os, sys, time, datetime
sys.path.insert(0, os.path.dirname(__file__))
import graph_core as gc
import normalize_data as nd
import compute_layout as cl

SOURCE_VERSION = "SABR Lahman Baseball Database 2025 (released 2026-01-02)"


def build(raw=nd.RAW):
    t0 = time.time()
    people, app, teams = nd.load(raw)
    pl, ts, mem = nd.normalize(people, app, teams)
    p2t, t2p = gc.build_index(zip(mem.playerID, mem.teamSeasonId))
    nbrs = gc.unique_teammates(p2t, t2p)
    degree = {p: len(s) for p, s in nbrs.items()}
    comps = gc.components(p2t, t2p)
    global_root = gc.pick_root(list(p2t), degree)
    # main component = the one containing the global root; rest sorted by size desc then root id
    main = next(c for c in comps if global_root in set(c))
    others = [c for c in comps if c is not main]
    roots = {id(main): global_root}
    for c in others:
        roots[id(c)] = gc.pick_root(c, degree)
    others.sort(key=lambda c: (-len(c), roots[id(c)]))
    ordered = [main] + others
    dist, parent, evid, comp_of, lay = {}, {}, {}, {}, []
    for ci, c in enumerate(ordered):
        d, p, e = gc.bfs_tree(roots[id(c)], p2t, t2p)
        dist.update(d); parent.update(p); evid.update(e)
        for n in c:
            comp_of[n] = ci
        lay.append(cl.layout_tree(c, p, d))
    main_pos, main_rad = lay[0]
    offs = cl.place_satellites(lay[1:], main_rad)
    pos = dict(main_pos)
    for (cp, _), (ox, oy) in zip(lay[1:], offs):
        for n, (x, y) in cp.items():
            pos[n] = (x + ox, y + oy)
    return dict(pl=pl, ts=ts, mem=mem, p2t=p2t, t2p=t2p, degree=degree, comps=ordered, roots=[roots[id(c)] for c in ordered],
                root=global_root, dist=dist, parent=parent, evid=evid, comp_of=comp_of, pos=pos, secs=time.time() - t0)


def export(b, out="public/data/graph.json"):
    pl = b["pl"]
    ids = list(pl.playerID)
    idx = {p: i for i, p in enumerate(ids)}
    tsl = sorted(b["ts"].teamSeasonId)
    tidx = {t: i for i, t in enumerate(tsl)}
    r2 = lambda v: round(v, 1)  # 0.1 layout units (lane pitch is 4) keeps JSON ~5% smaller
    depthCounts = {}
    for d in b["dist"].values():
        depthCounts[d] = depthCounts.get(d, 0) + 1
    main_dist = [b["dist"][p] for p in b["comps"][0]]
    isolated = sum(1 for c in b["comps"] if len(c) == 1)
    meta = dict(
        sourceVersion=SOURCE_VERSION, dataCoverageStart=int(pl.debutYear.min()), dataCoverageEnd=int(pl.finalYear.max()),
        totalPlayers=len(ids), totalTeamSeasons=len(tsl), totalMemberships=len(b["mem"]),
        rootPlayerId=b["root"], rootIndex=idx[b["root"]], rootName=pl.fullName[idx[b["root"]]],
        rootTeammateCount=b["degree"][b["root"]], componentCount=len(b["comps"]), isolatedPlayerCount=isolated,
        largestComponentSize=len(b["comps"][0]), maximumSeparation=max(b["dist"].values()),
        mainComponentMaxSeparation=max(main_dist), depthCounts=[depthCounts[k] for k in sorted(depthCounts)],
        treeEdgeCount=len(ids) - len(b["comps"]), generatedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
    )
    P = lambda f: [f(p) for p in ids]
    players = dict(
        id=ids, name=list(pl.fullName), x=P(lambda p: r2(b["pos"][p][0])), y=P(lambda p: r2(b["pos"][p][1])),
        depth=P(lambda p: b["dist"][p]), parent=P(lambda p: -1 if b["parent"][p] is None else idx[b["parent"][p]]),
        evidence=P(lambda p: -1 if b["evid"][p] is None else tidx[b["evid"][p]]), degree=P(lambda p: b["degree"][p]),
        comp=P(lambda p: b["comp_of"][p]), debut=list(map(int, pl.debutYear)), final=list(map(int, pl.finalYear)),
        leagues=list(pl.leagues), seasons=list(map(int, pl.teamSeasonCount)),
    )
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w") as f:
        json.dump(dict(meta=meta, teamSeasons=tsl, players=players), f, separators=(",", ":"))
    # Rosters for client-side any-to-any shortest paths: ts[i] = sorted player indices on teamSeasons[i].
    with open(os.path.join(os.path.dirname(out), "memberships.json"), "w") as f:
        json.dump(dict(ts=[sorted(idx[p] for p in b["t2p"][t]) for t in tsl]), f, separators=(",", ":"))
    return meta


if __name__ == "__main__":
    b = build()
    m = export(b)
    m["pipelineSeconds"] = round(b["secs"], 2)
    print(json.dumps(m, indent=1))
