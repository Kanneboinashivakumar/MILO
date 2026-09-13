import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEventStore } from '../src/store/useEventStore';
import { runScenario, generateResponsePlan } from '../src/engine/simulationEngine';
import { applyResponsePlan } from '../src/engine/healthEngine';
import { checkItineraryImpact } from '../src/engine/adaptationEngine';
import { computeAllCrowdStates } from '../src/engine/crowdEngine';
import { SEED_ZONES, SEED_SESSIONS, SEED_SCENARIOS } from '../src/data/seed';

describe('Integration — Apply Response Plan raises Event Health', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useEventStore());
    act(() => result.current.resetDemo());
  });

  it('event health increases after applying Main Stage Overload response plan', () => {
    const { result } = renderHook(() => useEventStore());

    // 1. Trigger Main Stage Overload
    act(() => { result.current.updateZoneCrowd('main-stage', 100); });
    const healthAfterOverload = result.current.eventState.health;

    // 2. Run simulation + generate plan
    const scenario = SEED_SCENARIOS.find(s => s.id === 'scenario-overload')!;
    const simResult = runScenario(scenario, result.current.zones, SEED_SESSIONS);
    const plan = generateResponsePlan(simResult, result.current.zones);

    // Add direct redirect action for main-stage
    plan.actions.push({ id: 'x1', label: 'Redirect attendees away from Main Stage', targetZoneId: 'main-stage', status: 'pending' });
    plan.actions.push({ id: 'x2', label: 'Deploy staff to Main Stage', targetZoneId: 'main-stage', status: 'pending' });

    // 3. Apply response
    const { zones: updatedZones, healthAfter } = applyResponsePlan(result.current.zones, plan);
    expect(healthAfter).toBeGreaterThan(healthAfterOverload);
    act(() => { result.current.applyResponsePlanToStore(updatedZones); });

    const healthFinal = result.current.eventState.health;
    expect(healthFinal).toBeGreaterThan(healthAfterOverload);
  });

  it('clicking Adapt My Plan updates the itinerary in the store', () => {
    const { result } = renderHook(() => useEventStore());

    // Set up itinerary with main-stage session
    act(() => {
      result.current.setItinerary({
        id: 'test-itin', attendeeId: 'attendee-1', totalMinutes: 90,
        generatedAt: new Date().toISOString(),
        items: [{
          id: 'item-1', sessionId: 'session-1', arrivalTime: '10:00',
          walkMinutes: 3, crowdAtArrival: 72,
          routeZoneIds: ['registration', 'central-corridor', 'main-stage'],
          reason: 'Test reason',
        }],
      });
    });

    // Trigger overload — main-stage goes critical
    act(() => { result.current.updateZoneCrowd('main-stage', 100); });

    const crowdStates = computeAllCrowdStates(result.current.zones);
    const itinerary   = result.current.itinerary!;

    // Check impact
    const { affected, affectedItemIds } = checkItineraryImpact(itinerary, crowdStates);
    expect(affected).toBe(true);
    expect(affectedItemIds).toContain('item-1');
  });

  it('Reset Demo restores exact seed state', () => {
    const { result } = renderHook(() => useEventStore());

    // Mutate state
    act(() => { result.current.updateZoneCrowd('main-stage', 100); });
    act(() => { result.current.resetDemo(); });

    const mainStage = result.current.zones.find(z => z.id === 'main-stage')!;
    const originalPct = Math.round((SEED_ZONES.find(z => z.id === 'main-stage')!.currentCrowd / SEED_ZONES.find(z => z.id === 'main-stage')!.capacity) * 100);
    const restoredPct = Math.round((mainStage.currentCrowd / mainStage.capacity) * 100);
    expect(restoredPct).toBe(originalPct);
    expect(result.current.itinerary).toBeNull();
    expect(result.current.adaptationSuggestion).toBeNull();
  });
});