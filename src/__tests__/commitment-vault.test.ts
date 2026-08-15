function truncatePreview(content: string, maxLen: number): string {
  if (content.length <= maxLen) return content;
  return content.slice(0, maxLen) + '...';
}

function calcDaysSinceRecording(currentStreak: number, streakAtRecording: number): number | 'recently' {
  const diff = currentStreak - streakAtRecording;
  return diff < 0 ? 'recently' : diff;
}

function canAddEntry(existingCount: number, isPremium: boolean): boolean {
  if (isPremium) return true;
  return existingCount === 0;
}

describe('truncatePreview', () => {
  it('short content unchanged', () => expect(truncatePreview('hello', 80)).toBe('hello'));
  it('exactly maxLen unchanged', () => {
    const s = 'x'.repeat(80);
    expect(truncatePreview(s, 80)).toBe(s);
  });
  it('maxLen+1 gets "..." suffix', () => {
    const s = 'x'.repeat(81);
    const result = truncatePreview(s, 80);
    expect(result.endsWith('...')).toBe(true);
  });
  it('truncated result length is maxLen + 3', () => {
    const result = truncatePreview('x'.repeat(81), 80);
    expect(result.length).toBe(83);
  });
  it('empty string unchanged', () => expect(truncatePreview('', 80)).toBe(''));
});

describe('calcDaysSinceRecording', () => {
  it('positive diff returns number', () => expect(calcDaysSinceRecording(30, 10)).toBe(20));
  it('zero diff returns 0', () => expect(calcDaysSinceRecording(10, 10)).toBe(0));
  it('negative diff returns "recently"', () => expect(calcDaysSinceRecording(5, 10)).toBe('recently'));
  it('both zero returns 0', () => expect(calcDaysSinceRecording(0, 0)).toBe(0));
  it('large diff', () => expect(calcDaysSinceRecording(365, 0)).toBe(365));
});

describe('canAddEntry', () => {
  it('free user with 0 entries can add', () => expect(canAddEntry(0, false)).toBe(true));
  it('free user with 1 entry cannot add', () => expect(canAddEntry(1, false)).toBe(false));
  it('free user with 5 entries cannot add', () => expect(canAddEntry(5, false)).toBe(false));
  it('premium user with 0 entries can add', () => expect(canAddEntry(0, true)).toBe(true));
  it('premium user with 1 entry can add', () => expect(canAddEntry(1, true)).toBe(true));
  it('premium user with 100 entries can add', () => expect(canAddEntry(100, true)).toBe(true));
});
