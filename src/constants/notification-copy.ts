// All user-visible notification strings in one place.
// App Store guideline: never use "bet", "gambling", "wager", "odds", or "casino"
// in push notification copy — it can trigger addiction-related content flags.

export const NOTIFICATION_COPY = {
  streakReminder: {
    title: "Quick check-in?",
    body: "30 seconds to log today.",
  },
  streakAtRisk: {
    title: "Your streak is safe —",
    body: "but only if you check in today.",
  },
  weeklySummary: {
    title: "Your week in review",
    // body is dynamic — see buildWeeklySummaryBody()
  },
} as const;

export const MOTIVATIONAL_PUSH_QUOTES: readonly string[] = [
  "Quick check-in? 30 seconds is all it takes.",
  "How are you doing today? Log it before the day ends.",
  "Still with you. Check in when you are ready.",
  "One check-in. That is today's job.",
  "You showed up yesterday. Show up today.",
  "Every day you log is a vote for who you are becoming.",
  "Small actions, repeated. That is how this works.",
  "You could have ignored this. You did not.",
  "Today counts. Every day counts.",
  "Keep going. You are building something real.",
];

export const RE_ENGAGEMENT_PUSH_QUOTES: readonly string[] = [
  "Still here. No pressure. Just checking in.",
  "Whenever you are ready. We will be here.",
  "No judgment. Just here when you need it.",
  "Come back whenever feels right. We saved your progress.",
  "Missing you. No rush. We are here.",
];

export function buildMilestoneBody(moneySaved: number): string {
  return moneySaved > 0 ? `You've saved $${moneySaved} so far.` : "Keep going.";
}

export function buildMilestoneTitle(days: number): string {
  return `${days} days. That's real.`;
}

export function buildWeeklySummaryBody(
  checkins: number,
  urgesResisted: number,
  moneySaved: number
): string {
  return `${checkins} check-ins. ${urgesResisted} urges beaten. $${moneySaved} saved.`;
}
