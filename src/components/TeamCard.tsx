/**
 * One team's roster within a game: lists players with a "move to another
 * team" dropdown while the game is unlocked, and the team's score-sheet
 * status with the "Submit score" button.
 */
import type { Player, ScoreSheet, Team } from "../types";
import { spiritTotal } from "../lib/standings";

interface Props {
  team: Team;
  allTeams: Team[];
  playerById: Map<string, Player>;
  locked: boolean;
  sheet: ScoreSheet | null;
  onMove: (playerId: string, toTeamId: string) => void;
  onSubmitScore: () => void;
}

export default function TeamCard({ team, allTeams, playerById, locked, sheet, onMove, onSubmitScore }: Props) {
  const otherTeams = allTeams.filter((t) => t.id !== team.id);

  return (
    <div className="flex flex-1 flex-col rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="font-semibold">{team.name}</h4>
        <span className="text-xs text-slate-500">{team.playerIds.length} players</span>
      </div>
      <ul className="mb-3 flex-1 space-y-1">
        {team.playerIds.map((playerId) => {
          const player = playerById.get(playerId);
          if (!player) return null;
          return (
            <li key={playerId} className="flex items-center justify-between rounded bg-white px-2 py-1 text-sm shadow-sm">
              <span>
                <span className="font-medium">{player.name}</span>{" "}
                <span className="text-xs text-slate-400 capitalize">
                  {player.gender[0].toUpperCase()} · {player.skill}
                </span>
              </span>
              {!locked && (
                <select
                  value=""
                  onChange={(e) => e.target.value && onMove(playerId, e.target.value)}
                  className="rounded border border-slate-200 bg-white px-1 py-0.5 text-xs text-slate-500"
                >
                  <option value="">Move to…</option>
                  {otherTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              )}
            </li>
          );
        })}
      </ul>
      {sheet ? (
        <div className="rounded bg-green-50 px-2 py-1.5 text-xs text-green-800">
          Score submitted: {sheet.ownScore}–{sheet.opponentScore} · spirit given {spiritTotal(sheet.spirit)}/20
        </div>
      ) : (
        <button
          onClick={onSubmitScore}
          className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Submit score
        </button>
      )}
    </div>
  );
}
