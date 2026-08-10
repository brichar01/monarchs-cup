/**
 * Tests for the round-generation algorithm: team counts, the dealing rules
 * (women on the first two teams, min/max team sizes, game-by-game top-up)
 * and best-candidate selection.
 */
import { describe, expect, it } from "vitest";
import {
  candidateBadness,
  decideTeamCount,
  generateCandidate,
  mulberry32,
  selectBestRound,
  teamCountOptions,
} from "../src/lib/generator";
import type { Gender, Player, Skill } from "../src/types";

let nextId = 0;
function makePlayers(count: number, gender: Gender, skill: Skill = 2): Player[] {
  return Array.from({ length: count }, () => {
    nextId++;
    return { id: `p${nextId}`, name: `Player ${nextId}`, gender, skill };
  });
}

describe("decideTeamCount", () => {
  it("maximises even team count with 5-a-side minimum", () => {
    expect(decideTeamCount(10)).toBe(2);
    expect(decideTeamCount(14)).toBe(2);
    expect(decideTeamCount(19)).toBe(2);
    expect(decideTeamCount(20)).toBe(4);
    expect(decideTeamCount(29)).toBe(4);
    expect(decideTeamCount(30)).toBe(6);
  });

  it("falls back to a single game below 10 players", () => {
    expect(decideTeamCount(7)).toBe(2);
    expect(decideTeamCount(4)).toBe(2);
  });
});

describe("teamCountOptions", () => {
  it("offers every even count down to 4-a-side", () => {
    expect(teamCountOptions(24)).toEqual([2, 4, 6]);
    expect(teamCountOptions(18)).toEqual([2, 4]);
  });

  it("always offers a single game, even for tiny attendances", () => {
    expect(teamCountOptions(5)).toEqual([2]);
    expect(teamCountOptions(0)).toEqual([2]);
  });

  it("includes the count the generator would pick itself", () => {
    for (const n of [10, 14, 20, 29, 30]) {
      expect(teamCountOptions(n)).toContain(decideTeamCount(n));
    }
  });
});

describe("generateCandidate", () => {
  it("uses every attendee exactly once", () => {
    const attendees = [...makePlayers(6, "female", 3), ...makePlayers(18, "male", 2)];
    const teams = generateCandidate(attendees, 4, mulberry32(1));
    const dealt = teams.flat().map((p) => p.id);
    expect(dealt.length).toBe(attendees.length);
    expect(new Set(dealt).size).toBe(attendees.length);
  });

  it("puts all female players on the first two teams, split evenly", () => {
    const attendees = [...makePlayers(6, "female", 3), ...makePlayers(18, "male", 2)];
    const teams = generateCandidate(attendees, 4, mulberry32(2));
    const femaleCounts = teams.map((t) => t.filter((p) => p.gender === "female").length);
    expect(femaleCounts).toEqual([3, 3, 0, 0]);
  });

  it("gives every team 5-7 players when attendance allows", () => {
    const attendees = [...makePlayers(4, "female"), ...makePlayers(18, "male")];
    const teams = generateCandidate(attendees, 4, mulberry32(3));
    for (const team of teams) {
      expect(team.length).toBeGreaterThanOrEqual(5);
      expect(team.length).toBeLessThanOrEqual(7);
    }
  });

  it("tops up the first game to 7-a-side before later games", () => {
    const attendees = makePlayers(26, "male");
    const teams = generateCandidate(attendees, 4, mulberry32(4));
    expect(teams.map((t) => t.length)).toEqual([7, 7, 6, 6]);
  });

  it("deals overflow evenly once all teams have 7", () => {
    const attendees = makePlayers(30, "male");
    const teams = generateCandidate(attendees, 4, mulberry32(5));
    expect(teams.flat().length).toBe(30);
    const sizes = teams.map((t) => t.length).sort();
    expect(sizes).toEqual([7, 7, 8, 8]);
  });

  it("splits a small session into a single game of two teams", () => {
    const attendees = makePlayers(9, "male");
    const teams = generateCandidate(attendees, 2, mulberry32(6));
    const sizes = teams.map((t) => t.length).sort();
    expect(sizes).toEqual([4, 5]);
  });
});

describe("candidateBadness", () => {
  it("sums per-game score differences", () => {
    const [a1, a2, b1, b2] = [...makePlayers(4, "male")];
    const scores = new Map([
      [a1.id, 5],
      [a2.id, 3],
      [b1.id, 4],
      [b2.id, 4],
    ]);
    const score = (p: Player) => scores.get(p.id) ?? 0;
    expect(candidateBadness([[a1], [a2], [b1], [b2]], score)).toBe(2);
    expect(candidateBadness([[a1, a2], [b1, b2]], score)).toBe(0);
  });
});

describe("selectBestRound", () => {
  it("is deterministic for a given seed", () => {
    const attendees = [...makePlayers(4, "female"), ...makePlayers(10, "male", 3)];
    const score = (p: Player) => p.skill;
    const a = selectBestRound(attendees, score, mulberry32(42), 50);
    const b = selectBestRound(attendees, score, mulberry32(42), 50);
    expect(a.map((t) => t.map((p) => p.id))).toEqual(b.map((t) => t.map((p) => p.id)));
  });

  it("honours an overridden team count", () => {
    const attendees = [...makePlayers(4, "female"), ...makePlayers(14, "male", 3)];
    const score = (p: Player) => p.skill;
    const teams = selectBestRound(attendees, score, mulberry32(11), 50, 4);
    expect(teams.length).toBe(4);
    expect(teams.flat().length).toBe(attendees.length);
    expect(decideTeamCount(attendees.length)).toBe(2);
  });

  it("never returns a candidate worse than a fresh sample", () => {
    const attendees = [
      ...makePlayers(3, "female", 4),
      ...makePlayers(3, "female", 1),
      ...makePlayers(9, "male", 4),
      ...makePlayers(9, "male", 1),
    ];
    const score = (p: Player) => p.skill;
    const best = selectBestRound(attendees, score, mulberry32(7), 200);
    const bestBadness = candidateBadness(best, score);
    const sampleRng = mulberry32(99);
    for (let i = 0; i < 50; i++) {
      const sample = generateCandidate(attendees, 4, sampleRng);
      expect(bestBadness).toBeLessThanOrEqual(candidateBadness(sample, score));
    }
  });
});
