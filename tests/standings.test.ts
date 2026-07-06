/**
 * Tests for derived statistics: game results (including conflicting sheets),
 * win/spirit/MVP tallies and round participation.
 */
import { describe, expect, it } from "vitest";
import { computeStats, gameResult, spiritTotal } from "../src/lib/standings";
import type { Game, Player, Round, ScoreSheet, SpiritScores } from "../src/types";

const spirit = (total: number): SpiritScores => ({
  rulesKnowledge: total,
  foulsAndContact: 0,
  fairMindedness: 0,
  attitude: 0,
  communication: 0,
});

function sheet(byTeamId: string, own: number, opp: number, spiritGiven: number, mvps: [string, string]): ScoreSheet {
  return {
    submittedByTeamId: byTeamId,
    ownScore: own,
    opponentScore: opp,
    spirit: spirit(spiritGiven),
    mvpIds: mvps,
    submittedAt: "2026-07-06T00:00:00Z",
  };
}

function makeGame(sheetA: ScoreSheet | null, sheetB: ScoreSheet | null): Game {
  return {
    id: "g1",
    teams: [
      { id: "ta", name: "Team A", playerIds: ["p1", "p2"] },
      { id: "tb", name: "Team B", playerIds: ["p3", "p4"] },
    ],
    scoreSheets: { ta: sheetA, tb: sheetB },
  };
}

const players: Player[] = ["p1", "p2", "p3", "p4"].map((id) => ({
  id,
  name: id,
  gender: "male",
  skill: 2,
}));

describe("gameResult", () => {
  it("derives the winner from two agreeing sheets", () => {
    const game = makeGame(sheet("ta", 13, 10, 8, ["p3", "p4"]), sheet("tb", 10, 13, 9, ["p1", "p2"]));
    const result = gameResult(game);
    expect(result.conflict).toBe(false);
    expect(result.winnerTeamId).toBe("ta");
    expect(result.scores).toEqual({ ta: 13, tb: 10 });
    expect(result.complete).toBe(true);
  });

  it("flags disagreeing sheets and awards no win", () => {
    const game = makeGame(sheet("ta", 13, 10, 8, ["p3", "p4"]), sheet("tb", 11, 13, 9, ["p1", "p2"]));
    const result = gameResult(game);
    expect(result.conflict).toBe(true);
    expect(result.winnerTeamId).toBeNull();
    expect(result.scores).toBeNull();
  });

  it("uses a single submitted sheet provisionally", () => {
    const game = makeGame(null, sheet("tb", 12, 9, 7, ["p1", "p2"]));
    const result = gameResult(game);
    expect(result.winnerTeamId).toBe("tb");
    expect(result.scores).toEqual({ ta: 9, tb: 12 });
    expect(result.complete).toBe(false);
  });

  it("returns a draw as no winner", () => {
    const game = makeGame(sheet("ta", 11, 11, 8, ["p3", "p4"]), sheet("tb", 11, 11, 9, ["p1", "p2"]));
    expect(gameResult(game).winnerTeamId).toBeNull();
  });
});

describe("computeStats", () => {
  it("tallies wins, spirit received, MVP votes and participation", () => {
    const game = makeGame(sheet("ta", 13, 10, 8, ["p3", "p4"]), sheet("tb", 10, 13, 9, ["p1", "p3"]));
    const round: Round = {
      id: "r1",
      number: 1,
      date: "2026-07-06",
      attendeeIds: players.map((p) => p.id),
      games: [game],
      status: "complete",
    };
    const stats = computeStats({ players, rounds: [round] });

    expect(stats.get("p1")?.wins).toBe(1);
    expect(stats.get("p3")?.wins).toBe(0);

    // Team A received the 9-point spirit from team B's sheet, and vice versa.
    expect(stats.get("p1")?.spirit).toBe(9);
    expect(stats.get("p3")?.spirit).toBe(8);

    expect(stats.get("p3")?.mvpVotes).toBe(2);
    expect(stats.get("p4")?.mvpVotes).toBe(1);
    expect(stats.get("p2")?.mvpVotes).toBe(0);

    for (const p of players) {
      expect(stats.get(p.id)?.roundsParticipated).toBe(1);
      expect(stats.get(p.id)?.gamesPlayed).toBe(1);
    }
  });

  it("counts spirit totals across all five categories", () => {
    expect(
      spiritTotal({ rulesKnowledge: 1, foulsAndContact: 2, fairMindedness: 3, attitude: 4, communication: 0 })
    ).toBe(10);
  });
});
