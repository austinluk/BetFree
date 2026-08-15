// Pure calculation functions matching ledger.tsx logic

function calcAmountThisMonth(daysCleanThisMonth: number, weeklyBetEstimate: number): number {
  return Math.floor((daysCleanThisMonth * weeklyBetEstimate) / 7);
}

function calcGoalProgress(moneySaved: number, goalAmount: number | null): number | null {
  if (!goalAmount || goalAmount <= 0) return null;
  return Math.min(100, Math.floor((moneySaved / goalAmount) * 100));
}

function calcEquivalents(amount: number): Array<{ label: string; count: number }> {
  const items: Array<{ label: string; count: number }> = [];
  const groceries = Math.floor(amount / 200);
  if (groceries >= 1) items.push({ label: 'months of groceries', count: groceries });
  const gas = Math.floor(amount / 60);
  if (gas >= 1) items.push({ label: 'tanks of gas', count: gas });
  const streaming = Math.floor(amount / 15);
  if (streaming >= 1) items.push({ label: 'streaming subscriptions', count: streaming });
  return items;
}

describe('calcAmountThisMonth', () => {
  it('returns 0 for 0 days', () => expect(calcAmountThisMonth(0, 100)).toBe(0));
  it('returns 0 for 0 weekly bet', () => expect(calcAmountThisMonth(7, 0)).toBe(0));
  it('7 days at $100/wk = $100', () => expect(calcAmountThisMonth(7, 100)).toBe(100));
  it('3 days at $100/wk = $42 (floors)', () => expect(calcAmountThisMonth(3, 100)).toBe(42));
  it('30 days at $200/wk = $857', () => expect(calcAmountThisMonth(30, 200)).toBe(857));
  it('always returns integer', () => {
    const result = calcAmountThisMonth(5, 77);
    expect(Number.isInteger(result)).toBe(true);
  });
});

describe('calcGoalProgress', () => {
  it('returns null for null goal', () => expect(calcGoalProgress(500, null)).toBeNull());
  it('returns null for zero goal', () => expect(calcGoalProgress(500, 0)).toBeNull());
  it('50% progress', () => expect(calcGoalProgress(500, 1000)).toBe(50));
  it('capped at 100 when exceeded', () => expect(calcGoalProgress(1500, 1000)).toBe(100));
  it('0 saved = 0%', () => expect(calcGoalProgress(0, 1000)).toBe(0));
  it('exact match = 100%', () => expect(calcGoalProgress(1000, 1000)).toBe(100));
});

describe('calcEquivalents', () => {
  it('returns empty array for $0', () => expect(calcEquivalents(0)).toHaveLength(0));
  it('returns empty for $14 (below streaming threshold)', () => expect(calcEquivalents(14)).toHaveLength(0));
  it('streaming appears at $15', () => {
    const r = calcEquivalents(15);
    expect(r.some(e => e.label.includes('streaming'))).toBe(true);
  });
  it('gas appears at $60', () => {
    const r = calcEquivalents(60);
    expect(r.some(e => e.label.includes('gas'))).toBe(true);
  });
  it('groceries appears at $200', () => {
    const r = calcEquivalents(200);
    expect(r.some(e => e.label.includes('groceries'))).toBe(true);
  });
  it('$500 has groceries and gas', () => {
    const r = calcEquivalents(500);
    const labels = r.map(e => e.label);
    expect(labels.some(l => l.includes('groceries'))).toBe(true);
    expect(labels.some(l => l.includes('gas'))).toBe(true);
  });
  it('groceries count correct for $400 (2 months)', () => {
    const r = calcEquivalents(400);
    const g = r.find(e => e.label.includes('groceries'));
    expect(g?.count).toBe(2);
  });
});
