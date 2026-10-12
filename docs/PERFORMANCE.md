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

## Commit 9: mobile and load-time work (measured 2026-10-12)
Production build served by `vite preview` (no server compression), headless Chrome with software WebGL, median of 3 fresh-context runs:

| Metric | Before | After |
|---|---|---|
| Initial JS chunk | 345 KB raw | 324 KB raw (91 KB gzip); `ProfileDrawer` (3.7 KB gz) and `GameModal` (5.2 KB gz) now load on demand |
| `graph.json` | 1,888,882 B raw / 561 KB gzip | 1,845,884 B raw / 533 KB gzip (coordinates rounded to 0.1 layout units; lane pitch is 4) |
| Page transfer, uncompressed | 2,193 KB | 1,803 KB |
| Time until graph is interactive | ~321 ms | ~311 ms (`graph.json` is also preloaded from `index.html`) |
| JS heap after load | 48 MB | 48 MB |

**Frame time is not reported as a result.** In this environment every frame costs ~0.5 s regardless of what is drawn (CPU profile: ~2 ms JS, the remainder native software-rasterizer time; hiding all nodes still left ~0.3 s/frame; an empty WebGL canvas runs at 15 ms), so it measures SwiftShader, not the app. Real-GPU and real-phone frame rates were **not measured**. Mitigations built in for slower devices: edges beyond layer 3 are hidden while zoomed out, edges are hidden while panning/zooming (`hideEdgesOnMove`), and labels are also hidden while moving on touch devices (`hideLabelsOnMove` when `pointer: coarse`).

Visual fix found while testing: node size now scales 1:1 with the layout when zooming (`zoomToSizeRatioFunction: r => r`), so dense bands stay as distinct dots instead of fusing into solid slabs at medium zoom.

### Mobile behavior (verified in a 390×844 touch emulation, DPR 3)
- Bottom sheet: collapsed shows search and actions; the handle expands it (max 46 dvh, scrollable). Tapping a node shows a "selected" chip with Details/✕ instead of covering the graph.
- No horizontal overflow on the main view, profile drawer or game; drawer and game modal are full-width/full-screen; legend becomes a compact strip; inputs are 16 px (no iOS focus-zoom); buttons ≥ 40 px tall; safe-area insets and `100dvh` respected.
- Not verified: real iOS Safari/Android Chrome, pinch gestures (only tap/pan paths were exercised through Sigma's defaults), and low-end device frame rates.
