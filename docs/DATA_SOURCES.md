# Data sources and licensing

## SABR Lahman Baseball Database, version 2025
- Official page: https://sabr.org/lahman-database/ — "Version 2025, released January 2, 2026" (stats 1871–2025, incl. Negro Leagues; CSV byte-order markers updated Feb 18, 2026).
- Files used: `Appearances.csv` (player–team–season membership and games by position), `People.csv` (names and bio), `Teams.csv` (team names, W–L, rank), `Batting.csv` and `Pitching.csv` (profile statistics only; they do not define graph memberships). Downloaded by `scripts/download_data.py` from SABR's official Box share linked on that page, into `data/raw/` (git-ignored, ~15 MB).
- Verified schema: Appearances = `yearID, teamID, lgID, playerID, G_all, ...` (one row per player/team/season; no duplicate keys found). Every Appearances player exists in People. The league code `NA` (National Association 1871–75) is read with `keep_default_na=False` so it is not parsed as missing.
- **License:** Creative Commons Attribution-ShareAlike 3.0 Unported (per the release readme §0.1). Derived data in `public/data/graph.json` is therefore shared under CC BY-SA 3.0; original application code is separate (see README). Required credit: "Lahman Baseball Database, SABR; Negro Leagues data licensed from Seamheads.com".
- **Negro Leagues:** licensed from Seamheads.com (https://www.seamheads.com/NegroLgs/), major Negro Leagues through the 1948 Negro American and National League seasons, following SABR's Negro Leagues Researchers & Authors Group recommendations.

## Baseball-Reference
Not scraped or bulk-downloaded (no free unrestricted API; terms restrict automated access). Lahman's `bbrefID` is preserved only as a future cross-reference key.

## 2026 season (MLB Stats API)
**Not imported.** Lahman has no MLBAM IDs (only `retroID`/`bbrefID`), so a reliable join would require a separate authorized ID register, and MLB Stats API terms restrict commercial/redistributed use. The graph is therefore complete only through the verified 2025 season. This was an investigation of feasibility from the schema and published terms; no MLB Stats API calls were made.

No headshots or MLB logos are used.
