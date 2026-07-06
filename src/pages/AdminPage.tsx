/**
 * League administration: download a JSON backup, restore from a backup file
 * (with a confirmation summary before overwriting), and reset the league
 * behind a typed confirmation.
 */
import { useRef, useState } from "react";
import { useLeague } from "../store/league";
import { downloadBackup, parseBackup } from "../lib/backup";
import type { League } from "../types";

export default function AdminPage() {
  const players = useLeague((s) => s.players);
  const rounds = useLeague((s) => s.rounds);
  const importLeague = useLeague((s) => s.importLeague);
  const resetLeague = useLeague((s) => s.resetLeague);

  const fileInput = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<League | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [resetText, setResetText] = useState("");

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
    </div>
  );
}
