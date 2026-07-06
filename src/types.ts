/**
 * Core data model for the Monarchs Cup league.
 * The whole league state is a `League`; everything else (wins, spirit,
 * MVP tallies, standings) is derived from `rounds` and never stored.
 */

export type Gender = "female" | "male";
export type Skill = 1 | 2 | 3 | 4; // 4 = most skilled

export const SCHEMA_VERSION = 1;

export interface Player {
  id: string;
  name: string;
  gender: Gender;
  skill: Skill;
}

export interface League {
  schemaVersion: number;
  players: Player[];
  rounds: Round[];
}

export type RoundStatus = "generated" | "complete";

export interface Round {
  id: string;
  number: number;
  date: string; // ISO date (YYYY-MM-DD)
  attendeeIds: string[];
  games: Game[];
  status: RoundStatus;
}

export interface Team {
  id: string;
  name: string;
  playerIds: string[];
}

export interface Game {
  id: string;
  teams: [Team, Team];
  /** Keyed by team id; null until that team submits its sheet. */
  scoreSheets: Record<string, ScoreSheet | null>;
}

/** The five standard WFDF/USAU spirit categories, each scored 0-4. */
export interface SpiritScores {
  rulesKnowledge: number;
  foulsAndContact: number;
  fairMindedness: number;
  attitude: number;
  communication: number;
}

export interface ScoreSheet {
  submittedByTeamId: string;
  ownScore: number;
  opponentScore: number;
  /** Spirit awarded to the opposing team. */
  spirit: SpiritScores;
  /** Two MVP votes, cast for players on the opposing team. */
  mvpIds: [string, string];
  submittedAt: string;
}

export const SPIRIT_CATEGORIES: { key: keyof SpiritScores; label: string }[] = [
  { key: "rulesKnowledge", label: "Rules Knowledge & Use" },
  { key: "foulsAndContact", label: "Fouls & Body Contact" },
  { key: "fairMindedness", label: "Fair-Mindedness" },
  { key: "attitude", label: "Positive Attitude & Self-Control" },
  { key: "communication", label: "Communication" },
];

export const SPIRIT_RATINGS = ["0 — Poor", "1 — Not Good", "2 — Good", "3 — Very Good", "4 — Excellent"];
