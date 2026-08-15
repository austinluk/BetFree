import {
  NOTIFICATION_COPY,
  buildMilestoneTitle,
  buildMilestoneBody,
  buildWeeklySummaryBody,
} from '../constants/notification-copy';

const BANNED_WORDS = ['bet', 'betting', 'gambling', 'gamble', 'wager', 'odds', 'casino'];

function containsBannedWord(text: string): string | null {
  const lower = text.toLowerCase();
  for (const word of BANNED_WORDS) {
    // whole-word match to avoid false positives like "better"
    const regex = new RegExp(`\\b${word}\\b`);
    if (regex.test(lower)) return word;
  }
  return null;
}

function assertClean(text: string) {
  const found = containsBannedWord(text);
  if (found) throw new Error(`"${text}" contains banned word "${found}"`);
}

describe('notification copy — no banned words', () => {
  it('streak reminder title is clean', () => {
    assertClean(NOTIFICATION_COPY.streakReminder.title);
  });

  it('streak reminder body is clean', () => {
    assertClean(NOTIFICATION_COPY.streakReminder.body);
  });

  it('streak at risk title is clean', () => {
    assertClean(NOTIFICATION_COPY.streakAtRisk.title);
  });

  it('streak at risk body is clean', () => {
    assertClean(NOTIFICATION_COPY.streakAtRisk.body);
  });

  it('weekly summary title is clean', () => {
    assertClean(NOTIFICATION_COPY.weeklySummary.title);
  });

  it('weekly summary body is clean for typical values', () => {
    assertClean(buildWeeklySummaryBody(5, 3, 142));
  });

  it('milestone title is clean for various day counts', () => {
    [1, 7, 30, 90, 365].forEach((days) => assertClean(buildMilestoneTitle(days)));
  });

  it('milestone body is clean with money saved', () => {
    assertClean(buildMilestoneBody(500));
  });

  it('milestone body is clean with zero money saved', () => {
    assertClean(buildMilestoneBody(0));
  });
});

describe('buildWeeklySummaryBody', () => {
  it('formats correctly', () => {
    expect(buildWeeklySummaryBody(5, 3, 142)).toBe(
      '5 check-ins. 3 urges beaten. $142 saved.'
    );
  });

  it('handles zeros', () => {
    expect(buildWeeklySummaryBody(0, 0, 0)).toBe(
      '0 check-ins. 0 urges beaten. $0 saved.'
    );
  });
});

describe('buildMilestoneTitle', () => {
  it('formats day count', () => {
    expect(buildMilestoneTitle(30)).toBe("30 days. That's real.");
  });
});

describe('buildMilestoneBody', () => {
  it('shows money when > 0', () => {
    expect(buildMilestoneBody(250)).toBe("You've saved $250 so far.");
  });

  it('shows fallback when money is 0', () => {
    expect(buildMilestoneBody(0)).toBe('Keep going.');
  });
});
