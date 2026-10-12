# MLB Player Tree

Every major leaguer, connected through baseball history. An interactive map of **24,011 players (1871–2025, including the Negro Leagues)** from the SABR Lahman Baseball Database. Two players are connected when they appeared for the same team in the same season. The center is whoever has the most unique career teammates (computed from the data, currently Rich Hill with 944), and rings show degrees of separation. Static site plus one small serverless function for the optional daily leaderboard.

## Features
- **Radial tree** of all players with WebGL rendering (Sigma.js); zoom, pan, hover, select, path-to-center highlight, layer isolation from the legend.
- **Search** any player by name or playerID (accent- and order-insensitive).
- **Profiles:** bio, teams (with full historical names), career batting/pitching totals, season-by-season lines.
- **Path finder:** the shortest teammate chain between any two players, drawn on the graph.
- **Game:** "Name the link", with a daily challenge, streaks, and shareable results.
- **Mobile:** bottom-sheet layout and touch-sized controls.
- Original generated avatars and badges (no headshots or logos; see `docs/IMAGES.md`).

## Run
```bash
npm install
npm run dev                    # development
npm run build && npm run preview   # production build
```
`public/data/` is committed, so no data step is needed to run the site.

## Rebuild the data
```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
npm run data    # download Lahman, export graph/rosters/profiles, validate (docs/VALIDATION_REPORT.md)
```
Individual steps: `scripts/download_data.py`, `export_graph.py` (graph + rosters), `build_profiles.py` (profiles; run after export), `validate_data.py`, `make_path_fixture.py` (independent networkx distances used by a frontend test).

## Test
```bash
npm run verify    # tsc, vitest, pytest, production build
```
Python tests cover the graph algorithms on synthetic data and real-data invariants; the validation script cross-checks everything against an explicit networkx teammate graph.

## Using the graph
Press `/` to search; select a player for the path trail, **View full profile**, and **Path from/to here**. “Connect two players” finds the shortest chain. “Play: Name the link” starts the game. Hover a legend row to isolate a layer; edges beyond the third layer appear as you zoom in. On phones, tap the sheet handle to expand the menu; tapping a player shows a chip with a Details button.

## Documentation
`docs/`: `DATA_SOURCES.md` (sources, licenses), `DATA_QUALITY.md` (limitations), `GRAPH_ALGORITHM.md`, `GRAPH_FORMAT.md`, `GAME.md`, `IMAGES.md`, `PERFORMANCE.md` (measurements and caveats), `DEPLOYMENT.md`, `VALIDATION_REPORT.md`.

## Known limitations
- Data ends with the 2025 season (2026 not imported).
- Lahman Appearances omits 8 player/team/season rows that Batting has, so a few teammate links are missing (`docs/DATA_QUALITY.md`).
- Negro Leagues records are incomplete; a missing membership means "not established by the source".
- The global daily leaderboard needs the Upstash Redis setup in `docs/DEPLOYMENT.md` (without it the game works and the board shows as not switched on). It is honor-system: scores are checked for consistency, not replayed. Streaks live in the browser. Real-GPU frame rates were not measured.

## Licenses
Application code: MIT (`LICENSE`). Data in `public/data/` is derived from the SABR Lahman Baseball Database under CC BY-SA 3.0; Negro Leagues data is licensed from Seamheads.com. Credit: *Lahman Baseball Database, SABR*.
