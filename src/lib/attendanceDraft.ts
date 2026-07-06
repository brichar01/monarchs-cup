/**
 * sessionStorage-backed draft of who is ticked as attending on the
 * round-setup page. Lets the selection survive navigating away and back,
 * and lets other pages (the Rounds list) detect that a round setup is
 * still in progress. Cleared once the round is generated.
 */
const DRAFT_KEY = "monarchs-cup-attendance-draft";

export function hasAttendanceDraft(): boolean {
  return sessionStorage.getItem(DRAFT_KEY) != null;
}

export function loadAttendanceDraft(validIds: Set<string>): Set<string> | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const ids: unknown = JSON.parse(raw);
    if (!Array.isArray(ids)) return null;
    return new Set(ids.filter((id): id is string => typeof id === "string" && validIds.has(id)));
  } catch {
    return null;
  }
}

export function saveAttendanceDraft(attending: Set<string>): void {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify([...attending]));
}

export function clearAttendanceDraft(): void {
  sessionStorage.removeItem(DRAFT_KEY);
}
