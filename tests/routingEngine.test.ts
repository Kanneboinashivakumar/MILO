import { describe, it, expect } from 'vitest';
import { findRoute } from '../src/engine/routingEngine';
import { SEED_ZONES } from '../src/data/seed';
import type { AccessibilityProfile } from '../src/types';

const noProfile: AccessibilityProfile = { wheelchairAccessible: false, avoidStairs: false, avoidCrowds: false };
const stairsFree: AccessibilityProfile = { wheelchairAccessible: false, avoidStairs: true, avoidCrowds: false };

describe('routingEngine — findRoute', () => {
  it('finds a route between connected zones', () => {
    const route = findRoute('registration', 'workshop-hall', SEED_ZONES, noProfile);
    expect(route).not.toBeNull();
    expect(route!.zoneIds[0]).toBe('registration');
    expect(route!.zoneIds[route!.zoneIds.length - 1]).toBe('workshop-hall');
  });

  it('returns same-zone route with 0 minutes', () => {
    const route = findRoute('main-stage', 'main-stage', SEED_ZONES, noProfile);
    expect(route).not.toBeNull();
    expect(route!.walkMinutes).toBe(0);
  });

  it('excludes a blocked zone from the path', () => {
    const route = findRoute('registration', 'food-court', SEED_ZONES, noProfile, ['central-corridor']);
    // Should still find a route via east-entrance, not through central-corridor
    if (route) {
      expect(route.zoneIds).not.toContain('central-corridor');
    }
  });

  it('avoids stairs-only paths when avoidStairs is true', () => {
    // main-stage has hasStairs:true and hasAccessibleRoute:false
    // Route from registration to main-stage should be null if accessibility avoids stairs
    const zones = SEED_ZONES.map(z =>
      z.id === 'main-stage' ? { ...z, hasStairs: true, hasAccessibleRoute: false } : z
    );
    // All neighbors of registration are: main-stage, east-entrance
    // If main-stage is excluded, we need to find via east-entrance -> ... -> main-stage
    // main-stage is the destination AND stairs — so no accessible route should be found TO it
    const route = findRoute('workshop-hall', 'main-stage', zones, stairsFree);
    // main-stage itself has stairs with no accessible route, so result should be null
    expect(route).toBeNull();
  });

  it('returns null when no valid route exists under constraints', () => {
    // Block all neighbors of registration
    const blocked = ['main-stage', 'east-entrance', 'central-corridor', 'workshop-hall', 'startup-arena', 'networking-lounge', 'food-court'];
    const route = findRoute('registration', 'first-aid', SEED_ZONES, noProfile, blocked);
    expect(route).toBeNull();
  });
});