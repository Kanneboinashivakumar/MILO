import { describe, it, expect } from 'vitest';
import { findSafeRoute, getNearestFacility } from '../src/engine/safetyEngine';
import { SEED_ZONES } from '../src/data/seed';
import type { AccessibilityProfile } from '../src/types';

const noProfile: AccessibilityProfile = { wheelchairAccessible: false, avoidStairs: false, avoidCrowds: false };
const stairsFree: AccessibilityProfile = { wheelchairAccessible: false, avoidStairs: true, avoidCrowds: false };

describe('safetyEngine — findSafeRoute', () => {
  it('never includes the incident zone in the safe route', () => {
    const route = findSafeRoute('registration', 'central-corridor', SEED_ZONES, noProfile);
    if (route) expect(route.zoneIds).not.toContain('central-corridor');
  });

  it('respects accessibility profile same as routingEngine', () => {
    const route = findSafeRoute('registration', 'central-corridor', SEED_ZONES, stairsFree);
    // All zones in result path should be stair-free
    if (route) {
      const hasStairs = route.zoneIds.some(id => {
        const z = SEED_ZONES.find(z => z.id === id);
        return z && z.hasStairs && !z.hasAccessibleRoute;
      });
      expect(hasStairs).toBe(false);
    }
  });
});

describe('safetyEngine — getNearestFacility', () => {
  it('finds nearest first-aid from registration', () => {
    const result = getNearestFacility('registration', 'firstAid', SEED_ZONES, noProfile);
    expect(result).not.toBeNull();
    expect(result!.facility.type).toBe('firstAid');
    expect(result!.walkMinutes).toBeGreaterThan(0);
  });

  it('returns null for a facility type that does not exist', () => {
    const result = getNearestFacility('registration', 'registration' as never, SEED_ZONES.map(z => ({ ...z, facilities: [] })), noProfile);
    expect(result).toBeNull();
  });
});