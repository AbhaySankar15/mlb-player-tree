# MLB Player Tree

Interactive radial network of every major leaguer in the SABR Lahman Baseball Database 2025 (1871–2025, including Negro Leagues). Two players are connected when they appeared for the same team in the same season. The center is the player with the most unique career teammates (computed, not hardcoded); rings show degrees of separation.

## Run
```bash
npm install
npm run dev            # or: npm run build && npm run preview
```
`public/data/graph.json` is committed, so no data step is needed to view the site.

## Rebuild the data
```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python scripts/download_data.py      # Lahman CSVs -> data/raw/ (git-ignored)
.venv/bin/python scripts/export_graph.py       # -> public/data/graph.json
.venv/bin/python scripts/build_profiles.py     # -> public/data/profiles/*.json, teams.json (run after export_graph)
.venv/bin/python scripts/validate_data.py      # cross-check + docs/VALIDATION_REPORT.md
```

## Test
```bash
.venv/bin/python -m pytest      # graph algorithms (synthetic) + real-data invariants
npx tsc --noEmit && npx vitest run && npm run build
```

## Docs
`docs/DATA_SOURCES.md` (sources, licenses), `GRAPH_ALGORITHM.md`, `GRAPH_FORMAT.md`, `DATA_QUALITY.md`, `PERFORMANCE.md`, `VALIDATION_REPORT.md`.

## Licenses
Application code: MIT (see below). Data in `public/data/graph.json` is derived from the Lahman database and is licensed CC BY-SA 3.0; Negro Leagues data is licensed from Seamheads.com. Credit: *Lahman Baseball Database, SABR*.

Application code © 2026, MIT License.

## Using the graph
Select a player and press “View full profile” for bio, teams, career batting/pitching totals and a season-by-season table (Esc closes it).

Press `/` (or click the box) to search any player by name or playerID; accents and word order do not matter, and same-name players are listed separately with their years and IDs. Scroll/pinch to zoom, drag to pan, click a player to see their path to the center (click a name in the path trail to jump along it), Esc to deselect. Hover a legend row to isolate that layer. Edges beyond the third layer appear as you zoom in, to keep the full view readable.
