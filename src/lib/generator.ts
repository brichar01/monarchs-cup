/**
 * Round generation: builds many candidate rounds by the league's dealing
 * algorithm, scores each for balance, and returns one of the most even.
 *
 * All functions are pure and take an explicit RNG so they are deterministic
 * under a seeded generator (see tests). Teams are returned as an array of
 * player arrays; consecutive pairs (0-1, 2-3, ...) form the games.
 */
import type { Player, Skill } from "../types";

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffled<T>(items: T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const MIN_TEAM = 5;
const MAX_TEAM = 7;
/** Smallest team the organiser is allowed to force via a manual override. */
const MIN_OVERRIDE_TEAM = 4;
const SKILLS_DESC: Skill[] = [4, 3, 2, 1];

/**
 * Largest even team count that still allows 5-a-side. Below 10 attendees
 * there is no valid split, so fall back to a single game of two small teams.
 */
export function decideTeamCount(attendeeCount: number): number {
  const t = Math.floor(attendeeCount / MIN_TEAM);
  return Math.max(t - (t % 2), 2);
}

/**
 * Even team counts the organiser may pick manually — every count from a
 * single game up to the most teams that still leaves 4 players each.
 */
export function teamCountOptions(attendeeCount: number): number[] {
  const t = Math.floor(attendeeCount / MIN_OVERRIDE_TEAM);
  const max = Math.max(t - (t % 2), 2);
  return Array.from({ length: max / 2 }, (_, i) => (i + 1) * 2);
}

function pickSmallest(teams: Player[][], rng: Rng): Player[] {
  const min = Math.min(...teams.map((t) => t.length));
  const smallest = teams.filter((t) => t.length === min);
  return smallest[Math.floor(rng() * smallest.length)];
}

export function generateCandidate(attendees: Player[], teamCount: number, rng: Rng): Player[][] {
  const teams: Player[][] = Array.from({ length: teamCount }, () => []);

  const group = (skill: Skill, gender: Player["gender"]) =>
    shuffled(attendees.filter((p) => p.skill === skill && p.gender === gender), rng);

  const females = SKILLS_DESC.flatMap((s) => group(s, "female"));
  for (const p of females) {
    (teams[0].length <= teams[1].length ? teams[0] : teams[1]).push(p);
  }

  const queue = SKILLS_DESC.flatMap((s) => group(s, "male"));
  let i = 0;

  while (i < queue.length && teams.some((t) => t.length < MIN_TEAM)) {
    pickSmallest(teams, rng).push(queue[i++]);
  }

  while (i < queue.length) {
    const gameIndex = teams.findIndex((t, idx) => idx % 2 === 0 && (t.length < MAX_TEAM || teams[idx + 1].length < MAX_TEAM));
    if (gameIndex < 0) break;
    const [a, b] = [teams[gameIndex], teams[gameIndex + 1]];
    const target = a.length <= b.length ? (a.length < MAX_TEAM ? a : b) : b.length < MAX_TEAM ? b : a;
    target.push(queue[i++]);
  }

  while (i < queue.length) {
    pickSmallest(teams, rng).push(queue[i++]);
  }

  return teams;
}

/**
 * Balance metric: sum over games of the absolute difference between the
 * two teams' total player scores. Lower is better.
 */
export function candidateBadness(teams: Player[][], score: (p: Player) => number): number {
  let badness = 0;
  for (let g = 0; g < teams.length; g += 2) {
    const total = (team: Player[]) => team.reduce((sum, p) => sum + score(p), 0);
    badness += Math.abs(total(teams[g]) - total(teams[g + 1]));
  }
  return badness;
}

export function selectBestRound(
  attendees: Player[],
  score: (p: Player) => number,
  rng: Rng,
  iterations = 500,
  teamCount = decideTeamCount(attendees.length)
): Player[][] {
  let best: Player[][][] = [];
  let bestBadness = Infinity;
  for (let k = 0; k < iterations; k++) {
    const candidate = generateCandidate(attendees, teamCount, rng);
    const badness = candidateBadness(candidate, score);
    if (badness < bestBadness) {
      bestBadness = badness;
      best = [candidate];
    } else if (badness === bestBadness) {
      best.push(candidate);
    }
  }
  return best[Math.floor(rng() * best.length)];
}
