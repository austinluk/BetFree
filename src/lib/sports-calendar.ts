
export interface SportEvent {
  id: string;
  name: string;
  sport: string;
  date: string; // ISO datetime
  league: string;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory cache — good enough for a session; Supabase is the source of truth
let _cachedEvents: SportEvent[] | null = null;
let _cachedAt = 0;

function readCache(): SportEvent[] | null {
  if (!_cachedEvents || Date.now() - _cachedAt > CACHE_TTL_MS) return null;
  return _cachedEvents;
}

function writeCache(events: SportEvent[]) {
  _cachedEvents = events;
  _cachedAt = Date.now();
}

// Major sports leagues to watch for
const LEAGUES = ['NFL', 'NBA', 'UFC', 'MLB', 'NHL', 'EPL', 'Champions League'];

export async function fetchUpcomingEvents(): Promise<SportEvent[]> {
  // Try cache first
  const cached = readCache();
  if (cached) return cached;

  const apiKey = process.env.EXPO_PUBLIC_SPORTS_API_KEY;
  if (!apiKey || apiKey === 'placeholder') {
    // Return synthetic high-risk events based on day of week
    return getSyntheticEvents();
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/${apiKey}/eventsday.php?d=${today}`
    );
    if (!res.ok) return getSyntheticEvents();
    const data = await res.json();
    const events: SportEvent[] = (data.events ?? [])
      .filter((e: any) => LEAGUES.some((l) => e.strLeague?.includes(l)))
      .slice(0, 10)
      .map((e: any) => ({
        id: e.idEvent,
        name: e.strEvent,
        sport: e.strSport,
        date: e.dateEvent + 'T' + (e.strTime ?? '18:00:00'),
        league: e.strLeague,
      }));

    writeCache(events);
    return events;
  } catch {
    return getSyntheticEvents();
  }
}

// Returns synthetic events on high-risk days (Sunday NFL, Saturday CFB, etc.)
function getSyntheticEvents(): SportEvent[] {
  const day = new Date().getDay(); // 0=Sun, 1=Mon...6=Sat
  const events: SportEvent[] = [];

  if (day === 0) {
    events.push({ id: 'nfl-sunday', name: 'NFL Sunday Games', sport: 'American Football', date: new Date().toISOString(), league: 'NFL' });
  }
  if (day === 1) {
    events.push({ id: 'mnf', name: 'Monday Night Football', sport: 'American Football', date: new Date().toISOString(), league: 'NFL' });
  }
  if (day === 4) {
    events.push({ id: 'nba-thursday', name: 'NBA Thursday Night', sport: 'Basketball', date: new Date().toISOString(), league: 'NBA' });
  }
  if (day === 6) {
    events.push({ id: 'saturday-games', name: 'College Football Saturday', sport: 'American Football', date: new Date().toISOString(), league: 'CFB' });
  }

  return events;
}

export function isHighRiskDay(events: SportEvent[]): boolean {
  return events.length > 0;
}

export function getHighRiskMessage(events: SportEvent[]): string {
  if (events.length === 0) return '';
  if (events.length === 1) return `${events[0].name} is today. We're here if you need support.`;
  return `${events.length} major games today. Stay strong — we're here.`;
}
