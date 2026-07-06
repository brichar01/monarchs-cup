/**
 * Round history: lists every generated round with its status and links to
 * the round view; entry point for starting a new round. If a round setup is
 * already in progress (an attendance draft exists), skip straight to it
 * instead of making the user click "New round" again.
 */
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLeague } from "../store/league";
import { hasAttendanceDraft } from "../lib/attendanceDraft";

export default function RoundsPage() {
  const rounds = useLeague((s) => s.rounds);
  const navigate = useNavigate();

  useEffect(() => {
    if (hasAttendanceDraft()) navigate("/rounds/new", { replace: true });
  }, [navigate]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Rounds</h2>
        <Link
          to="/rounds/new"
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          New round
        </Link>
      </div>

      {rounds.length === 0 ? (
        <p className="rounded-lg bg-white p-4 text-sm text-slate-500 shadow">
          No rounds yet. Start a new round to take attendance and generate teams.
        </p>
      ) : (
        <ul className="space-y-2">
          {[...rounds].reverse().map((round) => (
            <li key={round.id}>
              <Link
                to={`/rounds/${round.id}`}
                className="flex items-center justify-between rounded-lg bg-white p-4 shadow hover:bg-indigo-50"
              >
                <span className="font-medium">Round {round.number}</span>
                <span className="text-sm text-slate-500">
                  {round.date} · {round.attendeeIds.length} players · {round.games.length}{" "}
                  {round.games.length === 1 ? "game" : "games"}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    round.status === "complete" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {round.status === "complete" ? "Complete" : "In progress"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
