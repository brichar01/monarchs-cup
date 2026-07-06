/**
 * Derived statistics. Wins, spirit and MVP tallies are always computed from
 * the stored rounds; nothing here mutates state.
 *
 * Game results come from the two submitted score sheets. If both sheets are
 * present but disagree, the game is flagged as a conflict and awards no win.
 * Spirit received by a team is the category total (0-20) from the sheet the
 * opposing team submitted.
 */
import type { Game, League, ScoreSheet, SpiritScores } from "../types";

export interface GameResult {
  winnerTeamId: string | null;
  conflict: boolean;
  /** Agreed score keyed by team id, or null when unknown/conflicting. */
  scores: Record<string, number> | null;
  complete: boolean;
}

export interface PlayerStats {
  wins: number;
  spirit: number;
  mvpVotes: number;
  roundsParticipated: number;
  gamesPlayed: number;
}

export function spiritTotal(spirit: SpiritScores): number {
  return (
    spirit.rulesKnowledge + spirit.foulsAndContact + spirit.fairMindedness + spirit.attitude + spirit.communication
  );
}

export function gameResult(game: Game): GameResult {
  const [a, b] = game.teams;
  const sheetA = game.scoreSheets[a.id];
  const sheetB = game.scoreSheets[b.id];

  let scores: Record<string, number> | null = null;
  let conflict = false;

  if (sheetA && sheetB) {
    conflict = sheetA.ownScore !== sheetB.opponentScore || sheetA.opponentScore !== sheetB.ownScore;
    if (!conflict) scores = { [a.id]: sheetA.ownScore, [b.id]: sheetA.opponentScore };
  } else if (sheetA) {
    scores = { [a.id]: sheetA.ownScore, [b.id]: sheetA.opponentScore };
  } else if (sheetB) {
    scores = { [b.id]: sheetB.ownScore, [a.id]: sheetB.opponentScore };
  }

  let winnerTeamId: string | null = null;
  if (scores && scores[a.id] !== scores[b.id]) {
    winnerTeamId = scores[a.id] > scores[b.id] ? a.id : b.id;
  }

  return { winnerTeamId, conflict, scores, complete: Boolean(sheetA && sheetB) };
}

export function computeStats(league: Pick<League, "players" | "rounds">): Map<string, PlayerStats> {
  const stats = new Map<string, PlayerStats>();
  const get = (playerId: string): PlayerStats => {
    let s = stats.get(playerId);
    if (!s) {
      s = { wins: 0, spirit: 0, mvpVotes: 0, roundsParticipated: 0, gamesPlayed: 0 };
      stats.set(playerId, s);
    }
    return s;
  };

  for (const round of league.rounds) {
    const inRound = new Set(round.games.flatMap((g) => g.teams.flatMap((t) => t.playerIds)));
    for (const playerId of inRound) get(playerId).roundsParticipated++;

    for (const game of round.games) {
      const result = gameResult(game);
      const [a, b] = game.teams;

      for (const team of game.teams) {
        const opponent = team.id === a.id ? b : a;
        const opponentSheet: ScoreSheet | null = game.scoreSheets[opponent.id];
        for (const playerId of team.playerIds) {
          const s = get(playerId);
          s.gamesPlayed++;
          if (result.winnerTeamId === team.id) s.wins++;
          if (opponentSheet) s.spirit += spiritTotal(opponentSheet.spirit);
        }
      }

      for (const sheet of Object.values(game.scoreSheets)) {
        if (sheet) for (const mvpId of sheet.mvpIds) get(mvpId).mvpVotes++;
      }
    }
  }

  return stats;
}
