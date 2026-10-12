# Performance (measured 2026-10-11, MacBook, headless Chrome with software WebGL)

| Item | Result |
|---|---|
| Players / graph nodes | 24,011 |
| Rendered tree edges | 24,010 |
| `graph.json` | 1,888,882 B raw, 561,295 B gzip (-9) |
| JS bundle | 310 kB (86 kB gzip) |
| Pipeline (load CSV → layout → export) | ~2.3 s |
| Validation (explicit 1.65M-edge networkx cross-check) | ~3.6 s |
| Page load → graph rendered (local preview) | ~0.4–0.5 s |
| JS heap after load | 29–37 MB (`performance.memory`; Chrome-reported) |
| Click → selected panel visible | ~0.7 s (includes software-GL frame time) |
| Wheel zoom / drag pan / fit / reset / Esc | worked (functional check) |

**Caveat:** the browser ran with SwiftShader software WebGL (no GPU), so frame times are pessimistic: ~0.89 s per forced refresh while zooming. Real-GPU frame rate was **not measured**. Total process memory (beyond JS heap) was not measured. Run `npm run preview` in a normal browser to judge smoothness.

## Profile data (Commit 4)
| Item | Result |
|---|---|
| Profile chunks | 61 files of 400 players; largest 312 KB raw / ~79 KB gzip |
| All profiles | 17.3 MB raw, 4.5 MB gzip (loaded lazily, one chunk per newly opened profile; cached in memory) |
| `teams.json` | ~100 KB raw (fetched with the first profile) |
| Profile build (`scripts/build_profiles.py`) | ~9.7 s |
The initial page load is unchanged (profile data is not fetched until “View full profile”). Chunk fetch time on a real network was not measured.

## Path finder (Commit 6)
Roughly 5 ms per query in Node (100 cross-checked pairs plus data loading ran in ~0.5 s); the test suite asserts under 150 ms. Rosters load on first use. In-browser query latency on a real GPU machine was not separately measured.
