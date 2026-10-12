/** Scoring constants shared by the game (browser) and the leaderboard function (Node). Keep this file import-free. */
export const ROUNDS = 5
export const MAX_POINTS = 3

/** 3 points for a clean solve, minus one per wrong guess or hint used; 0 if unsolved. */
export function scoreRound(solved: boolean, wrongGuesses: number, hintsUsed: number): number {
  return solved ? Math.max(0, MAX_POINTS - wrongGuesses - hintsUsed) : 0
}
