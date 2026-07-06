/**
 * Standings: three tabs (wins, spirit, MVP votes), each showing a women's
 * and a men's table ranked by the selected metric.
 */
import { useMemo, useState } from "react";
import { useLeague } from "../store/league";
import { computeStats, type PlayerStats } from "../lib/standings";
import type { Gender, Player } from "../types";

type Metric = "wins" | "spirit" | "mvpVotes";

const TABS: { key: Metric; label: string; column: string }[] = [
  { key: "wins", label: "Wins", column: "Wins" },
  { key: "spirit", label: "Spirit", column: "Total spirit" },
  { key: "mvpVotes", label: "MVPs", column: "MVP votes" },
];

export default function StandingsPage() {
  const players = useLeague((s) => s.players);
  const rounds = useLeague((s) => s.rounds);
  const [metric, setMetric] = useState<Metric>("wins");

  const stats = useMemo(() => computeStats({ players, rounds }), [players, rounds]);
  const emptyStats: PlayerStats = { wins: 0, spirit: 0, mvpVotes: 0, roundsParticipated: 0, gamesPlayed: 0 };
  const statsFor = (p: Player) => stats.get(p.id) ?? emptyStats;

  const table = (gender: Gender, title: string) => {
    const rows = players
      .filter((p) => p.gender === gender)
      .map((p) => ({ player: p, stats: statsFor(p) }))
      .sort((a, b) => b.stats[metric] - a.stats[metric] || a.player.name.localeCompare(b.player.name));
    const column = TABS.find((t) => t.key === metric)!.column;

    return (
      <section className="flex-1 rounded-lg bg-white p-4 shadow">
        <h3 className="mb-3 font-semibold">{title}</h3>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">No players.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="py-2">#</th>
                <th className="py-2">Player</th>
                <th className="py-2 text-right">{column}</th>
                <th className="py-2 text-right">Rounds</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ player, stats: s }, i) => (
                <tr key={player.id} className="border-b last:border-0">
                  <td className="py-2 text-slate-400">{i + 1}</td>
                  <td className="py-2 font-medium">{player.name}</td>
                  <td className="py-2 text-right font-semibold">{s[metric]}</td>
                  <td className="py-2 text-right text-slate-400">{s.roundsParticipated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-1">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setMetric(key)}
            className={`rounded px-4 py-2 text-sm font-semibold ${
              metric === key ? "bg-indigo-600 text-white" : "bg-white text-slate-600 shadow hover:bg-indigo-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-6 md:flex-row">
        {table("female", "Women")}
        {table("male", "Men")}
      </div>
    </div>
  );
}
