import type { Itinerary, ItineraryItem, CrowdState, Session, VenueZone, Attendee, AdaptationSuggestion } from '../types';
import { getStatus } from './crowdEngine';
import { scoreSession } from './recommendationEngine';
import { findRoute } from './routingEngine';
import { getUtilizationPct } from './crowdEngine';

/** Returns which itinerary items are impacted by current crowd conditions or cancellations */
export function checkItineraryImpact(
  itinerary: Itinerary,
  crowdStates: CrowdState[],
  sessions?: Session[]
): { affected: boolean; affectedItemIds: string[] } {
  const crowdMap = new Map(crowdStates.map(cs => [cs.zoneId, cs]));
  const sessionMap = sessions ? new Map(sessions.map(s => [s.id, s])) : null;
  const affectedItemIds: string[] = [];

  for (const item of itinerary.items) {
    // Check if session was cancelled
    if (sessionMap && sessionMap.get(item.sessionId)?.isCancelled) {
      affectedItemIds.push(item.id);
      continue;
    }

    // Check if any zone in the route is critical
    const routeCritical = item.routeZoneIds.some(zId => {
      const cs = crowdMap.get(zId);
      return cs && getStatus(cs.utilizationPct) === 'critical';
    });
    if (routeCritical) {
      affectedItemIds.push(item.id);
    }
  }

  return { affected: affectedItemIds.length > 0, affectedItemIds };
}

/** For affected items, find the best alternative session */
export function generateAdaptation(
  itinerary: Itinerary,
  affectedItemIds: string[],
  sessions: Session[],
  zones: VenueZone[],
  attendee: Attendee
): AdaptationSuggestion | null {
  const affectedItem = itinerary.items.find(i => affectedItemIds.includes(i.id));
  if (!affectedItem) return null;

  const originalSession = sessions.find(s => s.id === affectedItem.sessionId);
  if (!originalSession) return null;

  const originalZone = zones.find(z => z.id === originalSession.zoneId);
  const beforeCrowd  = originalZone ? getUtilizationPct(originalZone) : affectedItem.crowdAtArrival;
  const beforeWalk   = affectedItem.walkMinutes;

  // Find best alternative: different session, not cancelled, shares at least one tag, not the same zone
  const alternatives = sessions
    .filter(s =>
      s.id !== originalSession.id &&
      !s.isCancelled &&
      s.tags.some(t => originalSession.tags.includes(t) || attendee.interests.includes(t))
    )
    .map(s => {
      const { score, walkMinutes, reason } = scoreSession(s, attendee, zones, 0, attendee.availableMinutes * 60);
      const zone = zones.find(z => z.id === s.zoneId);
      const pct  = zone ? getUtilizationPct(zone) : 50;
      return { session: s, score, walkMinutes, pct, reason };
    })
    .filter(a => getStatus(a.pct) !== 'critical') // don't suggest another critical zone
    .sort((a, b) => b.score - a.score);

  const best = alternatives[0];
  if (!best) return null;

  const route = findRoute(attendee.currentZoneId, best.session.zoneId, zones, attendee.accessibilityProfile);
  const afterWalk  = route?.walkMinutes ?? best.walkMinutes;
  const afterCrowd = best.pct;

  const benefits: string[] = [];
  if (afterCrowd < beforeCrowd) benefits.push(`${beforeCrowd - afterCrowd}% less crowded`);
  if (afterWalk  < beforeWalk)  benefits.push(`${beforeWalk - afterWalk} min shorter walk`);
  if (best.session.tags.some(t => attendee.interests.includes(t))) {
    benefits.push('Matches your interests');
  }
  if (route?.isAccessible) benefits.push('Step-free route available');

  const criticalZoneName = originalZone?.name ?? 'That area';
  const triggerReason = originalSession.isCancelled
    ? `"${originalSession.title}" has been cancelled by event organizers.`
    : `${criticalZoneName} has reached critical crowd levels (${beforeCrowd}%).`;

  return {
    affectedItemId:     affectedItem.id,
    originalSessionId:  originalSession.id,
    suggestedSessionId: best.session.id,
    triggerReason,
    beforeCrowd,
    afterCrowd,
    beforeWalkMinutes:  beforeWalk,
    afterWalkMinutes:   afterWalk,
    benefits,
  };
}

/** Returns a NEW itinerary with the adapted item · does not mutate */
export function applyAdaptation(
  itinerary: Itinerary,
  suggestion: AdaptationSuggestion,
  sessions: Session[],
  zones: VenueZone[],
  attendee: Attendee
): Itinerary {
  const newSession = sessions.find(s => s.id === suggestion.suggestedSessionId);
  if (!newSession) return itinerary;

  const route = findRoute(attendee.currentZoneId, newSession.zoneId, zones, attendee.accessibilityProfile);
  const zone  = zones.find(z => z.id === newSession.zoneId);
  const pct   = zone ? getUtilizationPct(zone) : suggestion.afterCrowd;

  const newItem: ItineraryItem = {
    id:             suggestion.affectedItemId,
    sessionId:      newSession.id,
    arrivalTime:    itinerary.items.find(i => i.id === suggestion.affectedItemId)?.arrivalTime ?? newSession.startTime,
    walkMinutes:    suggestion.afterWalkMinutes,
    crowdAtArrival: pct,
    routeZoneIds:   route?.zoneIds ?? [attendee.currentZoneId, newSession.zoneId],
    reason:         `Adapted: ${suggestion.benefits.join(', ')}`,
  };

  return {
    ...itinerary,
    items: itinerary.items.map(item =>
      item.id === suggestion.affectedItemId ? newItem : item
    ),
  };
}
