# Graph algorithm

- **Membership:** a player belongs to a team-season `"<year>-<lgID>-<teamID>"` if they have an Appearances row. Different teams in the same year are never merged; a traded player belongs to several team-seasons.
- **Teammates:** A and B are teammates iff they share at least one team-season. Undirected, no self-edges, unique per pair (set union).
- **Efficient representation:** inverted indexes `player -> team-seasons` and `team-season -> players` (`scripts/graph_core.py`). Pairwise edges are never materialized in the pipeline; `scripts/validate_data.py` builds the explicit networkx graph (~1.6M edges) only to cross-check degrees, components and BFS distances.
- **Root:** `argmax` of unique career teammates over all players; ties broken by smallest `playerID`. Never hardcoded.
- **Components:** found by incidence BFS. Main component = the one containing the global root; every other component uses its own highest-degree player (same tie rule) as local root. No fabricated edges; isolated players are kept as size-1 components.
- **Shortest-path tree:** BFS over the incidence structure. The frontier is processed in sorted `playerID` order and each team-season is expanded once, so a node's parent is the smallest-`playerID` player one step closer that shares a team-season with it; the evidence team-season is the first sorted shared one. Tree edges = `N - components`.
- **Layout (`compute_layout.py`):** deterministic radial hierarchy. Each depth is a band of staggered lanes (pitch 4, gap 30), lane count chosen so nodes fit; each node's angular wedge is proportional to its subtree size; children are ordered by `playerID`. Extra components are packed on concentric rings outside the main tree. No randomness, no force simulation at load.
- **Export:** `public/data/graph.json`, columnar (see `GRAPH_FORMAT.md`).
