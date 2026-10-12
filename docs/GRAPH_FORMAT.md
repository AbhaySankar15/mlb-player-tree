# graph.json format (public/data/graph.json)

Columnar JSON. Node index = array position `i`; all `players.*` arrays have equal length N.

```
{
  "meta": { sourceVersion, dataCoverageStart, dataCoverageEnd, totalPlayers, totalTeamSeasons,
            totalMemberships, rootPlayerId, rootIndex, rootName, rootTeammateCount, componentCount,
            isolatedPlayerCount, largestComponentSize, maximumSeparation, depthCounts: [..], treeEdgeCount, generatedAt },
  "teamSeasons": ["1927-AL-NYA", ...],          // "<year>-<lgID>-<teamID>"
  "players": {
    "id": [playerID], "name": [fullName], "x": [float], "y": [float],
    "depth": [int degree of separation from component root], "parent": [index or -1 for component roots],
    "evidence": [teamSeasons index shared with parent, or -1], "degree": [unique career teammates],
    "comp": [component id; 0 = main component containing global root], "debut": [year], "final": [year],
    "leagues": ["AL,NL"], "seasons": [team-season count]
  }
}
```
Tree edges: for every i with parent[i] >= 0 the edge (parent[i], i). Edge count = N - componentCount.
Coordinates are precomputed (y grows downward is irrelevant; Sigma uses them as-is). Main component is centered at (0,0).
