/**
 * Signup/edit form for a player: name, gender and skill level (1-4).
 * Controlled locally; calls onSubmit with the entered values and clears
 * itself unless it was seeded with an existing player (edit mode).
 */
import { useEffect, useState } from "react";
import type { Gender, Player, Skill } from "../types";
import type { PlayerInput } from "../store/league";

interface Props {
  initial?: Player | null;
  submitLabel: string;
  onSubmit: (input: PlayerInput) => void;
  onCancel?: () => void;
}

const SKILL_LABELS: Record<Skill, string> = {
  1: "1 — Beginner",
  2: "2 — Intermediate",
  3: "3 — Experienced",
  4: "4 — Elite",
};

export default function PlayerForm({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [gender, setGender] = useState<Gender>(initial?.gender ?? "female");
  const [skill, setSkill] = useState<Skill>(initial?.skill ?? 2);

  useEffect(() => {
    setName(initial?.name ?? "");
    setGender(initial?.gender ?? "female");
    setSkill(initial?.skill ?? 2);
  }, [initial]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), gender, skill });
    if (!initial) {
      setName("");
      setGender("female");
      setSkill(2);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col text-sm font-medium">
        Name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 rounded border border-slate-300 bg-white px-2 py-1.5"
          placeholder="Player name"
        />
      </label>
      <label className="flex flex-col text-sm font-medium">
        Gender
        <select
          value={gender}
          onChange={(e) => setGender(e.target.value as Gender)}
          className="mt-1 rounded border border-slate-300 bg-white px-2 py-1.5"
        >
          <option value="female">Female</option>
          <option value="male">Male</option>
        </select>
      </label>
      <label className="flex flex-col text-sm font-medium">
        Skill
        <select
          value={skill}
          onChange={(e) => setSkill(Number(e.target.value) as Skill)}
          className="mt-1 rounded border border-slate-300 bg-white px-2 py-1.5"
        >
          {([1, 2, 3, 4] as Skill[]).map((s) => (
            <option key={s} value={s}>
              {SKILL_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="rounded bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        disabled={!name.trim()}
      >
        {submitLabel}
      </button>
      {onCancel && (
        <button type="button" onClick={onCancel} className="rounded px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200">
          Cancel
        </button>
      )}
    </form>
  );
}
