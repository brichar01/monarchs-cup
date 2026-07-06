/**
 * Player signup and roster management. Players who already appear in a
 * round cannot be removed, so historic standings stay intact.
 */
import { useMemo, useState } from "react";
import { useLeague } from "../store/league";
import type { Player } from "../types";
import PlayerForm from "../components/PlayerForm";

export default function PlayersPage() {
  const players = useLeague((s) => s.players);
  const rounds = useLeague((s) => s.rounds);
  const addPlayer = useLeague((s) => s.addPlayer);
  const updatePlayer = useLeague((s) => s.updatePlayer);
  const removePlayer = useLeague((s) => s.removePlayer);
  const [editing, setEditing] = useState<Player | null>(null);

  const playersInRounds = useMemo(
    () => new Set(rounds.flatMap((r) => r.games.flatMap((g) => g.teams.flatMap((t) => t.playerIds)))),
    [rounds]
  );

  return (
    <div className="space-y-6">
      <section className="rounded-lg bg-white p-4 shadow">
        <h2 className="mb-3 text-base font-semibold">{editing ? `Edit ${editing.name}` : "Sign up a player"}</h2>
        <PlayerForm
          initial={editing}
          submitLabel={editing ? "Save changes" : "Add player"}
          onSubmit={(input) => {
            if (editing) {
              updatePlayer(editing.id, input);
              setEditing(null);
            } else {
              addPlayer(input);
            }
          }}
          onCancel={editing ? () => setEditing(null) : undefined}
        />
      </section>

      <section className="rounded-lg bg-white p-4 shadow">
        <h2 className="mb-3 text-base font-semibold">Registered players ({players.length})</h2>
        {players.length === 0 ? (
          <p className="text-sm text-slate-500">No players signed up yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="py-2">Name</th>
                <th className="py-2">Gender</th>
                <th className="py-2">Skill</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="py-2 font-medium">{p.name}</td>
                  <td className="py-2 capitalize">{p.gender}</td>
                  <td className="py-2">{p.skill}</td>
                  <td className="py-2 text-right">
                    <button onClick={() => setEditing(p)} className="mr-2 text-indigo-600 hover:underline">
                      Edit
                    </button>
                    <button
                      onClick={() => removePlayer(p.id)}
                      disabled={playersInRounds.has(p.id)}
                      title={playersInRounds.has(p.id) ? "Player has played in a round and cannot be removed" : undefined}
                      className="text-red-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-300"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
