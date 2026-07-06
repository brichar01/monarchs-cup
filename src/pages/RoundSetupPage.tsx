/**
 * Weekly attendance: tick who is playing (everyone starts ticked), sign up
 * new players inline (auto-ticked), then generate the round's teams.
 * The in-progress selection is kept in sessionStorage so it survives
 * navigating away and back; it is cleared once the round is generated.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLeague } from "../store/league";
import { decideTeamCount } from "../lib/generator";
import { clearAttendanceDraft, loadAttendanceDraft, saveAttendanceDraft } from "../lib/attendanceDraft";
import PlayerForm from "../components/PlayerForm";

const MIN_ATTENDEES = 4;

export default function RoundSetupPage() {
  const players = useLeague((s) => s.players);
  const addPlayer = useLeague((s) => s.addPlayer);
  const generateRound = useLeague((s) => s.generateRound);
  const navigate = useNavigate();

  const [attending, setAttending] = useState<Set<string>>(() => {
    const validIds = new Set(players.map((p) => p.id));
    return loadAttendanceDraft(validIds) ?? validIds;
  });

  useEffect(() => {
    saveAttendanceDraft(attending);
  }, [attending]);

  const toggle = (id: string) => {
    setAttending((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const count = attending.size;
  const teamCount = decideTeamCount(count);
  const games = teamCount / 2;

  const generate = () => {
    const roundId = generateRound([...attending]);
    clearAttendanceDraft();
    navigate(`/rounds/${roundId}`);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg bg-white p-4 shadow">
        <h2 className="mb-3 text-base font-semibold">Sign up a new player (attending tonight)</h2>
        <PlayerForm
          submitLabel="Add & mark attending"
          onSubmit={(input) => {
            const id = addPlayer(input);
            setAttending((prev) => new Set(prev).add(id));
          }}
        />
      </section>

      <section className="rounded-lg bg-white p-4 shadow">
        <h2 className="mb-3 text-base font-semibold">Attendance ({count} attending)</h2>
        {players.length === 0 ? (
          <p className="text-sm text-slate-500">No registered players — sign some up above.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {players.map((p) => (
              <li key={p.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50">
                  <input type="checkbox" checked={attending.has(p.id)} onChange={() => toggle(p.id)} />
                  <span className="font-medium">{p.name}</span>
                  <span className="text-xs text-slate-400 capitalize">
                    {p.gender} · skill {p.skill}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg bg-white p-4 shadow">
        <p className="mb-3 text-sm text-slate-600">
          {count < MIN_ATTENDEES
            ? `At least ${MIN_ATTENDEES} attendees are needed to generate a round.`
            : count < 10
              ? `${count} attendees → 1 game with reduced teams of ${Math.floor(count / 2)}–${Math.ceil(count / 2)} (fewer than the usual 5-a-side minimum).`
              : `${count} attendees → ${games} ${games === 1 ? "game" : "games"} (${teamCount} teams of 5–7).`}
        </p>
        <button
          onClick={generate}
          disabled={count < MIN_ATTENDEES}
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          Generate round
        </button>
      </section>
    </div>
  );
}
