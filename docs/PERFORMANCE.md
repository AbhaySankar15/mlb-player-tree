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
