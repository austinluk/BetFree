interface RawCheckin {
  date: string;
  urge_level: number;
  triggers: string[];
  created_at: string;
}

interface DangerWindowResult {
  day_of_week: number;
  time_block: string;
  avg_urge: number;
  occurrences: number;
  total_checkins: number;
}

function getTimeBlock(hour: number): string {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

function computeDangerWindow(checkins: RawCheckin[]): DangerWindowResult | null {
  if (!checkins || checkins.length < 14) return null;
  const slotMap: Record<string, { dow: number; block: string; sum: number; count: number }> = {};
  for (const c of checkins) {
    const dow = new Date(c.date + 'T12:00:00').getDay();
    const hour = new Date(c.created_at).getHours();
    const block = getTimeBlock(hour);
    const key = `${dow}_${block}`;
    if (!slotMap[key]) slotMap[key] = { dow, block, sum: 0, count: 0 };
    slotMap[key].sum += c.urge_level;
    slotMap[key].count += 1;
  }
  let best: { dow: number; block: string; sum: number; count: number } | null = null;
  for (const slot of Object.values(slotMap)) {
    const avg = slot.sum / slot.count;
    if (avg >= 6.0 && slot.count >= 3) {
      if (!best || avg > best.sum / best.count) best = slot;
    }
  }
  if (!best) return null;
  return {
    day_of_week: best.dow,
    time_block: best.block,
    avg_urge: parseFloat((best.sum / best.count).toFixed(1)),
    occurrences: best.count,
    total_checkins: checkins.length,
  };
}

// Helper: build N checkins on a specific day of week + hour with a given urge level
function makeCheckins(count: number, targetDow: number, hour: number, urgeLevel: number): RawCheckin[] {
  const results: RawCheckin[] = [];
  // 2024-01-07 is a Sunday (dow=0), 2024-01-01 is a Monday (dow=1), etc.
  // Find a date that matches the target dow
  const baseDate = new Date('2024-01-07T12:00:00'); // Sunday
  let offset = 0;
  while (results.length < count) {
    const d = new Date(baseDate.getTime() + offset * 7 * 24 * 60 * 60 * 1000); // same dow each week
    const dateStr = d.toISOString().split('T')[0];
    const createdAt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, 0, 0).toISOString();
    results.push({ date: dateStr, urge_level: urgeLevel, triggers: [], created_at: createdAt });
    offset++;
  }
  return results;
}

// Fill remaining spots to reach 14 total with low urge on a different dow
function padTo14(existing: RawCheckin[], urge = 2): RawCheckin[] {
  const needed = Math.max(0, 14 - existing.length);
  const filler: RawCheckin[] = [];
  for (let i = 0; i < needed; i++) {
    // Use Wednesday (dow=3) to avoid collisions with Sunday tests
    const d = new Date(`2024-01-${String(10 + i).padStart(2,'0')}T12:00:00`);
    filler.push({
      date: d.toISOString().split('T')[0],
      urge_level: urge,
      triggers: [],
      created_at: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 10, 0, 0).toISOString(),
    });
  }
  return [...existing, ...filler];
}

describe('getTimeBlock', () => {
  it('hour 0 = night', () => expect(getTimeBlock(0)).toBe('night'));
  it('hour 4 = night', () => expect(getTimeBlock(4)).toBe('night'));
  it('hour 5 = morning', () => expect(getTimeBlock(5)).toBe('morning'));
  it('hour 11 = morning', () => expect(getTimeBlock(11)).toBe('morning'));
  it('hour 12 = afternoon', () => expect(getTimeBlock(12)).toBe('afternoon'));
  it('hour 16 = afternoon', () => expect(getTimeBlock(16)).toBe('afternoon'));
  it('hour 17 = evening', () => expect(getTimeBlock(17)).toBe('evening'));
  it('hour 21 = evening', () => expect(getTimeBlock(21)).toBe('evening'));
  it('hour 22 = night', () => expect(getTimeBlock(22)).toBe('night'));
  it('hour 23 = night', () => expect(getTimeBlock(23)).toBe('night'));
});

describe('computeDangerWindow', () => {
  it('returns null for empty array', () => expect(computeDangerWindow([])).toBeNull());
  it('returns null for 13 check-ins (< 14)', () => {
    const items = makeCheckins(13, 0, 19, 8);
    expect(computeDangerWindow(items)).toBeNull();
  });
  it('detects Sunday evening with avg urge 8', () => {
    const highRisk = makeCheckins(5, 0, 19, 8); // Sunday, 7pm = evening
    const all = padTo14(highRisk);
    const result = computeDangerWindow(all);
    expect(result).not.toBeNull();
    expect(result!.day_of_week).toBe(0);
    expect(result!.time_block).toBe('evening');
    expect(result!.avg_urge).toBe(8);
  });
  it('returns null when avg urge < 6', () => {
    const lowRisk = makeCheckins(5, 0, 19, 5);
    const all = padTo14(lowRisk);
    expect(computeDangerWindow(all)).toBeNull();
  });
  it('returns null when slot count < 3 even with high urge', () => {
    const twoHigh = makeCheckins(2, 0, 19, 9);
    const all = padTo14(twoHigh);
    expect(computeDangerWindow(all)).toBeNull();
  });
  it('picks highest avg when multiple slots qualify', () => {
    const slot1 = makeCheckins(3, 0, 19, 7);  // Sunday evening, avg 7
    const slot2 = makeCheckins(3, 1, 19, 9);  // Monday evening, avg 9
    const all = padTo14([...slot1, ...slot2]);
    const result = computeDangerWindow(all);
    expect(result).not.toBeNull();
    expect(result!.avg_urge).toBe(9);
  });
  it('total_checkins equals input length', () => {
    const high = makeCheckins(4, 0, 19, 8);
    const all = padTo14(high);
    const result = computeDangerWindow(all);
    expect(result!.total_checkins).toBe(all.length);
  });
});
