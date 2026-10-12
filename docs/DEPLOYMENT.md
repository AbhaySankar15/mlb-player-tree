# Deployment (Vercel or any static host)

The site is a static Vite build with no backend. **Nothing has been deployed or pushed**; this documents how to do it.

## Vercel
1. Push the repository to your own Git host and import it in Vercel (framework preset: Vite). `vercel.json` already sets `buildCommand: npm run build` and `outputDirectory: dist`.
2. No environment variables are needed. Node 20+ is required (`engines`).
3. The committed `public/data/` (graph, rosters, 61 profile chunks, ~19 MB raw / ~5 MB gzip) is deployed as-is; `data/raw/` is not needed to build.

## Headers (`vercel.json`)
- `/assets/*`: `immutable`, 1 year (hashed filenames).
- `/data/*`: `max-age=0, must-revalidate`. Data files keep fixed names and profile chunks depend on the player order in `graph.json`, so they must always be revalidated together; stale caching could show the wrong profile after a data update.
- Security: strict CSP (`default-src 'self'`, inline styles only; no external scripts, fonts or images), `X-Frame-Options: DENY`, `nosniff`, restrictive `Referrer-Policy` and `Permissions-Policy`. Verified locally by serving `dist/` with these exact headers: no CSP violations and all features working.

## Other static hosts
Serve `dist/` and replicate the headers above if you can. The app uses root-relative paths (`/data/...`, `/favicon.svg`); to deploy under a sub-path set Vite's `base` and update the two absolute links in `index.html`.

## Updating the data
`npm run data` (needs `.venv`) downloads Lahman, rebuilds graph, rosters and profiles, and regenerates the validation report. Commit the changed `public/data/` files together. The daily challenge changes when the data changes (see `GAME.md`).

## Licensing reminders
Derived data is CC BY-SA 3.0 (Lahman) with Negro Leagues data licensed from Seamheads.com; keep the in-app attribution. Code is MIT. See `DATA_SOURCES.md`.
