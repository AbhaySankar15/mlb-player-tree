# Game: "Name the link"

Two players are shown who never shared a team-season but have at least one common teammate (exactly 2 degrees apart). Name any player who was a teammate of both.

- **Rounds:** 5 per game, up to 3 points each. Each wrong guess or hint costs 1 point (minimum 0); giving up scores 0.
- **Difficulty:** Easy = both players in the top 15% by unique career teammates and at least 8 valid answers; Medium = better-connected half of players, 3–12 valid answers; Hard = any players, only 1–2 valid answers. Constraints relax automatically if no round is found.
- **Validation:** answers are checked against the real rosters (`memberships.json`) with the same teammate definition as the graph. Wrong guesses get feedback on whether the guess played with either player. All valid answers are shown after each round.
- **Reproducible:** rounds come from a seeded PRNG (`mulberry32`); add `?seed=123` to the URL for the same rounds. In `?debug` mode the current answers are exposed as `window.__mlbGame`.
- **Logic:** `src/lib/game.ts` (unit-tested against synthetic data and the real dataset); UI in `src/components/GameModal.tsx`.

## Daily challenge, stats and sharing (Commit 8)
- **Daily:** five rounds (easy, easy, medium, medium, hard) generated from the seed `YYYYMMDD` of the player's **local** calendar date, so everyone with the same date and the same dataset version gets the same rounds, with no server. One scored attempt per day (the menu shows the saved result afterwards; practice is unlimited). Rounds change if the dataset is regenerated, and players in different time zones get their own local date.
- **Stats:** streak, best streak, games played and top 5 scores are stored in this browser's `localStorage` (`mlbtree.games.v1`, last 200 games; storage errors are handled silently).
- **Global daily leaderboard:** pressing *Play daily* asks for a nickname (3-16 characters: letters, numbers, spaces, `. _ -`; a short profanity filter that matches whole words so names like Hancock or Dickey pass; remembered in `localStorage` as `mlbtree.nickname.v1`). When the five rounds finish, the nickname and the five round results are POSTed to `/api/leaderboard`. Everyone sees the top 50 for the day and a "past 7 days" total tab. One score per nickname (case-insensitive) per daily puzzle; the nickname is the only identity, so anyone can type any unused name. A rejected or taken name can be changed from the results screen and re-submitted. Nothing but nickname, date and round results is sent or stored (rows expire after 14 days).
- **What the server checks (and what it cannot):** the date must be within one day of the server's UTC date (local-date puzzles); five rounds, each internally consistent with the scoring rules (`points = max(0, 3 - wrong - hints)` when solved, 0 otherwise); 20 submissions per IP per hour. It does **not** replay the game, so a determined cheater can post any consistent score. Treat the board as a friendly one, not a competitive one.
- **Sharing:** "Copy result" produces Wordle-style text (`🟩` 3 pts, `🟨` 2, `🟧` 1, `🟥` solved for 0, `⬛` missed) with no answers revealed; "Copy daily link" / "Copy challenge link" opens the daily (`?daily=1`) or the same practice rounds (`?seed=N&difficulty=D`); the native share sheet is offered where supported. If clipboard access fails, the text is shown for manual copy.
- **Testing aid:** in `?debug` mode, `?date=YYYY-MM-DD` overrides today's date.
- **Code:** `src/lib/dailyStats.ts` (unit-tested), `src/components/GameModal.tsx`.
