# Monarchs Cup — League Webapp Plan

A browser-only webapp for running a weekly shuffled-teams ultimate frisbee league.
All state lives in the browser (localStorage); no backend. The organiser's device
is the source of truth, with JSON backup/restore as the safety net.

## Tech stack

- **React 19 + TypeScript**, scaffolded with **Vite**.
- **Zustand** for state, with its `persist` middleware writing the whole league
  state to localStorage (versioned, with a migration hook for future schema changes).
- **React Router** for the pages listed below.
- **Tailwind CSS** for styling.
- **Vitest** for unit tests — the team-generation and scoring logic are pure
  functions and get proper test coverage; UI is tested manually.

## Data model

```ts
type Gender = "female" | "male";
type Skill = 1 | 2 | 3 | 4; // 4 = most skilled

interface Player {
  id: string;
  name: string;
  gender: Gender;
  skill: Skill;
}

interface League {
  schemaVersion: number;
  players: Player[];
  rounds: Round[];
}

interface Round {
  id: string;
  number: number;          // week 1, 2, ...
  date: string;            // ISO date
  attendeeIds: string[];   // confirmed attendance for this round
  games: Game[];
  status: "setup" | "generated" | "complete";
}

interface Game {
  id: string;
  teams: [Team, Team];
  // keyed by team id; a team's sheet is null until submitted
  scoreSheets: Record<string, ScoreSheet | null>;
}

interface Team {
  id: string;
  name: string;            // "Game 1 — Team A" etc.
  playerIds: string[];
}

interface ScoreSheet {
  submittedByTeamId: string;
  ownScore: number;
  opponentScore: number;
  spirit: SpiritScores;    // awarded to the opposing team
  mvpIds: [string, string]; // two MVP votes
  submittedAt: string;
}

// The five standard WFDF/USAU spirit categories, each scored 0–4
interface SpiritScores {
  rulesKnowledge: number;
  foulsAndContact: number;
  fairMindedness: number;
  attitude: number;
  communication: number;
}
```

Derived data (never stored, always computed from `rounds`):

- **Wins per player** — a player gets a win when a game they played in was won
  by their team (winner derived from submitted score sheets).
- **Rounds participated** — count of rounds where the player appears on any team.
- **Spirit per player** — sum of spirit totals (0–20 per game) that the player's
  team *received* across all games they played in.
- **MVP votes per player** — count of appearances in any score sheet's `mvpIds`.

## Pages

### 1. Players (signup)

- Signup form: name, gender, skill (1–4). Adds to the candidate player list.
- Table of all registered players with edit and remove.

### 2. Round setup (weekly attendance)

- Checklist of all registered players; organiser ticks who is attending
  (or marks not attending). New players can be added inline via the same
  signup form and are auto-marked as attending.
- "Generate round" button runs the generator (below) once attendance is
  confirmed, creating a `Round` and navigating to the round view.

### 3. Round view (current round)

- Games displayed side by side; each game shows its two team rosters.
- Roster editing while the game is unlocked:
  - Move a player between any two teams (drag-and-drop or a per-player
    "move to…" menu — the menu is the baseline, DnD is polish).
  - Add a latecomer: pick from non-attending registered players or register
    a brand-new player, then place them on a team.
- **"Submit score"** button under each team roster opens a score-sheet modal
  (modelled on the standard USAU/WFDF sheet):
  - Own score and opponent score (number inputs).
  - Five spirit categories as dropdowns 0–4 (defaulting to 2 = "Good"),
    with the standard category labels and a live total out of 20.
  - Two MVP dropdowns, populated from the **opposing** team's roster
    (standard spirit-sheet practice — see open questions).
- **Locking:** as soon as either team in a game submits a sheet, both of that
  game's rosters become read-only. Other games in the round stay editable
  until they receive a submission.
- A game is complete when both teams have submitted; the round is complete
  when all games are.

### 4. Standings (three pages, or one page with three tabs)

Each grouped by gender (women's table, men's table), ranked descending:

- **Wins** — total games won.
- **Spirit** — total spirit points the player's teams received.
- **MVP** — total MVP votes received.

### 5. Admin

- **Backup:** download the full league state as a timestamped JSON file
  (includes `schemaVersion`).
- **Restore:** file input; validate shape and schema version, show a summary
  ("14 players, 5 rounds — replace current state?") before overwriting.
- **Reset:** wipe the league after a typed confirmation, with a prompt to
  download a backup first.

## Team generation

### Deciding the number of teams

Teams hold 5–7 players and come in pairs (one game each). Given `N` attendees,
pick the largest even team count `T` with `5·T ≤ N` — i.e. `T = floor(N / 5)`
rounded down to even — which maximises the number of games. If `N < 10` there
aren't enough players for two 5-a-side teams; fall back to a single game of two
teams of `floor(N/2)`/`ceil(N/2)` and show the organiser a warning.

### Generating one candidate round

1. Group attendees by (skill level, gender); shuffle each group's order.
2. Deal all female players onto the first two teams as evenly as possible.
3. Deal each remaining group, from most skilled to least skilled, across the
   teams evenly (round-robin, always dealing to the currently smallest team)
   until every team has at least 5 players.
4. Top-up phase: add remaining players to game 1's teams until both have 7,
   then game 2's, and so on.
5. Deal any players still remaining evenly across all teams.

Implemented as a pure function `generateCandidate(attendees, teamCount, rng): Team[][]`
so it's deterministic under a seeded RNG and unit-testable.

### Selecting the best candidate

1. Run the algorithm `K` times (start with `K = 500`; it's cheap) to produce
   candidate rounds.
2. Score each player: `wins + (roundsParticipated < 3 ? skill : 0)`.
3. Team score = sum of its players' scores. Per-game imbalance =
   `|teamA − teamB|`. Candidate badness = **sum of imbalances across its games**.
4. Keep the candidates with minimal badness; pick one uniformly at random.

## Project structure

```
src/
  types.ts             // data model above
  store/league.ts      // Zustand store + persist config + migrations
  lib/
    generator.ts       // candidate generation + selection (pure)
    standings.ts       // derived stats: wins, spirit, MVPs, participation
    backup.ts          // export/import/validate JSON
  pages/
    PlayersPage.tsx
    RoundSetupPage.tsx
    RoundPage.tsx
    StandingsPage.tsx  // tabs: wins / spirit / MVP
    AdminPage.tsx
  components/
    PlayerForm.tsx
    TeamCard.tsx
    ScoreSheetModal.tsx
    SpiritSelect.tsx
tests/
  generator.test.ts    // team sizes, female dealing, skill dealing, top-up order
  standings.test.ts
  backup.test.ts
```

## Milestones

1. **Scaffold + persistence** — Vite/React/TS/Tailwind, types, Zustand store
   persisted to localStorage, routing shell.
2. **Players** — signup form and roster management.
3. **Generator** — attendance flow, candidate generation/selection with unit
   tests, round creation.
4. **Round play** — round view, roster editing, score-sheet modal, game locking.
5. **Standings** — three views grouped by gender.
6. **Admin** — backup, restore, reset; final polish pass.

## Assumptions and open questions

- **"Deal all female players onto the first two teams"** is implemented as
  written, but with 4+ teams this concentrates all women into game 1. If the
  intent was "deal women evenly across *all* teams (starting from the first)",
  it's a one-line change in the generator.
- **MVP dropdowns list the opposing team's players** (matching how spirit
  sheets are normally exchanged). If MVPs should instead honour your own team,
  swap the dropdown source.
- **Conflicting score submissions** (team A says 13–10, team B says 13–11) are
  accepted but flagged on the game card for the organiser to resolve by editing
  a sheet. Wins are derived from each team's own submitted score pair; ties or
  conflicts award no win until resolved.
- **Gender is binary** in the model because the dealing algorithm needs a
  female/non-female split. Adding a third option is possible but needs a rule
  for how it's dealt.
- Score sheets record spirit at the category level (five 0–4 scores) rather
  than a single total, matching the linked USAU sheet.
