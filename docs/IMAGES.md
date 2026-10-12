# Images, icons and licensing (Commit 5)

**Decision:** no player headshots, MLB logos or team logos are used. They are copyrighted/trademarked, no license for redistribution was available, and hotlinking MLB's image CDN is not permitted. Visuals are original and generated in the browser:

- **Player avatar:** initials in a circle; color is a deterministic hash of the `playerID`; ring color = degrees of separation.
- **Team badge:** the Lahman `teamID` abbreviation (e.g. BOS, NYA) on a hash-colored tile. This is **not** a team logo; it is a code label and carries no team branding.
- **League chips:** AL, NL, AA, UA, PL, FL, NA; all Negro League codes collapse to one "Negro Leagues" chip.
- **Favicon:** `public/favicon.svg`, an original network glyph.

`playerImageUrl()` in `src/lib/avatar.ts` is the single hook for a future licensed source; it returns `null` today. If one is added, per-image attribution must be shown and listed here.
