// Tests for streak math and money-saved calculation
// useMoneySaved = floor((totalCleanDays * weeklyBetEstimate) / 7)

function moneySaved(totalCleanDays: number, weeklyBetEstimate: number): number {
  return Math.floor((totalCleanDays * weeklyBetEstimate) / 7);
}

describe('moneySaved', () => {
  it('returns 0 on day 0', () => {
    expect(moneySaved(0, 200)).toBe(0);
  });

  it('returns 0 when weeklyBetEstimate is 0', () => {
    expect(moneySaved(30, 0)).toBe(0);
  });

  it('calculates correctly at exactly 7 days', () => {
    expect(moneySaved(7, 100)).toBe(100);
  });

  it('floors partial days — day 3 of a $100/wk bettor', () => {
    // 3 * 100 / 7 = 42.857 → 42
    expect(moneySaved(3, 100)).toBe(42);
  });

  it('calculates 30 days at $200/week', () => {
    // 30 * 200 / 7 = 857.14 → 857
    expect(moneySaved(30, 200)).toBe(857);
  });

  it('calculates 1 year (365 days) at $500/week', () => {
    // 365 * 500 / 7 = 26071.42 → 26071
    expect(moneySaved(365, 500)).toBe(26071);
  });

  it('handles the largest preset weekly amount ($2000)', () => {
    expect(moneySaved(7, 2000)).toBe(2000);
  });

  it('result is always an integer (no decimals)', () => {
    const result = moneySaved(13, 150);
    expect(Number.isInteger(result)).toBe(true);
  });
});
