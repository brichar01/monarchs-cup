/**
 * Round view: the round's games with editable team rosters, latecomer
 * additions, per-team score submission and game results. A game's rosters
 * lock as soon as either of its teams submits a score sheet.
 * The open score-sheet modal (which game/team, plus its in-progress
 * scores/spirit/MVP picks) is kept in sessionStorage so it survives
 * navigating away and back; it is cleared once that sheet is submitted
 * or the modal is closed.
 */
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useLeague } from "../store/league";
import { gameResult } from "../lib/standings";
import TeamCard from "../components/TeamCard";
import ScoreSheetModal, { createScoreSheetDraft, type ScoreSheetDraft } from "../components/ScoreSheetModal";
import PlayerForm from "../components/PlayerForm";

interface ScoreSheetOpen {
  gameId: string;
  teamId: string;
  draft: ScoreSheetDraft;
}

function scoreSheetDraftKey(roundId: string) {
  return `monarchs-cup-score-sheet-draft-${roundId}`;
}

function loadScoreSheetOpen(roundId: string): ScoreSheetOpen | null {
  try {
    const raw = sessionStorage.getItem(scoreSheetDraftKey(roundId));
    return raw ? (JSON.parse(raw) as ScoreSheetOpen) : null;
  } catch {
    return null;
  }
}

export default function RoundPage() {
  const { roundId } = useParams<{ roundId: string }>();
  const players = useLeague((s) => s.players);
  const round = useLeague((s) => s.rounds.find((r) => r.id === roundId));
  const movePlayer = useLeague((s) => s.movePlayer);
  const addLatecomer = useLeague((s) => s.addLatecomer);
  const addPlayer = useLeague((s) => s.addPlayer);
  const submitScoreSheet = useLeague((s) => s.submitScoreSheet);

  const [scoreSheetFor, setScoreSheetFor] = useState<ScoreSheetOpen | null>(() =>
    roundId ? loadScoreSheetOpen(roundId) : null
  );

  useEffect(() => {
    if (!roundId) return;
    const key = scoreSheetDraftKey(roundId);
    if (scoreSheetFor) sessionStorage.setItem(key, JSON.stringify(scoreSheetFor));
    else sessionStorage.removeItem(key);
  }, [roundId, scoreSheetFor]);

  const [latecomerId, setLatecomerId] = useState("");
  const [latecomerTeamId, setLatecomerTeamId] = useState("");
  const [showNewLatecomer, setShowNewLatecomer] = useState(false);

  const playerById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  if (!round) return <p className="text-sm text-slate-500">Round not found.</p>;

  const allTeams = round.games.flatMap((g) => g.teams);
  const openTeams = round.games
    .filter((g) => g.teams.every((t) => g.scoreSheets[t.id] === null))
    .flatMap((g) => g.teams);
  const onTeams = new Set(allTeams.flatMap((t) => t.playerIds));
  const latecomerCandidates = players.filter((p) => !onTeams.has(p.id));

  const addLatecomerToTeam = (playerId: string) => {
    const teamId = openTeams.some((t) => t.id === latecomerTeamId) ? latecomerTeamId : openTeams[0]?.id;
    if (!playerId || !teamId) return;
    addLatecomer(round.id, playerId, teamId);
    setLatecomerId("");
  };

  const modalContext = (() => {
    if (!scoreSheetFor) return null;
    const game = round.games.find((g) => g.id === scoreSheetFor.gameId);
    if (!game) return null;
    const team = game.teams.find((t) => t.id === scoreSheetFor.teamId);
    const opponent = game.teams.find((t) => t.id !== scoreSheetFor.teamId);
    if (!team || !opponent) return null;
    return { game, team, opponent };
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">
          Round {round.number} · {round.date}
        </h2>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            round.status === "complete" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
          }`}
        >
          {round.status === "complete" ? "Complete" : "In progress"}
        </span>
      </div>

      {round.games.map((game, index) => {
        const locked = game.teams.some((t) => game.scoreSheets[t.id] !== null);
        const result = gameResult(game);
        const [a, b] = game.teams;
        return (
          <section key={game.id} className="rounded-lg bg-white p-4 shadow">
            <div className="mb-3 flex items-center gap-3">
              <h3 className="font-semibold">Game {index + 1}</h3>
              {result.conflict && (
                <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
                  Score sheets disagree — edit needed
                </span>
              )}
              {!result.conflict && result.scores && (
                <span className="text-sm text-slate-600">
                  {result.scores[a.id]}–{result.scores[b.id]}
                  {result.winnerTeamId
                    ? ` · ${game.teams.find((t) => t.id === result.winnerTeamId)?.name} wins`
                    : " · Draw"}
                  {!result.complete && " (one sheet submitted)"}
                </span>
              )}
              {locked && <span className="ml-auto text-xs text-slate-400">Rosters locked</span>}
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              {game.teams.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  allTeams={openTeams}
                  playerById={playerById}
                  locked={locked}
                  sheet={game.scoreSheets[team.id]}
                  onMove={(playerId, toTeamId) => movePlayer(round.id, playerId, toTeamId)}
                  onSubmitScore={() =>
                    setScoreSheetFor({ gameId: game.id, teamId: team.id, draft: createScoreSheetDraft() })
                  }
                />
              ))}
            </div>
          </section>
        );
      })}

      <section className="rounded-lg bg-white p-4 shadow">
        <h3 className="mb-3 font-semibold">Add a latecomer</h3>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col text-sm font-medium">
            Player
            <select
              value={latecomerId}
              onChange={(e) => setLatecomerId(e.target.value)}
              className="mt-1 rounded border border-slate-300 bg-white px-2 py-1.5"
            >
              <option value="">Select player…</option>
              {latecomerCandidates.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-sm font-medium">
            Team
            <select
              value={latecomerTeamId}
              onChange={(e) => setLatecomerTeamId(e.target.value)}
              className="mt-1 rounded border border-slate-300 bg-white px-2 py-1.5"
            >
              {openTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={() => addLatecomerToTeam(latecomerId)}
            disabled={!latecomerId}
            className="rounded bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Add to team
          </button>
          <button
            onClick={() => setShowNewLatecomer((v) => !v)}
            className="rounded px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50"
          >
            {showNewLatecomer ? "Hide new-player form" : "New player?"}
          </button>
        </div>
        {showNewLatecomer && (
          <div className="mt-4 border-t pt-4">
            <PlayerForm
              submitLabel="Sign up & add to team"
              onSubmit={(input) => addLatecomerToTeam(addPlayer(input))}
            />
          </div>
        )}
        <p className="mt-2 text-xs text-slate-400">Latecomers can only join games that have not submitted a score.</p>
      </section>

      {modalContext && scoreSheetFor && (
        <ScoreSheetModal
          team={modalContext.team}
          opponent={modalContext.opponent}
          playerById={playerById}
          draft={scoreSheetFor.draft}
          onDraftChange={(draft) => setScoreSheetFor({ ...scoreSheetFor, draft })}
          onClose={() => setScoreSheetFor(null)}
          onSubmit={(sheet) => {
            submitScoreSheet(round.id, modalContext.game.id, modalContext.team.id, sheet);
            setScoreSheetFor(null);
          }}
        />
      )}
    </div>
  );
}
