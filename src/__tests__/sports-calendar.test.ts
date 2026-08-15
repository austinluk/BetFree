import {
  isHighRiskDay,
  getHighRiskMessage,
  type SportEvent,
} from '../lib/sports-calendar';

function makeEvent(id: string): SportEvent {
  return {
    id,
    name: `Game ${id}`,
    sport: 'Football',
    date: new Date().toISOString(),
    league: 'NFL',
  };
}

describe('isHighRiskDay', () => {
  it('returns false for empty events', () => {
    expect(isHighRiskDay([])).toBe(false);
  });

  it('returns true when there is at least one event', () => {
    expect(isHighRiskDay([makeEvent('1')])).toBe(true);
  });
});

describe('getHighRiskMessage', () => {
  it('returns empty string for no events', () => {
    expect(getHighRiskMessage([])).toBe('');
  });

  it('names the single event', () => {
    const events = [makeEvent('nfl-sunday')];
    events[0].name = 'NFL Sunday Games';
    const msg = getHighRiskMessage(events);
    expect(msg).toContain('NFL Sunday Games');
    expect(msg).toContain("We're here if you need support.");
  });

  it('shows count for multiple events', () => {
    const events = [makeEvent('a'), makeEvent('b'), makeEvent('c')];
    const msg = getHighRiskMessage(events);
    expect(msg).toContain('3 major games');
    expect(msg).toContain('Stay strong');
  });

  it('message contains no banned gambling words', () => {
    const banned = ['bet', 'betting', 'gambling', 'wager', 'odds', 'casino'];
    const events = [makeEvent('a'), makeEvent('b')];
    const msg = getHighRiskMessage(events).toLowerCase();
    banned.forEach((word) => {
      expect(msg).not.toMatch(new RegExp(`\\b${word}\\b`));
    });
  });
});
