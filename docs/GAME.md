# Game: "Name the link"

Two players are shown who never shared a team-season but have at least one common teammate (exactly 2 degrees apart). Name any player who was a teammate of both.

- **Rounds:** 5 per game, up to 3 points each. Each wrong guess or hint costs 1 point (minimum 0); giving up scores 0.
- **Difficulty:** Easy = both players in the top 15% by unique career teammates and at least 8 valid answers; Medium = better-connected half of players, 3–12 valid answers; Hard = any players, only 1–2 valid answers. Constraints relax automatically if no round is found.
- **Validation:** answers are checked against the real rosters (`memberships.json`) with the same teammate definition as the graph. Wrong guesses get feedback on whether the guess played with either player. All valid answers are shown after each round.
- **Reproducible:** rounds come from a seeded PRNG (`mulberry32`); add `?seed=123` to the URL for the same rounds. In `?debug` mode the current answers are exposed as `window.__mlbGame`.
- **Logic:** `src/lib/game.ts` (unit-tested against synthetic data and the real dataset); UI in `src/components/GameModal.tsx`.
