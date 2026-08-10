/**
 * Score-sheet modal, modelled on the standard USAU/WFDF sheet: final scores,
 * the five spirit categories (0-4 dropdowns, awarded to the opposing team)
 * and two MVP votes for players on the opposing team.
 * The same modal is reused to correct an already-submitted sheet (`editing`),
 * seeded from the stored sheet with `scoreSheetDraftFrom`.
 */
import type { Player, ScoreSheet, SpiritScores, Team } from "../types";
import { SPIRIT_CATEGORIES, SPIRIT_RATINGS } from "../types";

export interface ScoreSheetDraft {
  ownScore: number;
  opponentScore: number;
  spirit: SpiritScores;
  mvp1: string;
  mvp2: string;
}

export const DEFAULT_SPIRIT: SpiritScores = {
  rulesKnowledge: 2,
  foulsAndContact: 2,
  fairMindedness: 2,
  attitude: 2,
  communication: 2,
};

export function createScoreSheetDraft(): ScoreSheetDraft {
  return { ownScore: 0, opponentScore: 0, spirit: DEFAULT_SPIRIT, mvp1: "", mvp2: "" };
}

export function scoreSheetDraftFrom(sheet: ScoreSheet): ScoreSheetDraft {
  return {
    ownScore: sheet.ownScore,
    opponentScore: sheet.opponentScore,
    spirit: sheet.spirit,
    mvp1: sheet.mvpIds[0],
    mvp2: sheet.mvpIds[1],
  };
}

interface Props {
  team: Team;
  opponent: Team;
  playerById: Map<string, Player>;
  draft: ScoreSheetDraft;
  editing?: boolean;
  onDraftChange: (draft: ScoreSheetDraft) => void;
  onSubmit: (sheet: ScoreSheet) => void;
  onClose: () => void;
}

const MAX_SCORE = 30;
const SCORE_OPTIONS = Array.from({ length: MAX_SCORE + 1 }, (_, i) => i);

export default function ScoreSheetModal({
  team,
  opponent,
  playerById,
  draft,
  editing = false,
  onDraftChange,
  onSubmit,
  onClose,
}: Props) {
  const { ownScore, opponentScore, spirit, mvp1, mvp2 } = draft;
  const setOwnScore = (v: number) => onDraftChange({ ...draft, ownScore: v });
  const setOpponentScore = (v: number) => onDraftChange({ ...draft, opponentScore: v });
  const setMvp1 = (v: string) => onDraftChange({ ...draft, mvp1: v });
  const setMvp2 = (v: string) => onDraftChange({ ...draft, mvp2: v });

  const spiritSum = Object.values(spirit).reduce((a, b) => a + b, 0);
  const valid = mvp1 !== "" && mvp2 !== "" && mvp1 !== mvp2;

  const submit = () => {
    if (!valid) return;
    onSubmit({
      submittedByTeamId: team.id,
      ownScore,
      opponentScore,
      spirit,
      mvpIds: [mvp1, mvp2],
      submittedAt: new Date().toISOString(),
    });
  };

  const scoreSelect = (label: string, value: number, setValue: (v: number) => void) => (
    <label className="flex flex-col text-sm font-medium">
      {label}
      <select
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="mt-1 rounded border border-slate-300 bg-white px-2 py-1.5"
      >
        {SCORE_OPTIONS.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  );

  const mvpSelect = (label: string, value: string, setValue: (v: string) => void, exclude: string) => (
    <label className="flex flex-col text-sm font-medium">
      {label}
      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="mt-1 rounded border border-slate-300 bg-white px-2 py-1.5"
      >
        <option value="">Select player…</option>
        {opponent.playerIds
          .filter((id) => id !== exclude)
          .map((id) => (
            <option key={id} value={id}>
              {playerById.get(id)?.name ?? "Unknown"}
            </option>
          ))}
      </select>
    </label>
  );

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-full w-full max-w-lg overflow-y-auto rounded-lg bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-1 text-lg font-semibold">
          {editing ? "Edit score sheet" : "Score sheet"} — {team.name}
        </h3>
        <p className="mb-4 text-sm text-slate-500">
          Spirit scores and MVP votes are awarded to {opponent.name}.{" "}
          {editing ? "Saving replaces the submitted sheet and updates the standings." : "Submitting locks both teams in this game."}
        </p>

        <div className="mb-4 grid grid-cols-2 gap-3">
          {scoreSelect(`${team.name} (you)`, ownScore, setOwnScore)}
          {scoreSelect(opponent.name, opponentScore, setOpponentScore)}
        </div>

        <h4 className="mb-2 text-sm font-semibold">Spirit of the Game (for {opponent.name})</h4>
        <div className="mb-1 space-y-2">
          {SPIRIT_CATEGORIES.map(({ key, label }) => (
            <label key={key} className="flex items-center justify-between gap-3 text-sm">
              {label}
              <select
                value={spirit[key]}
                onChange={(e) => onDraftChange({ ...draft, spirit: { ...spirit, [key]: Number(e.target.value) } })}
                className="rounded border border-slate-300 bg-white px-2 py-1"
              >
                {SPIRIT_RATINGS.map((rating, n) => (
                  <option key={n} value={n}>
                    {rating}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <p className="mb-4 text-right text-sm font-medium text-slate-600">Total: {spiritSum}/20</p>

        <h4 className="mb-2 text-sm font-semibold">MVPs (from {opponent.name})</h4>
        <div className="mb-5 grid grid-cols-2 gap-3">
          {mvpSelect("MVP 1", mvp1, setMvp1, mvp2)}
          {mvpSelect("MVP 2", mvp2, setMvp2, mvp1)}
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!valid}
            className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {editing ? "Save changes" : "Submit score sheet"}
          </button>
        </div>
      </div>
    </div>
  );
}
