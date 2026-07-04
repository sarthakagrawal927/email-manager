import { describe, expect, it } from 'vitest';

import { formatEmailDate, formatEmailDateShort } from '../format-date';

describe('formatEmailDate', () => {
  const now = new Date('2026-07-04T18:00:00').getTime();

  it('formats very recent mail as relative', () => {
    const recent = formatEmailDate('2026-07-04T17:58:00', now);
    expect(recent.label).toBe('2 min ago');
    expect(recent.title).toContain('2026');
  });

  it('formats same-day mail as time only', () => {
    const sameDay = formatEmailDate('2026-07-04T08:02:00', now);
    expect(sameDay.label).toMatch(/8:02/);
  });

  it('formats yesterday with label', () => {
    const yesterday = formatEmailDate('2026-07-03T20:02:00', now);
    expect(yesterday.label).toMatch(/^Yesterday,/);
  });

  it('includes year for older mail', () => {
    const older = formatEmailDate('2025-12-01T12:00:00', now);
    expect(older.label).toContain('2025');
  });
});

describe('formatEmailDateShort', () => {
  const now = new Date('2026-07-04T18:00:00').getTime();

  it('uses compact month/day within the year', () => {
    expect(formatEmailDateShort('2026-06-15T10:00:00', now)).toMatch(/Jun/);
  });

  it('labels yesterday', () => {
    expect(formatEmailDateShort('2026-07-03T10:00:00', now)).toBe('Yesterday');
  });
});
