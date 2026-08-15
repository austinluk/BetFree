const TIME_MAP: Record<string, string> = {
  morning: '08:00:00',
  afternoon: '13:00:00',
  evening: '18:00:00',
  night: '22:00:00',
};

function mapTimeOfDay(selection: string): string {
  return TIME_MAP[selection] ?? '12:00:00';
}

function buildAutopsyPayload(
  userId: string,
  relapseId: string,
  trigger: string,
  timeSelection: string,
  wasAlone: boolean,
  substanceInvolved: boolean,
  selfTalk: string
) {
  return {
    user_id: userId,
    relapse_id: relapseId,
    trigger,
    time_of_day: mapTimeOfDay(timeSelection),
    was_alone: wasAlone,
    substance_involved: substanceInvolved,
    self_talk: selfTalk && selfTalk.trim().length > 0 ? selfTalk.trim() : null,
  };
}

describe('mapTimeOfDay', () => {
  it('morning → 08:00:00', () => expect(mapTimeOfDay('morning')).toBe('08:00:00'));
  it('afternoon → 13:00:00', () => expect(mapTimeOfDay('afternoon')).toBe('13:00:00'));
  it('evening → 18:00:00', () => expect(mapTimeOfDay('evening')).toBe('18:00:00'));
  it('night → 22:00:00', () => expect(mapTimeOfDay('night')).toBe('22:00:00'));
  it('unknown → 12:00:00 fallback', () => expect(mapTimeOfDay('unknown')).toBe('12:00:00'));
  it('empty string → 12:00:00 fallback', () => expect(mapTimeOfDay('')).toBe('12:00:00'));
});

describe('buildAutopsyPayload', () => {
  const base = buildAutopsyPayload(
    'user-1', 'relapse-1', 'boredom', 'evening', true, false, 'Just this once'
  );

  it('has correct user_id', () => expect(base.user_id).toBe('user-1'));
  it('has correct relapse_id', () => expect(base.relapse_id).toBe('relapse-1'));
  it('has correct trigger', () => expect(base.trigger).toBe('boredom'));
  it('maps time correctly', () => expect(base.time_of_day).toBe('18:00:00'));
  it('was_alone is boolean true', () => expect(base.was_alone).toBe(true));
  it('substance_involved is boolean false', () => expect(base.substance_involved).toBe(false));
  it('self_talk trimmed', () => expect(base.self_talk).toBe('Just this once'));

  it('empty selfTalk → null', () => {
    const p = buildAutopsyPayload('u','r','boredom','morning',false,false,'');
    expect(p.self_talk).toBeNull();
  });

  it('whitespace-only selfTalk → null', () => {
    const p = buildAutopsyPayload('u','r','boredom','morning',false,false,'   ');
    expect(p.self_talk).toBeNull();
  });

  it('selfTalk with leading/trailing spaces gets trimmed', () => {
    const p = buildAutopsyPayload('u','r','boredom','morning',false,false,'  hello  ');
    expect(p.self_talk).toBe('hello');
  });
});
