# Data quality and known limitations

Machine-generated figures live in `VALIDATION_REPORT.md` / `validation_report.json` (regenerate with `python scripts/validate_data.py`).

- **Coverage:** 1871–2025 only. 2026 is *not* included (see DATA_SOURCES.md); the dataset must not be described as complete through 2026.
- **Eligible players:** the 24,011 players with at least one `Appearances` row. `People.csv` has 24,270 rows; the 259 people without any appearance (mostly managers, umpires and executives with `…99` IDs; 3 of them carry a `debut` date in People but have no Appearances rows, so they cannot be placed on a team-season) cannot have a team-season connection and are not nodes. They are counted here rather than silently dropped.
- **Teammate = shared team-season**, from Appearances. This includes players who were on a roster/recorded for a team that year without overlapping in time (e.g. traded away in April vs. called up in September).
- **Negro Leagues:** 12 league codes (NNL, NN2, NAL, ECL, EWL, ANL, NSL, IND, EAS, WES, NAC, INT) are included with their own team-season identities; 2,834 players have at least one Negro Leagues season (2,784 played only there). Records are incomplete for many players, teams and seasons (Seamheads/SABR research is ongoing). A missing membership means "not established by the source", not "not teammates"; nothing was inferred or fabricated. Whether a source-listed Negro Leagues team-season is complete for every roster member is not verifiable from the data.
- **Cross-era connectivity:** the whole graph is one connected component (24,011 nodes), so no satellite clusters are rendered; the satellite-layout code path is covered by unit tests only, not exercised by this dataset. Negro Leagues-only players connect to the rest through players who appear in both Negro Leagues and AL/NL records.
- **Identity:** joins use Lahman `playerID` only; same-name players stay separate. Names come from `nameFirst`/`nameLast`.
- **Not reviewed:** no independent audit of Lahman values against Baseball-Reference or Retrosheet was done.
