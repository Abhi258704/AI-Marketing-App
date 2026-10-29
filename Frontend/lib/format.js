const dateTimeFmt = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});
const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
const numberFmt = new Intl.NumberFormat(undefined);
const compactFmt = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });

const toDate = (value) => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const formatDateTime = (value, fallback = "—") => {
  const d = toDate(value);
  return d ? dateTimeFmt.format(d) : fallback;
};

export const formatDate = (value, fallback = "—") => {
  const d = toDate(value);
  return d ? dateFmt.format(d) : fallback;
};

// Format a UTC calendar day (analytics periods are stored in UTC).
export const formatUtcDate = (value, fallback = "—") => {
  const d = toDate(value);
  return d
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone: "UTC" }).format(d)
    : fallback;
};

export const formatNumber = (value) =>
  typeof value === "number" && Number.isFinite(value) ? numberFmt.format(value) : "—";

export const formatCompact = (value) =>
  typeof value === "number" && Number.isFinite(value) ? compactFmt.format(value) : "—";

export function formatRelative(value) {
  const d = toDate(value);
  if (!d) return "";
  const diff = d.getTime() - Date.now();
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const units = [
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];
  for (const [unit, ms] of units) {
    if (abs >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return rtf.format(0, "second");
}

export const truncate = (text, max = 120) =>
  !text ? "" : text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

export const titleCase = (value = "") =>
  value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
