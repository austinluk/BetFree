function parseAmountSpent(input: string | undefined): number {
  return parseFloat(input as string) || 0;
}

function calcMoneySaved(totalCleanDays: number, weeklyBetEstimate: number): number {
  return Math.floor((totalCleanDays * weeklyBetEstimate) / 7);
}

describe('parseAmountSpent', () => {
  it('parses "0" as 0', () => expect(parseAmountSpent('0')).toBe(0));
  it('parses "" as 0', () => expect(parseAmountSpent('')).toBe(0));
  it('parses "25.50" as 25.5', () => expect(parseAmountSpent('25.50')).toBe(25.5));
  it('parses "abc" as 0', () => expect(parseAmountSpent('abc')).toBe(0));
  it('parses "100" as 100', () => expect(parseAmountSpent('100')).toBe(100));
  it('parses undefined as 0', () => expect(parseAmountSpent(undefined)).toBe(0));
  it('parses "1.5.5" as 0 (invalid float)', () => expect(parseAmountSpent('1.5.5')).toBe(0));
  it('parses "  " whitespace as 0', () => expect(parseAmountSpent('  ')).toBe(0));
});

describe('calcMoneySaved is not affected by amount_spent', () => {
  it('7 days at $100/wk = $100 regardless of amount_spent', () => {
    // amount_spent is stored separately, never passed to moneySaved
    const saved = calcMoneySaved(7, 100);
    expect(saved).toBe(100);
  });

  it('0 days = $0 saved', () => expect(calcMoneySaved(0, 100)).toBe(0));
  it('no weekly bet = $0 saved', () => expect(calcMoneySaved(30, 0)).toBe(0));
  it('always returns integer', () => {
    expect(Number.isInteger(calcMoneySaved(5, 77))).toBe(true);
  });
});
