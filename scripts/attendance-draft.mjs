/**
 * Regression test for the attendance-draft sessionStorage persistence on the
 * round-setup page: unchecking a player must survive navigating away (e.g.
 * to Standings) and back, and the Rounds tab must land straight back on the
 * in-progress draft rather than the rounds list. Driven with Playwright
 * against a running dev/preview server (URL from BASE_URL, default
 * http://localhost:4173). Exits non-zero on the first failed assertion.
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

  // Sign up a single player.
  await page.getByRole("link", { name: "Players" }).click();
  await page.getByLabel("Name").fill("Alice");
  await page.getByLabel("Gender").selectOption("female");
  await page.getByLabel("Skill").selectOption("2");
  await page.getByRole("button", { name: "Add player" }).click();
  assert((await page.locator("tbody tr").count()) === 1, "1 player registered");

  // Open round setup; the player starts ticked as attending.
  await page.getByRole("link", { name: "Rounds" }).click();
  await page.getByRole("link", { name: "New round" }).click();
  const checkbox = page.getByRole("checkbox", { name: /Alice/ });
  assert(await checkbox.isChecked(), "Alice starts attending");

  // Uncheck her.
  await checkbox.uncheck();
  assert(!(await checkbox.isChecked()), "Alice unchecked");
  assert(await page.getByText("Attendance (0 attending)").isVisible(), "attendance count drops to 0");

  // Navigate away to Standings, then back via the Rounds tab — with a draft
  // in progress this should land straight on round setup, no extra click.
  await page.getByRole("link", { name: "Standings" }).click();
  await page.getByRole("link", { name: "Rounds" }).click();

  // The attendance list should still be there, with Alice still unchecked.
  const checkboxAfter = page.getByRole("checkbox", { name: /Alice/ });
  assert(await checkboxAfter.isVisible(), "attendance list still visible after navigating away and back");
  assert(!(await checkboxAfter.isChecked()), "Alice still unchecked after navigating away and back");
  assert(
    await page.getByText("Attendance (0 attending)").isVisible(),
    "attendance count still 0 after navigating away and back"
  );

  console.log("\nAttendance draft persistence check passed.");
} catch (err) {
  console.error(err.message);
  await page.screenshot({ path: "scripts/attendance-draft-failure.png", fullPage: true });
  console.error("Screenshot written to scripts/attendance-draft-failure.png");
  process.exitCode = 1;
} finally {
  await browser.close();
}
