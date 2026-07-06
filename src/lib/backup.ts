/**
 * Backup, restore and validation of the full league state as JSON.
 * `parseBackup` throws an Error with a human-readable message when the
 * file is not a valid league backup.
 */
import { SCHEMA_VERSION, type League, type Player, type Round } from "../types";

export function serializeLeague(league: Pick<League, "players" | "rounds">): string {
  const backup: League = { schemaVersion: SCHEMA_VERSION, players: league.players, rounds: league.rounds };
  return JSON.stringify(backup, null, 2);
}

export function downloadBackup(league: Pick<League, "players" | "rounds">): void {
  const blob = new Blob([serializeLeague(league)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `monarchs-cup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function isPlayer(value: unknown): value is Player {
  const p = value as Player;
  return (
    typeof p === "object" &&
    p !== null &&
    typeof p.id === "string" &&
    typeof p.name === "string" &&
    (p.gender === "female" || p.gender === "male") &&
    [1, 2, 3, 4].includes(p.skill)
  );
}

function isRound(value: unknown): value is Round {
  const r = value as Round;
  return (
    typeof r === "object" &&
    r !== null &&
    typeof r.id === "string" &&
    typeof r.number === "number" &&
    typeof r.date === "string" &&
    Array.isArray(r.attendeeIds) &&
    Array.isArray(r.games) &&
    r.games.every((g) => Array.isArray(g.teams) && g.teams.length === 2 && typeof g.scoreSheets === "object")
  );
}

export function parseBackup(text: string): League {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("File is not valid JSON.");
  }
  const league = data as League;
  if (typeof league !== "object" || league === null) throw new Error("File is not a league backup.");
  if (league.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`Unsupported schema version ${String(league.schemaVersion)} (expected ${SCHEMA_VERSION}).`);
  }
  if (!Array.isArray(league.players) || !league.players.every(isPlayer)) {
    throw new Error("Backup has an invalid player list.");
  }
  if (!Array.isArray(league.rounds) || !league.rounds.every(isRound)) {
    throw new Error("Backup has an invalid rounds list.");
  }
  return league;
}
