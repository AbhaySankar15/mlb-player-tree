"""Core graph algorithms over the team-season incidence structure (no pairwise edge materialization)."""
from collections import defaultdict


def build_index(memberships):
    """memberships: iterable of (playerId, teamSeasonId). Returns (player_ts, ts_players) with sorted lists."""
    p2t, t2p = defaultdict(set), defaultdict(set)
    for p, t in memberships:
        p2t[p].add(t)
        t2p[t].add(p)
    return ({p: sorted(v) for p, v in p2t.items()}, {t: sorted(v) for t, v in t2p.items()})


def unique_teammates(p2t, t2p):
    """player -> set of unique career teammates (union over team-seasons, self excluded)."""
    out = {}
    for p, tss in p2t.items():
        s = set()
        for t in tss:
            s.update(t2p[t])
        s.discard(p)
        out[p] = s
    return out


def pick_root(candidates, degree):
    """Max degree; ties broken by smallest playerID (deterministic)."""
    return min(candidates, key=lambda p: (-degree[p], p))


def components(p2t, t2p):
    """Connected components via incidence BFS. Returns list of sorted player lists."""
    seen, comps = set(), []
    for start in sorted(p2t):
        if start in seen:
            continue
        seen.add(start)
        stack, comp, tseen = [start], [], set()
        while stack:
            u = stack.pop()
            comp.append(u)
            for t in p2t[u]:
                if t in tseen:
                    continue
                tseen.add(t)
                for w in t2p[t]:
                    if w not in seen:
                        seen.add(w)
                        stack.append(w)
        comps.append(sorted(comp))
    return comps


def bfs_tree(root, p2t, t2p):
    """Shortest-path tree. Parent rule: frontier is processed in sorted playerID order and each
    team-season is expanded once, so a node's parent is the smallest-ID player at distance d-1
    that shares a team-season with it; evidence is the first (lexicographically smallest) such team-season.
    Returns dist, parent, evidence dicts."""
    dist, parent, evid = {root: 0}, {root: None}, {root: None}
    expanded, frontier = set(), [root]
    while frontier:
        nxt = []
        for u in sorted(frontier):
            for t in p2t[u]:
                if t in expanded:
                    continue
                expanded.add(t)
                for w in t2p[t]:
                    if w not in dist:
                        dist[w] = dist[u] + 1
                        parent[w], evid[w] = u, t
                        nxt.append(w)
        frontier = nxt
    return dist, parent, evid
