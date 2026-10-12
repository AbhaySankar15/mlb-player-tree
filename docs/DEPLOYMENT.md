# Deployment (Vercel or any static host)

The site is a static Vite build plus one serverless function (`api/leaderboard.ts`) for the optional global daily leaderboard. **Nothing has been deployed or pushed**; this documents how to do it.

## Vercel
1. Push the repository to your own Git host and import it in Vercel (framework preset: Vite). `vercel.json` already sets `buildCommand: npm run build` and `outputDirectory: dist`.
2. Node 20+ is required (`engines`). The only environment variables are the leaderboard's (below); the site works without them.
3. The committed `public/data/` (graph, rosters, 61 profile chunks, ~19 MB raw / ~5 MB gzip) is deployed as-is; `data/raw/` is not needed to build.

## Leaderboard storage (Upstash Redis, free tier)
1. In the Vercel project, open **Storage / Marketplace** and add **Upstash Redis** (free plan), connecting it to the project. Vercel then sets `KV_REST_API_URL` and `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`; either pair works). See `.env.example`.
2. Redeploy. `GET /api/leaderboard?date=YYYY-MM-DD` should return `{"date":...,"entries":[]}`; before step 1 it returns 503 and the game shows "not switched on".
3. `npm run dev` does not serve `/api` (the leaderboard panel shows an error, the game itself is unaffected). Use `vercel dev` to run both together.

Keys: `lb:z:<date>` (sorted set, ranking), `lb:h:<date>` (nickname display data), `lb:rl:<ip>` (rate limit counter). Day keys expire after 14 days. To remove a bad entry, delete the member from both `lb:z:<date>` (`ZREM`) and `lb:h:<date>` (`HDEL`) using the lowercase nickname.

Verification status: the handler is covered by vitest with an in-memory Redis stand-in, and the full flow (two browsers, name rejection, duplicate name, 7-day totals) ran in headless Chrome against that stand-in. It has **not** been run on Vercel or against real Upstash; the first deploy is the first real test.

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
