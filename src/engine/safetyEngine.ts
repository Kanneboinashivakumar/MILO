import type { VenueZone, Route, AccessibilityProfile, Facility } from '../types';
import { findRoute } from './routingEngine';

/** Safe route that never passes through the incident zone */
export function findSafeRoute(
  fromZoneId: string,
  incidentZoneId: string,
  zones: VenueZone[],
  accessibilityProfile: AccessibilityProfile,
  targetZoneId?: string,
  additionalBlockedZones: string[] = []
): Route | null {
  const blocked = [incidentZoneId, ...additionalBlockedZones];

  // If a specific target is requested, route directly to it while avoiding blocked zones
  if (targetZoneId) {
    if (blocked.includes(targetZoneId)) return null;
    return findRoute(fromZoneId, targetZoneId, zones, accessibilityProfile, blocked);
  }

  // Default: find nearest available exit zone
  const exitZone = zones.find(z =>
    z.facilities.some(f => f.type === 'exit') &&
    !blocked.includes(z.id)
  );

  if (!exitZone) return null;
  return findRoute(fromZoneId, exitZone.id, zones, accessibilityProfile, blocked);
}

/** Find the nearest facility of a given type from a starting zone, avoiding blocked hazards */
export function getNearestFacility(
  fromZoneId: string,
  facilityType: Facility['type'],
  zones: VenueZone[],
  accessibilityProfile: AccessibilityProfile = { wheelchairAccessible: false, avoidStairs: false, avoidCrowds: false },
  blockedZoneIds: string[] = []
): { facility: Facility; zoneId: string; walkMinutes: number } | null {
  const candidates: { facility: Facility; zoneId: string; walkMinutes: number }[] = [];

  for (const zone of zones) {
    if (blockedZoneIds.includes(zone.id) || zone.isBlocked) continue;
    const facility = zone.facilities.find(f => f.type === facilityType);
    if (!facility) continue;
    const route = findRoute(fromZoneId, zone.id, zones, accessibilityProfile, blockedZoneIds);
    if (route === null) continue;
    candidates.push({ facility, zoneId: zone.id, walkMinutes: route.walkMinutes });
  }

  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => a.walkMinutes - b.walkMinutes)[0]!;
}
