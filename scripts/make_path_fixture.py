"""Generate tests/fixtures/path_pairs.json: random player pairs with shortest teammate distances computed
independently with networkx on the explicit teammate graph (used by the vitest cross-check of src/lib/pathfinder.ts)."""
import itertools, json, os, random, sys
sys.path.insert(0, os.path.dirname(__file__))
import networkx as nx
import export_graph as eg

b = eg.build()
ids = sorted(b["p2t"])  # same order as graph.json player indices
idx = {p: i for i, p in enumerate(ids)}
G = nx.Graph()
G.add_nodes_from(ids)
for t, ps in b["t2p"].items():
    G.add_edges_from(itertools.combinations(ps, 2))
rnd = random.Random(20261012)
pairs = []
for _ in range(25):
    a = rnd.choice(ids)
    lengths = nx.single_source_shortest_path_length(G, a)
    for t in rnd.sample(ids, 4):
        pairs.append([idx[a], idx[t], lengths.get(t, -1)])
os.makedirs("tests/fixtures", exist_ok=True)
json.dump(dict(pairs=pairs, note="[indexA, indexB, shortest teammate distance via networkx; -1 = unreachable]"), open("tests/fixtures/path_pairs.json", "w"))
print(len(pairs), "pairs; max distance", max(p[2] for p in pairs))
