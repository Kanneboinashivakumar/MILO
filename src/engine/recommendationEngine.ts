import type { Attendee, Session, VenueZone, Itinerary, ItineraryItem, Recommendation, AccessibilityProfile } from '../types';
import { findRoute } from './routingEngine';
import { getUtilizationPct, getStatus } from './crowdEngine';

// ─── Score weights ────────────────────────────────────────────────────────────
const WEIGHT_INTEREST    = 4.0;
const WEIGHT_TIME_FIT    = 2.0;
const WEIGHT_PROXIMITY   = 1.5;
const WEIGHT_CROWD       = 1.5;
const WEIGHT_ACCESSIBILITY = 2.0;
const WEIGHT_POPULARITY  = 0.5;

// ─── Tag vocabulary for keyword fallback ─────────────────────────────────────
const TAG_VOCAB = [
  'ai', 'startups', 'networking', 'product', 'workshop', 'keynote', 'demo',
  'agents', 'ethics', 'developers', 'founders', 'funding', 'future',
  'hackathon', 'mentors', 'judging', 'food', 'hardware', 'milestone', 'social',
  'coding', 'web3', 'pitch'
];

/** Parse free-text input into interests + time budget (no network calls) */
export function parseAttendeeInput(input: string): { interests: string[]; availableMinutes: number } {
  const lower = input.toLowerCase();

  // Extract time: "90 minutes", "1 hour", "2 hours", "1.5 hours"
  let availableMinutes = 90; // default
  const hourMatch  = lower.match(/(\d+(?:\.\d+)?)\s*hours?/);
  const minMatch   = lower.match(/(\d+)\s*min(?:utes?)?/);
  if (hourMatch?.[1])  availableMinutes = Math.round(parseFloat(hourMatch[1]) * 60);
  else if (minMatch?.[1]) availableMinutes = parseInt(minMatch[1], 10);

  // Extract interests from tag vocabulary
  const interests = TAG_VOCAB.filter(tag => lower.includes(tag));

  // Also check compound terms
  if (lower.includes('start up') && !interests.includes('startups')) interests.push('startups');
  if (lower.includes('machine learning') && !interests.includes('ai'))    interests.push('ai');
  if (lower.includes('developer') && !interests.includes('developers'))   interests.push('developers');
  if (lower.includes('mentor') && !interests.includes('mentors'))         interests.push('mentors');
  if (lower.includes('judge') && !interests.includes('judging'))          interests.push('judging');
  if (lower.includes('pizza') || lower.includes('snack') || lower.includes('dinner')) {
    if (!interests.includes('food')) interests.push('food');
  }
  if (lower.includes('hack') && !interests.includes('hackathon'))         interests.push('hackathon');

  return { interests: interests.length > 0 ? interests : ['ai'], availableMinutes };
}

function interestMatchScore(attendeeInterests: string[], sessionTags: string[]): number {
  if (attendeeInterests.length === 0) return 0;
  const matches = sessionTags.filter(t => attendeeInterests.includes(t)).length;
  return Math.min(1, matches / Math.max(1, attendeeInterests.length));
}

function timeFitScore(session: Session, startMinutes: number, budgetEnd: number): number {
  const sessionDurationMins = timeToMinutes(session.endTime) - timeToMinutes(session.startTime);
  const sessionEnd = startMinutes + sessionDurationMins;
  if (sessionEnd <= budgetEnd) return 1;
  if (startMinutes < budgetEnd) return 0.3; // partial credit
  return 0;
}

function proximityScore(walkMinutes: number): number {
  // 0 min → 1.0, 10 min → 0.0
  return Math.max(0, 1 - walkMinutes / 10);
}

function crowdScore(utilizationPct: number): number {
  return 1 - utilizationPct / 100;
}

function accessibilityScore(session: Session, zones: VenueZone[], fromZoneId: string, profile: AccessibilityProfile): number {
  if (!profile.wheelchairAccessible && !profile.avoidStairs) return 1; // no constraint
  const route = findRoute(fromZoneId, session.zoneId, zones, profile);
  return route !== null ? 1 : 0; // hard constraint: 0 if route violates profile
}

export function scoreSession(
  session: Session,
  attendee: Attendee,
  zones: VenueZone[],
  startMinutes: number,
  budgetEndMinutes: number
): { score: number; walkMinutes: number; reason: string } {
  if (session.isCancelled) return { score: -1, walkMinutes: 0, reason: 'Cancelled' };

  const route = findRoute(attendee.currentZoneId, session.zoneId, zones, attendee.accessibilityProfile);
  const walkMins = route?.walkMinutes ?? 10;
  const zone = zones.find(z => z.id === session.zoneId);
  const pct  = zone ? getUtilizationPct(zone) : 50;

  const interest     = interestMatchScore(attendee.interests, session.tags);
  const timeFit      = timeFitScore(session, startMinutes + walkMins, budgetEndMinutes);
  const proximity    = proximityScore(walkMins);
  const crowd        = crowdScore(pct);
  const accessibility = accessibilityScore(session, zones, attendee.currentZoneId, attendee.accessibilityProfile);
  const popularity   = session.popularity;

  if (accessibility === 0) return { score: -1, walkMinutes: walkMins, reason: 'No accessible route' };

  const score =
    interest    * WEIGHT_INTEREST +
    timeFit     * WEIGHT_TIME_FIT +
    proximity   * WEIGHT_PROXIMITY +
    crowd       * WEIGHT_CROWD +
    accessibility * WEIGHT_ACCESSIBILITY +
    popularity  * WEIGHT_POPULARITY;

  // Build plain-language reason
  const parts: string[] = [];
  if (interest > 0.5) parts.push(`Matches your ${session.tags.filter(t => attendee.interests.includes(t)).join(', ')} interest`);
  const status = getStatus(pct);
  if (status === 'low')      parts.push('low crowd');
  else if (status === 'moderate') parts.push('moderate crowd');
  parts.push(`${walkMins} min walk`);

  return { score, walkMinutes: walkMins, reason: parts.join(', ') };
}

/** Greedy time-budget packing — returns best non-overlapping sessions */

interface ScoredRecommendation extends Recommendation {
  walkMinutes: number;
}

export function generateItinerary(
  attendee: Attendee,
  sessions: Session[],
  zones: VenueZone[],
  timeBudgetMinutes?: number
): Itinerary {
  const budget = timeBudgetMinutes ?? attendee.availableMinutes;
  const BASE_START = '10:00'; // demo event start
  const startMins  = timeToMinutes(BASE_START);
  const endMins    = startMins + budget;

  // Score all sessions
  const scored: ScoredRecommendation[] = sessions
    .filter(s => !s.isCancelled)
    .map(s => {
      const { score, walkMinutes, reason } = scoreSession(s, attendee, zones, startMins, endMins);
      return { sessionId: s.id, score, reason, walkMinutes } as Recommendation & { walkMinutes: number };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score) as ScoredRecommendation[];

  // Greedy pack by time — no overlaps
  const items: ItineraryItem[] = [];
  let cursor = startMins; // current time pointer in minutes

  for (const rec of scored) {
    if (cursor >= endMins) break;
    const session = sessions.find(s => s.id === rec.sessionId);
    if (!session) continue;

    const route = findRoute(attendee.currentZoneId, session.zoneId, zones, attendee.accessibilityProfile);
    const walkMins = route?.walkMinutes ?? rec.walkMinutes;
    const arrivalMins = cursor + walkMins;
    const sessionStart = timeToMinutes(session.startTime);
    const sessionEnd   = timeToMinutes(session.endTime);

    // Skip if we can't make it
    if (arrivalMins > sessionEnd) continue;
    // Skip if already past budget
    if (Math.max(arrivalMins, sessionStart) + (sessionEnd - sessionStart) > endMins + 5) continue;

    // Check no overlap with already-added items
    const actualStart = Math.max(arrivalMins, sessionStart);
    const overlaps = items.some(item => {
      const itemSess = sessions.find(s => s.id === item.sessionId);
      if (!itemSess) return false;
      const is = timeToMinutes(itemSess.startTime);
      const ie = timeToMinutes(itemSess.endTime);
      return actualStart < ie && sessionEnd > is;
    });
    if (overlaps) continue;

    const zone = zones.find(z => z.id === session.zoneId);
    const pct  = zone ? getUtilizationPct(zone) : 50;

    items.push({
      id:             `item-${rec.sessionId}`,
      sessionId:      session.id,
      arrivalTime:    minutesToTime(actualStart),
      walkMinutes:    walkMins,
      crowdAtArrival: pct,
      routeZoneIds:   route?.zoneIds ?? [attendee.currentZoneId, session.zoneId],
      reason:         rec.reason,
    });

    cursor = sessionEnd; // next session starts after this one
  }

  return {
    id:            `itin-${Date.now()}`,
    attendeeId:    attendee.id,
    items,
    totalMinutes:  budget,
    generatedAt:   new Date().toISOString(),
  };
}

// ─── Time utilities ───────────────────────────────────────────────────────────
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function minutesToTime(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}