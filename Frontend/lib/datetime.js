// Scheduling uses <input type="datetime-local">, whose value ("YYYY-MM-DDTHH:mm") is
// wall-clock time in the user's *local* timezone with no offset. `new Date(value)`
// parses that string as local time, and toISOString() converts it to the correct
// UTC instant the backend stores.

const pad = (n) => String(n).padStart(2, "0");

export function toLocalInputValue(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function localInputToIso(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function getTimeZoneName() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "local time";
  } catch {
    return "local time";
  }
}

// Earliest value the picker should allow (a couple of minutes ahead).
export function minScheduleInputValue(minutesAhead = 2) {
  return toLocalInputValue(new Date(Date.now() + minutesAhead * 60_000));
}

// YYYY-MM-DD for a Date using local calendar parts.
export function toDateInputValue(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function daysAgoInput(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toDateInputValue(d);
}

// True when the instant is not at least `minutes` in the future.
export const isTooSoon = (iso, minutes = 1) => new Date(iso).getTime() <= Date.now() + minutes * 60_000;
