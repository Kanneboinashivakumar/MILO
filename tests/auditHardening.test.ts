import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEventStore } from '../src/store/useEventStore';
import { runScenario, generateResponsePlan } from '../src/engine/simulationEngine';
import { applyResponsePlan, computeHealth } from '../src/engine/healthEngine';
import { checkItineraryImpact, generateAdaptation, applyAdaptation } from '../src/engine/adaptationEngine';
import { findSafeRoute, getNearestFacility } from '../src/engine/safetyEngine';
import { findRoute } from '../src/engine/routingEngine';
import { parseAttendeeInput, generateItinerary } from '../src/engine/recommendationEngine';
import { SEED_ZONES, SEED_SESSIONS, SEED_SCENARIOS } from '../src/data/seed';

describe('Audit & Hardening � Full End-to-End & Engine Verification', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useEventStore());
    act(() => result.current.resetDemo());
  });

  it('Flow 1: Attendee NLP planning packs non-overlapping sessions within budget', () => {
    const parsed = parseAttendeeInput("I have 90 minutes and I'm interested in AI, startups and networking.");
    expect(parsed.availableMinutes).toBe(90);
    expect(parsed.interests).toContain('ai');
    expect(parsed.interests).toContain('startups');
    expect(parsed.interests).toContain('networking');

    const attendee = {
      ...SEED_ZONES[0],
      id: 'test-att',
      name: 'Alex',
      currentZoneId: 'registration',
      interests: parsed.interests,
      availableMinutes: parsed.availableMinutes,
      accessibilityProfile: { wheelchairAccessible: false, avoidStairs: false, avoidCrowds: false },
    };

    const itin = generateItinerary(attendee, SEED_SESSIONS, SEED_ZONES, 90);
    expect(itin.items.length).toBeGreaterThan(0);
    expect(itin.totalMinutes).toBe(90);

    for (const item of itin.items) {
      expect(item.reason.length).toBeGreaterThan(0);
      expect(item.walkMinutes).toBeGreaterThanOrEqual(0);
    }
  });

  it('Flow 2: Main Stage Overload triggers AdaptCard with CURRENT vs SUGGESTED', () => {
    const { result } = renderHook(() => useEventStore());

    // Generate itinerary with main-stage session
    act(() => {
      result.current.setItinerary({
        id: 'itin-flow-2',
        attendeeId: 'test-att',
        totalMinutes: 90,
        generatedAt: new Date().toISOString(),
        items: [{
          id: 'item-ms',
          sessionId: 'session-1',
          arrivalTime: '10:00',
          walkMinutes: 4,
          crowdAtArrival: 72,
          routeZoneIds: ['registration', 'central-corridor', 'main-stage'],
          reason: 'Keynote session',
        }],
      });
    });

    // Trigger Main Stage Overload
    act(() => { result.current.triggerMainStageOverload(); });

    // Store should have adaptationSuggestion
    const suggestion = result.current.adaptationSuggestion;
    expect(suggestion).not.toBeNull();
    expect(suggestion!.originalSessionId).toBe('session-1');
    expect(suggestion!.suggestedSessionId).not.toBe('session-1');
    expect(suggestion!.beforeCrowd).toBeGreaterThanOrEqual(90);
    expect(suggestion!.afterCrowd).toBeLessThan(suggestion!.beforeCrowd);
    expect(suggestion!.benefits.length).toBeGreaterThan(0);

    // Apply adaptation
    act(() => {
      const updated = applyAdaptation(
        result.current.itinerary!,
        suggestion!,
        result.current.sessions,
        result.current.zones,
        result.current.attendee
      );
      result.current.setItinerary(updated);
      result.current.setAdaptationSuggestion(null);
    });

    expect(result.current.itinerary!.items[0]!.sessionId).toBe(suggestion!.suggestedSessionId);
    expect(result.current.adaptationSuggestion).toBeNull();
  });

  it('Flow 3: Session cancellation produces an explanatory cancellation adaptation', () => {
    const { result } = renderHook(() => useEventStore());

    act(() => {
      result.current.setItinerary({
        id: 'itin-cancel',
        attendeeId: 'test-att',
        totalMinutes: 90,
        generatedAt: new Date().toISOString(),
        items: [{
          id: 'item-c1',
          sessionId: 'session-1',
          arrivalTime: '10:00',
          walkMinutes: 4,
          crowdAtArrival: 72,
          routeZoneIds: ['registration', 'main-stage'],
          reason: 'Keynote session',
        }],
      });
    });

    act(() => { result.current.triggerCancelSession(); });

    const suggestion = result.current.adaptationSuggestion;
    expect(suggestion).not.toBeNull();
    expect(suggestion!.triggerReason).toContain('cancelled');
    expect(suggestion!.originalSessionId).toBe('session-1');
  });

  it('Flow 4: Emergency incident blocks corridor, safe route detours around it, resolution unblocks', () => {
    const { result } = renderHook(() => useEventStore());

    // Normal route from registration to food-court uses central-corridor (4 + 3 = 7 min)
    const normalRoute = findRoute('main-stage', 'food-court', result.current.zones, result.current.attendee.accessibilityProfile);
    expect(normalRoute).not.toBeNull();
    expect(normalRoute!.zoneIds).toContain('central-corridor');

    // Trigger Emergency in central-corridor
    act(() => { result.current.triggerEmergency(); });

    const activeInc = result.current.incidents.find(i => i.active);
    expect(activeInc).toBeDefined();
    expect(activeInc!.zoneId).toBe('central-corridor');

    // Safe route must avoid central-corridor
    const safeDetour = findSafeRoute(
      'main-stage',
      'central-corridor',
      result.current.zones,
      result.current.attendee.accessibilityProfile,
      'food-court'
    );
    expect(safeDetour).not.toBeNull();
    expect(safeDetour!.zoneIds).not.toContain('central-corridor');

    // Resolve incident: zone should unblock and health should recover
    const healthBeforeResolve = result.current.eventState.health;
    act(() => { result.current.resolveIncident(activeInc!.id); });

    const resolvedZone = result.current.zones.find(z => z.id === 'central-corridor');
    expect(resolvedZone!.isBlocked).toBe(false);
    expect(result.current.eventState.health).toBeGreaterThan(healthBeforeResolve);
  });

  it('Flow 5: All 4 Event Twin scenarios simulate with cascades and generate response plans', () => {
    for (const scenario of SEED_SCENARIOS) {
      const simResult = runScenario(scenario, SEED_ZONES, SEED_SESSIONS);
      expect(simResult.scenarioId).toBe(scenario.id);
      expect(simResult.impactSummary.length).toBeGreaterThan(0);
      expect(simResult.zoneResults.length).toBeGreaterThan(0);

      const plan = generateResponsePlan(simResult, SEED_ZONES);
      expect(plan.scenarioId).toBe(scenario.id);
      expect(plan.actions.length).toBeGreaterThan(0);
    }
  });

  it('Flow 6: Safety facility lookups respect blocked hazard zones', () => {
    const profile = { wheelchairAccessible: false, avoidStairs: false, avoidCrowds: false };
    // Nearest first-aid when central-corridor is blocked
    const facilityWithHazard = getNearestFacility('registration', 'firstAid', SEED_ZONES, profile, ['central-corridor']);
    if (facilityWithHazard) {
      // Any route found must not pass through central-corridor
      const route = findRoute('registration', facilityWithHazard.zoneId, SEED_ZONES, profile, ['central-corridor']);
      if (route) {
        expect(route.zoneIds).not.toContain('central-corridor');
      }
    }
  });
});
