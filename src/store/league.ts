/**
 * Zustand store holding the whole league (players + rounds), persisted to
 * localStorage under "monarchs-cup-state". Actions are the only way state
 * changes; derived stats live in src/lib/standings.ts.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SCHEMA_VERSION, type Gender, type Player, type Round, type ScoreSheet, type Skill, type Team } from "../types";
import { mulberry32, selectBestRound } from "../lib/generator";
import { computeStats } from "../lib/standings";

export interface PlayerInput {
  name: string;
  gender: Gender;
  skill: Skill;
}

interface LeagueStore {
  players: Player[];
  rounds: Round[];

  addPlayer: (input: PlayerInput) => string;
  updatePlayer: (id: string, input: PlayerInput) => void;
  removePlayer: (id: string) => void;

  generateRound: (attendeeIds: string[]) => string;
  movePlayer: (roundId: string, playerId: string, toTeamId: string) => void;
  addLatecomer: (roundId: string, playerId: string, teamId: string) => void;
  submitScoreSheet: (roundId: string, gameId: string, teamId: string, sheet: ScoreSheet) => void;

  resetLeague: () => void;
  importLeague: (players: Player[], rounds: Round[]) => void;
}

const uuid = () => crypto.randomUUID();

function updateRound(rounds: Round[], roundId: string, update: (round: Round) => Round): Round[] {
  return rounds.map((r) => (r.id === roundId ? update(r) : r));
}

export const useLeague = create<LeagueStore>()(
  persist(
    (set, get) => ({
      players: [],
      rounds: [],

      addPlayer: (input) => {
        const player: Player = { id: uuid(), ...input };
        set((state) => ({ players: [...state.players, player] }));
        return player.id;
      },

      updatePlayer: (id, input) =>
        set((state) => ({
          players: state.players.map((p) => (p.id === id ? { ...p, ...input } : p)),
        })),

      removePlayer: (id) =>
        set((state) => ({ players: state.players.filter((p) => p.id !== id) })),

      generateRound: (attendeeIds) => {
        const { players, rounds } = get();
        const attendees = players.filter((p) => attendeeIds.includes(p.id));
        const stats = computeStats({ players, rounds });
        const score = (p: Player) => {
          const s = stats.get(p.id);
          const wins = s?.wins ?? 0;
          const roundsPlayed = s?.roundsParticipated ?? 0;
          return wins + (roundsPlayed < 3 ? p.skill : 0);
        };
        const rng = mulberry32(Date.now() >>> 0);
        const teams = selectBestRound(attendees, score, rng);

        const games = [];
        for (let g = 0; g < teams.length; g += 2) {
          const gameNumber = g / 2 + 1;
          const teamA: Team = { id: uuid(), name: `Game ${gameNumber} — Team A`, playerIds: teams[g].map((p) => p.id) };
          const teamB: Team = { id: uuid(), name: `Game ${gameNumber} — Team B`, playerIds: teams[g + 1].map((p) => p.id) };
          games.push({ id: uuid(), teams: [teamA, teamB] as [Team, Team], scoreSheets: { [teamA.id]: null, [teamB.id]: null } });
        }

        const round: Round = {
          id: uuid(),
          number: rounds.length + 1,
          date: new Date().toISOString().slice(0, 10),
          attendeeIds,
          games,
          status: "generated",
        };
        set((state) => ({ rounds: [...state.rounds, round] }));
        return round.id;
      },

      movePlayer: (roundId, playerId, toTeamId) =>
        set((state) => ({
          rounds: updateRound(state.rounds, roundId, (round) => ({
            ...round,
            games: round.games.map((game) => ({
              ...game,
              teams: game.teams.map((team) => {
                const playerIds = team.playerIds.filter((id) => id !== playerId);
                return team.id === toTeamId ? { ...team, playerIds: [...playerIds, playerId] } : { ...team, playerIds };
              }) as [Team, Team],
            })),
          })),
        })),

      addLatecomer: (roundId, playerId, teamId) =>
        set((state) => ({
          rounds: updateRound(state.rounds, roundId, (round) => ({
            ...round,
            attendeeIds: round.attendeeIds.includes(playerId) ? round.attendeeIds : [...round.attendeeIds, playerId],
            games: round.games.map((game) => ({
              ...game,
              teams: game.teams.map((team) =>
                team.id === teamId ? { ...team, playerIds: [...team.playerIds, playerId] } : team
              ) as [Team, Team],
            })),
          })),
        })),

      submitScoreSheet: (roundId, gameId, teamId, sheet) =>
        set((state) => ({
          rounds: updateRound(state.rounds, roundId, (round) => {
            const games = round.games.map((game) =>
              game.id === gameId ? { ...game, scoreSheets: { ...game.scoreSheets, [teamId]: sheet } } : game
            );
            const complete = games.every((g) => g.teams.every((t) => g.scoreSheets[t.id] !== null));
            return { ...round, games, status: complete ? "complete" : "generated" };
          }),
        })),

      resetLeague: () => set({ players: [], rounds: [] }),

      importLeague: (players, rounds) => set({ players, rounds }),
    }),
    {
      name: "monarchs-cup-state",
      version: SCHEMA_VERSION,
      partialize: (state) => ({ players: state.players, rounds: state.rounds }),
    }
  )
);
