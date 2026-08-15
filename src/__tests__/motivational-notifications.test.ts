import { MOTIVATIONAL_PUSH_QUOTES, RE_ENGAGEMENT_PUSH_QUOTES } from '../constants/notification-copy';

const BANNED_WORDS = ['bet', 'betting', 'gambling', 'gamble', 'wager', 'odds', 'casino', 'slot', 'lottery'];

function hasBannedWord(str: string): string | null {
  const lower = str.toLowerCase();
  for (const word of BANNED_WORDS) {
    if (lower.includes(word)) return word;
  }
  return null;
}

describe('MOTIVATIONAL_PUSH_QUOTES', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(MOTIVATIONAL_PUSH_QUOTES)).toBe(true);
    expect(MOTIVATIONAL_PUSH_QUOTES.length).toBeGreaterThan(0);
  });

  it('every quote is a non-empty string', () => {
    for (const q of MOTIVATIONAL_PUSH_QUOTES) {
      expect(typeof q).toBe('string');
      expect(q.length).toBeGreaterThan(0);
    }
  });

  it('every quote is under 100 characters', () => {
    for (const q of MOTIVATIONAL_PUSH_QUOTES) {
      expect(q.length).toBeLessThanOrEqual(100);
    }
  });

  it('no quote contains banned words', () => {
    for (const q of MOTIVATIONAL_PUSH_QUOTES) {
      const found = hasBannedWord(q);
      expect(found).toBeNull();
    }
  });
});

describe('RE_ENGAGEMENT_PUSH_QUOTES', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(RE_ENGAGEMENT_PUSH_QUOTES)).toBe(true);
    expect(RE_ENGAGEMENT_PUSH_QUOTES.length).toBeGreaterThan(0);
  });

  it('every quote is a non-empty string', () => {
    for (const q of RE_ENGAGEMENT_PUSH_QUOTES) {
      expect(typeof q).toBe('string');
      expect(q.length).toBeGreaterThan(0);
    }
  });

  it('every quote is under 100 characters', () => {
    for (const q of RE_ENGAGEMENT_PUSH_QUOTES) {
      expect(q.length).toBeLessThanOrEqual(100);
    }
  });

  it('no quote contains banned words', () => {
    for (const q of RE_ENGAGEMENT_PUSH_QUOTES) {
      const found = hasBannedWord(q);
      expect(found).toBeNull();
    }
  });
});

describe('Quote rotation by day seed', () => {
  it('index stays in bounds for day 1', () => {
    const idx = 1 % MOTIVATIONAL_PUSH_QUOTES.length;
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(MOTIVATIONAL_PUSH_QUOTES.length);
  });

  it('index stays in bounds for day 100', () => {
    const idx = 100 % MOTIVATIONAL_PUSH_QUOTES.length;
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(MOTIVATIONAL_PUSH_QUOTES.length);
  });

  it('index stays in bounds for day 365', () => {
    const idx = 365 % MOTIVATIONAL_PUSH_QUOTES.length;
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(MOTIVATIONAL_PUSH_QUOTES.length);
  });

  it('same day always gives same quote', () => {
    const day = 42;
    const idx1 = day % MOTIVATIONAL_PUSH_QUOTES.length;
    const idx2 = day % MOTIVATIONAL_PUSH_QUOTES.length;
    expect(MOTIVATIONAL_PUSH_QUOTES[idx1]).toBe(MOTIVATIONAL_PUSH_QUOTES[idx2]);
  });
});
