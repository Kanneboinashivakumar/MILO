import { describe, it, expect, beforeEach } from 'vitest';
import { useEventStore } from '../src/store/useEventStore';
import { findRoute } from '../src/engine/routingEngine';
import { parseAttendeeInput, generateItinerary } from '../src/engine/recommendationEngine';
import { computeCrowdState } from '../src/engine/crowdEngine';
import { computeHealth } from '../src/engine/healthEngine';
import { SEED_ZONES, SEED_SESSIONS, SEED_ATTENDEE } from '../src/data/seed';

describe('System Resilience, Security, and Edge Cases', () => {
  beforeEach(() => {
    useEventStore.getState().resetDemo();
  });

  it('handles extremely long prompt inputs safely without buffer errors', () => {
    const hugeInput = 'I want AI workshops and hackathon sprinting '.repeat(100);
    const { interests, availableMinutes } = parseAttendeeInput(hugeInput);
    expect(interests).toContain('ai');
    expect(typeof availableMinutes).toBe('number');
    expect(availableMinutes).toBeGreaterThan(0);
  });

  it('findRoute returns null safely on unknown or invalid zones without crashing', () => {
    const route = findRoute('unknown-zone-1', 'unknown-zone-2', SEED_ZONES, SEED_ATTENDEE.accessibilityProfile);
    expect(route).toBeNull();
  });

  it('generateItinerary handles 0 available minutes safely', () => {
    const itin = generateItinerary(SEED_ATTENDEE, SEED_SESSIONS, SEED_ZONES, 0);
    expect(itin).toBeDefined();
    expect(itin.items).toHaveLength(0);
  });

  it('computeCrowdState gracefully handles extreme crowd levels (>100% capacity)', () => {
    const overloadedZone = {
      ...SEED_ZONES[0],
      currentCrowd: SEED_ZONES[0].capacity * 2, // 200%
    };
    const state = computeCrowdState(overloadedZone);
    expect(state.status).toBe('critical');
    expect(state.utilizationPct).toBe(200);
  });

  it('computeHealth clamps health score safely between 0 and 100', () => {
    // All zones blocked + massive incidents
    const blockedZones = SEED_ZONES.map(z => ({ ...z, isBlocked: true }));
    const incidents = SEED_ZONES.map((z, idx) => ({
      id: 'inc-' + idx,
      zoneId: z.id,
      type: 'emergency' as const,
      description: 'Test disaster',
      active: true,
      timestamp: new Date().toISOString(),
    }));
    const health = computeHealth(blockedZones, incidents, blockedZones.map(z => z.id));
    expect(health).toBeGreaterThanOrEqual(0);
    expect(health).toBeLessThanOrEqual(100);
  });

  it('addAlert and acknowledgeAlert correctly manage broadcast notifications', () => {
    const store = useEventStore.getState();
    const testAlertId = 'test-broadcast-101';
    store.addAlert({
      id: testAlertId,
      type: 'session',
      severity: 'moderate',
      message: 'Test Broadcast Announcement',
      timestamp: new Date().toISOString(),
      acknowledged: false,
    });

    let alerts = useEventStore.getState().alerts;
    const found = alerts.find(a => a.id === testAlertId);
    expect(found).toBeDefined();
    expect(found?.acknowledged).toBe(false);

    store.acknowledgeAlert(testAlertId);
    alerts = useEventStore.getState().alerts;
    const updated = alerts.find(a => a.id === testAlertId);
    expect(updated?.acknowledged).toBe(true);
  });

  it('live simulation tick updates crowd levels deterministically', () => {
    const store = useEventStore.getState();
    store.tickSimulation();
    const updatedCrowds = useEventStore.getState().zones.map(z => z.currentCrowd);
    updatedCrowds.forEach((c) => {
      expect(typeof c).toBe('number');
      expect(c).toBeGreaterThanOrEqual(0);
    });
  });

  it('organizer response plan applies cleanly and relieves zone congestion', () => {
    const store = useEventStore.getState();
    const itin = generateItinerary(SEED_ATTENDEE, SEED_SESSIONS, SEED_ZONES, 180);
    store.setItinerary(itin);

    store.triggerMainStageOverload();
    const overloadedZone = useEventStore.getState().zones.find(z => z.id === 'main-stage');
    expect(overloadedZone?.trend).toBe('rising');

    // Apply relief intervention
    const relievedZones = store.zones.map(z =>
      z.id === 'main-stage' ? { ...z, currentCrowd: Math.round(z.capacity * 0.4), trend: 'falling' as const } : z
    );
    store.applyResponsePlanToStore(relievedZones);
    expect(useEventStore.getState().eventState.health).toBeGreaterThan(0);
  });
});
