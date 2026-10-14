const DAY_MS = 24 * 60 * 60 * 1000;

export function daysBetween(fromIso: string, to: Date): number {
  return (to.getTime() - new Date(fromIso).getTime()) / DAY_MS;
}

export function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? "" : "s"}`;
}

/** "today", "3 days ago", "2 months ago", "4 years ago". */
export function formatAgo(days: number): string {
  if (days < 1) return "today";
  if (days < 30) return `${plural(Math.floor(days), "day")} ago`;
  if (days < 365) return `${plural(Math.floor(days / 30), "month")} ago`;
  return `${plural(Math.floor(days / 365), "year")} ago`;
}

/** A duration without "ago": "less than a day", "45 days". */
export function formatDuration(days: number): string {
  if (days < 1) return "less than a day";
  return plural(Math.round(days), "day");
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}
