/**
 * End-to-end smoke test driven with Playwright against a running dev/preview
 * server (URL from BASE_URL, default http://localhost:4173). Exercises the
 * whole organiser flow: signup, attendance, round generation, roster moves,
 * both score sheets, standings and localStorage persistence.
 * Exits non-zero on the first failed assertion.
 */
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:4173";

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERT FAILED: ${message}`);
  console.log(`ok - ${message}`);
}

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();
page.setDefaultTimeout(10_000);

try {
  await page.goto(BASE_URL);

  // Sign up 12 players: 4 female, 8 male, mixed skills.
  await page.getByRole("link", { name: "Players" }).click();
  for (let i = 1; i <= 12; i++) {
    const gender = i <= 4 ? "female" : "male";
    const skill = String((i % 4) + 1);
    await page.getByLabel("Name").fill(`P${String(i).padStart(2, "0")}`);
    await page.getByLabel("Gender").selectOption(gender);
    await page.getByLabel("Skill").selectOption(skill);
    await page.getByRole("button", { name: "Add player" }).click();
  }
  assert((await page.locator("tbody tr").count()) === 12, "12 players registered");

  // New round: everyone attending by default -> 2 teams, 1 game.
  await page.getByRole("link", { name: "Rounds" }).click();
  await page.getByRole("link", { name: "New round" }).click();
  assert(await page.getByText("12 attendees → 1 game").isVisible(), "attendance summary shown");
  await page.getByRole("button", { name: "Generate round" }).click();

  await page.getByRole("heading", { name: "Game 1", exact: true }).waitFor();
  const teamNames = await page.locator("h4").allTextContents();
  assert(teamNames.includes("Game 1 — Team A") && teamNames.includes("Game 1 — Team B"), "two teams generated");

  // Reroll: every attendee is redrawn onto the same number of teams.
  await page.getByRole("button", { name: "Reroll teams" }).click();
  const rerolled = await page.locator("div.bg-slate-50 li span.font-medium").allTextContents();
  assert(rerolled.length === 12, `reroll kept all 12 players (got ${rerolled.length})`);
  assert((await page.locator("h4").count()) === 2, "reroll kept the round at 2 teams");

  const teamACard = page.locator('div.bg-slate-50:has(h4:text-is("Game 1 — Team A"))');
  const teamAPlayers = await teamACard.locator("li span.font-medium").allTextContents();
  assert(teamAPlayers.length === 6, `team A has 6 players (got ${teamAPlayers.length})`);

  // Move team A's first player over to Team B.
  await teamACard.locator("li select").first().selectOption({ label: "Game 1 — Team B" });
  assert(await teamACard.getByText("5 players").isVisible(), "player moved out of team A");

  // Submit Team A's score sheet: 13-10 win, MVPs from team B.
  const modal = page.locator("div.fixed");
  await page.getByRole("button", { name: "Submit score" }).first().click();
  await modal.getByLabel("Game 1 — Team A (you)").selectOption("13");
  await modal.getByLabel("Game 1 — Team B").selectOption("10");
  await modal.getByLabel("MVP 1").selectOption({ index: 1 });
  await modal.getByLabel("MVP 2").selectOption({ index: 1 });
  await modal.getByRole("button", { name: "Submit score sheet" }).click();
  assert(await page.getByText("Score submitted: 13–10").isVisible(), "team A sheet recorded");
  assert(await page.getByText("Rosters locked").isVisible(), "game locked after first sheet");
  assert((await page.locator("li select").count()) === 0, "move dropdowns removed when locked");
  assert(
    (await page.getByRole("button", { name: "Reroll teams" }).count()) === 0,
    "reroll withdrawn once a sheet is submitted"
  );

  // Submit Team B's agreeing sheet: 10-13.
  await page.getByRole("button", { name: "Submit score" }).click();
  await modal.getByLabel("Game 1 — Team B (you)").selectOption("10");
  await modal.getByLabel("Game 1 — Team A").selectOption("13");
  await modal.getByLabel("MVP 1").selectOption({ index: 1 });
  await modal.getByLabel("MVP 2").selectOption({ index: 1 });
  await modal.getByRole("button", { name: "Submit score sheet" }).click();
  assert(await page.getByText("Game 1 — Team A wins").isVisible(), "winner derived from agreeing sheets");
  assert(await page.getByText("Complete").isVisible(), "round marked complete");

  // Standings: a Team A player should have 1 win; spirit tab shows 10 (default 2x5).
  const winner = teamAPlayers.find((name) => name !== teamAPlayers[0]) ?? teamAPlayers[0];
  await page.getByRole("link", { name: "Standings" }).click();
  const winnerRow = page.locator("tr", { hasText: winner }).first();
  assert((await winnerRow.locator("td").nth(2).textContent()) === "1", `${winner} has 1 win`);
  await page.getByRole("button", { name: "Spirit" }).click();
  const spiritCells = await page.locator("td:nth-child(3)").allTextContents();
  assert(spiritCells.every((c) => c === "10"), "all players received default spirit 10");
  await page.getByRole("button", { name: "MVPs" }).click();
  const mvpTotals = (await page.locator("td:nth-child(3)").allTextContents()).map(Number);
  assert(mvpTotals.reduce((a, b) => a + b, 0) === 4, "four MVP votes tallied");

  // Persistence: state survives a reload.
  await page.reload();
  await page.getByRole("link", { name: "Rounds" }).click();
  assert(await page.getByText("Round 1").isVisible(), "round persisted across reload");

  console.log("\nAll smoke checks passed.");
} catch (err) {
  console.error(err.message);
  await page.screenshot({ path: "scripts/smoke-failure.png", fullPage: true });
  console.error("Screenshot written to scripts/smoke-failure.png");
  process.exitCode = 1;
} finally {
  await browser.close();
}
