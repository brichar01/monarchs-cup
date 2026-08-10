/**
 * League administration: correct the score sheets of completed rounds,
 * download a JSON backup, restore from a backup file (with a confirmation
 * summary before overwriting), and reset the league behind a typed
 * confirmation.
 */
import { useMemo, useRef, useState } from "react";
import { useLeague } from "../store/league";
import { downloadBackup, parseBackup } from "../lib/backup";
import { gameResult } from "../lib/standings";
import ScoreSheetModal, { scoreSheetDraftFrom, type ScoreSheetDraft } from "../components/ScoreSheetModal";
import type { League } from "../types";

interface ScoreSheetEdit {
  roundId: string;
  gameId: string;
  teamId: string;
  draft: ScoreSheetDraft;
}

export default function AdminPage() {
  const players = useLeague((s) => s.players);
  const rounds = useLeague((s) => s.rounds);
  const importLeague = useLeague((s) => s.importLeague);
  const resetLeague = useLeague((s) => s.resetLeague);
  const submitScoreSheet = useLeague((s) => s.submitScoreSheet);

  const fileInput = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<League | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [resetText, setResetText] = useState("");
  const [editing, setEditing] = useState<ScoreSheetEdit | null>(null);

  const playerById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const completedRounds = rounds.filter(
    (round) => round.games.length > 0 && round.games.every((game) => gameResult(game).complete)
  );

  const editContext = (() => {
    if (!editing) return null;
    const game = rounds.find((r) => r.id === editing.roundId)?.games.find((g) => g.id === editing.gameId);
    const team = game?.teams.find((t) => t.id === editing.teamId);
    const opponent = game?.teams.find((t) => t.id !== editing.teamId);
    if (!team || !opponent) return null;
    return { team, opponent };
  })();

  const onFileChosen = async (file: File | undefined) => {
    setImportError(null);
    setPendingImport(null);
    if (!file) return;
    try {
      setPendingImport(parseBackup(await file.text()));
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err));
    }
    if (fileInput.current) fileInput.current.value = "";
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg bg-white p-4 shadow">
        <h2 className="mb-2 text-base font-semibold">Edit round results</h2>
        <p className="mb-3 text-sm text-slate-600">
          Rounds where both teams in every game have submitted a score sheet. Opening a sheet lets you correct its
          scores, spirit and MVP votes; standings update immediately.
        </p>
        {completedRounds.length === 0 ? (
          <p className="text-sm text-slate-500">No completed rounds yet.</p>
        ) : (
          <div className="space-y-4">
            {[...completedRounds].reverse().map((round) => (
              <div key={round.id}>
                <h3 className="mb-2 text-sm font-semibold">
                  Round {round.number} · {round.date}
                </h3>
                <div className="space-y-2">
                  {round.games.map((game, index) => {
                    const result = gameResult(game);
                    const [a, b] = game.teams;
                    return (
                      <div key={game.id} className="rounded border border-slate-200 p-3">
                        <div className="mb-2 flex flex-wrap items-center gap-3">
                          <span className="text-sm font-medium">Game {index + 1}</span>
                          {result.conflict ? (
                            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
                              Score sheets disagree
                            </span>
                          ) : (
                            <span className="text-sm text-slate-600">
                              {result.scores?.[a.id]}–{result.scores?.[b.id]}
                              {result.winnerTeamId
                                ? ` · ${game.teams.find((t) => t.id === result.winnerTeamId)?.name} wins`
                                : " · Draw"}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {game.teams.map((team) => {
                            const sheet = game.scoreSheets[team.id];
                            if (!sheet) return null;
                            return (
                              <button
                                key={team.id}
                                onClick={() =>
                                  setEditing({
                                    roundId: round.id,
                                    gameId: game.id,
                                    teamId: team.id,
                                    draft: scoreSheetDraftFrom(sheet),
                                  })
                                }
                                className="rounded border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm text-indigo-700 hover:bg-indigo-100"
                              >
                                {team.name}: {sheet.ownScore}–{sheet.opponentScore} · edit sheet
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg bg-white p-4 shadow">
        <h2 className="mb-2 text-base font-semibold">Backup</h2>
        <p className="mb-3 text-sm text-slate-600">
          Download the full league state ({players.length} players, {rounds.length} rounds) as a JSON file.
        </p>
        <button
          onClick={() => downloadBackup({ players, rounds })}
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Download backup
        </button>
      </section>

      <section className="rounded-lg bg-white p-4 shadow">
        <h2 className="mb-2 text-base font-semibold">Restore</h2>
        <p className="mb-3 text-sm text-slate-600">
          Restoring replaces the current league state with the backup's contents.
        </p>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          onChange={(e) => onFileChosen(e.target.files?.[0])}
          className="text-sm"
        />
        {importError && <p className="mt-2 text-sm text-red-600">{importError}</p>}
        {pendingImport && (
          <div className="mt-3 rounded border border-amber-300 bg-amber-50 p-3 text-sm">
            <p className="mb-2">
              Backup contains <strong>{pendingImport.players.length} players</strong> and{" "}
              <strong>{pendingImport.rounds.length} rounds</strong>. Replace the current league?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  importLeague(pendingImport.players, pendingImport.rounds);
                  setPendingImport(null);
                }}
                className="rounded bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700"
              >
                Replace league
              </button>
              <button
                onClick={() => setPendingImport(null)}
                className="rounded px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-lg bg-white p-4 shadow">
        <h2 className="mb-2 text-base font-semibold">Reset league</h2>
        <p className="mb-3 text-sm text-slate-600">
          Deletes all players and rounds. Consider downloading a backup first. Type <strong>RESET</strong> to
          confirm.
        </p>
        <div className="flex items-center gap-2">
          <input
            value={resetText}
            onChange={(e) => setResetText(e.target.value)}
            placeholder="RESET"
            className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          />
          <button
            onClick={() => {
              resetLeague();
              setResetText("");
            }}
            disabled={resetText !== "RESET"}
            className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            Reset league
          </button>
        </div>
      </section>

      {editContext && editing && (
        <ScoreSheetModal
          team={editContext.team}
          opponent={editContext.opponent}
          playerById={playerById}
          draft={editing.draft}
          editing
          onDraftChange={(draft) => setEditing({ ...editing, draft })}
          onClose={() => setEditing(null)}
          onSubmit={(sheet) => {
            submitScoreSheet(editing.roundId, editing.gameId, editing.teamId, sheet);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
