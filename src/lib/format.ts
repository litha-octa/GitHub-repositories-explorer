const DAY_MS = 24 * 60 * 60 * 1000;

export function daysBetween(fromIso: string, to: Date): number {
  return (to.getTime() - new Date(fromIso).getTime()) / DAY_MS;
}

/** "hari ini", "3 hari lalu", "2 bulan lalu", "4 tahun lalu". */
export function formatAgo(days: number): string {
  if (days < 1) return "hari ini";
  if (days < 30) return `${Math.floor(days)} hari lalu`;
  if (days < 365) return `${Math.floor(days / 30)} bulan lalu`;
  return `${Math.floor(days / 365)} tahun lalu`;
}

/** Durasi tanpa "lalu": "kurang dari 1 hari", "45 hari". */
export function formatDuration(days: number): string {
  if (days < 1) return "kurang dari 1 hari";
  return `${Math.round(days)} hari`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString("id-ID");
}
