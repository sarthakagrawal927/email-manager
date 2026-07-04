const TIME: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
const DATE: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
const DATE_YEAR: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
};
const FULL: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
};

function startOfLocalDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Human-readable email timestamp with a full string for the `title` tooltip. */
export function formatEmailDate(
  iso: string,
  nowMs: number = Date.now()
): { label: string; title: string } {
  const date = new Date(iso);
  const ms = date.getTime();
  if (Number.isNaN(ms)) return { label: iso, title: iso };

  const fmtTime = new Intl.DateTimeFormat(undefined, TIME);
  const fmtDate = new Intl.DateTimeFormat(undefined, DATE);
  const fmtDateYear = new Intl.DateTimeFormat(undefined, DATE_YEAR);
  const fmtFull = new Intl.DateTimeFormat(undefined, FULL);
  const title = fmtFull.format(date);

  const ageMs = nowMs - ms;
  const todayStart = startOfLocalDay(nowMs);
  const yesterdayStart = todayStart - 86_400_000;

  if (ageMs >= 0 && ageMs < 60_000) return { label: 'Just now', title };
  if (ageMs >= 0 && ageMs < 3_600_000) {
    const mins = Math.floor(ageMs / 60_000);
    return { label: `${mins} min ago`, title };
  }
  if (ms >= todayStart) return { label: fmtTime.format(date), title };
  if (ms >= yesterdayStart) return { label: `Yesterday, ${fmtTime.format(date)}`, title };
  if (ageMs >= 0 && ageMs < 7 * 86_400_000) {
    return { label: `${fmtDate.format(date)}, ${fmtTime.format(date)}`, title };
  }

  const sameYear = date.getFullYear() === new Date(nowMs).getFullYear();
  return {
    label: sameYear ? `${fmtDate.format(date)}, ${fmtTime.format(date)}` : fmtDateYear.format(date),
    title,
  };
}

/** Compact label for list rows (no time unless today/yesterday). */
export function formatEmailDateShort(iso: string, nowMs: number = Date.now()): string {
  const date = new Date(iso);
  const ms = date.getTime();
  if (Number.isNaN(ms)) return iso;

  const todayStart = startOfLocalDay(nowMs);
  const yesterdayStart = todayStart - 86_400_000;
  const fmtMonthDay = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
  const fmtYear = new Intl.DateTimeFormat(undefined, DATE_YEAR);

  if (ms >= todayStart) {
    const ageMs = nowMs - ms;
    if (ageMs < 3_600_000) return `${Math.max(1, Math.floor(ageMs / 60_000))}m`;
    return new Intl.DateTimeFormat(undefined, TIME).format(date);
  }
  if (ms >= yesterdayStart) return 'Yesterday';

  const sameYear = date.getFullYear() === new Date(nowMs).getFullYear();
  return sameYear ? fmtMonthDay.format(date) : fmtYear.format(date);
}
