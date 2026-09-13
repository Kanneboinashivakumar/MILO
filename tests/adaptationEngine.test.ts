import { describe, it, expect } from 'vitest';
import { checkItineraryImpact, generateAdaptation, applyAdaptation } from '../src/engine/adaptationEngine';
import { SEED_ZONES, SEED_SESSIONS, SEED_ATTENDEE } from '../src/data/seed';
import { computeAllCrowdStates } from '../src/engine/crowdEngine';
import type { Itinerary, ItineraryItem, VenueZone } from '../src/types';

const makeItinerary = (sessionId: string, zoneId: string): Itinerary => ({
  id: 'test-itin', attendeeId: 'attendee-1', totalMinutes: 90, generatedAt: new Date().toISOString(),
  items: [{
    id: 'item-1', sessionId, arrivalTime: '10:00', walkMinutes: 3,
    crowdAtArrival: 72, routeZoneIds: ['registration', zoneId], reason: 'Test',
  } as ItineraryItem],
});

describe('adaptationEngine — checkItineraryImpact', () => {
  it('detects impact when zone becomes critical', () => {
    const criticalZones: VenueZone[] = SEED_ZONES.map(z =>
      z.id === 'main-stage' ? { ...z, currentCrowd: z.capacity } : z // 100%
    );
    const crowdStates = computeAllCrowdStates(criticalZones);
    const itin = makeItinerary('session-1', 'main-stage');
    itin.items[0]!.routeZoneIds = ['registration', 'central-corridor', 'main-stage'];
    const result = checkItineraryImpact(itin, crowdStates);
    expect(result.affected).toBe(true);
    expect(result.affectedItemIds).toContain('item-1');
  });

  it('does not trigger below critical', () => {
    const crowdStates = computeAllCrowdStates(SEED_ZONES); // normal data — main-stage at 72%
    const itin = makeItinerary('session-1', 'main-stage');
    const result = checkItineraryImpact(itin, crowdStates);
    expect(result.affected).toBe(false);
  });
});

describe('adaptationEngine — generateAdaptation', () => {
  it('suggests alternative that shares at least one tag with original', () => {
    const criticalZones: VenueZone[] = SEED_ZONES.map(z =>
      z.id === 'main-stage' ? { ...z, currentCrowd: z.capacity } : z
    );
    const crowdStates = computeAllCrowdStates(criticalZones);
    const itin = makeItinerary('session-1', 'main-stage'); // "Future of AI" — tags: ai, future, keynote
    itin.items[0]!.routeZoneIds = ['registration', 'main-stage'];

    const { affectedItemIds } = checkItineraryImpact(itin, crowdStates);
    const attendee = { ...SEED_ATTENDEE, interests: ['ai'] };
    const suggestion = generateAdaptation(itin, affectedItemIds, SEED_SESSIONS, criticalZones, attendee);

    expect(suggestion).not.toBeNull();
    const suggestedSession = SEED_SESSIONS.find(s => s.id === suggestion!.suggestedSessionId)!;
    const originalSession  = SEED_SESSIONS.find(s => s.id === 'session-1')!;
    const sharedTags = suggestedSession.tags.some(t => originalSession.tags.includes(t) || ['ai'].includes(t));
    expect(sharedTags).toBe(true);
  });
});

describe('adaptationEngine — applyAdaptation', () => {
  it('replaces the affected item in the itinerary', () => {
    const criticalZones: VenueZone[] = SEED_ZONES.map(z =>
      z.id === 'main-stage' ? { ...z, currentCrowd: z.capacity } : z
    );
    const crowdStates = computeAllCrowdStates(criticalZones);
    const itin = makeItinerary('session-1', 'main-stage');
    itin.items[0]!.routeZoneIds = ['registration', 'main-stage'];

    const { affectedItemIds } = checkItineraryImpact(itin, crowdStates);
    const attendee   = { ...SEED_ATTENDEE, interests: ['ai'] };
    const suggestion = generateAdaptation(itin, affectedItemIds, SEED_SESSIONS, criticalZones, attendee);
    expect(suggestion).not.toBeNull();

    const newItin = applyAdaptation(itin, suggestion!, SEED_SESSIONS, criticalZones, attendee);
    expect(newItin.items[0]!.sessionId).toBe(suggestion!.suggestedSessionId);
    expect(newItin.items[0]!.sessionId).not.toBe('session-1');
  });
});