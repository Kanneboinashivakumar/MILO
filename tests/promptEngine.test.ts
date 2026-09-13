import { describe, it, expect, beforeEach } from 'vitest';
import { processPrompt, matchZone } from '../src/engine/promptEngine';
import { SEED_ZONES, SEED_SESSIONS, SEED_HACKATHON_SESSIONS } from '../src/data/seed';
import { computeAllCrowdStates } from '../src/engine/crowdEngine';
import { useEventStore } from '../src/store/useEventStore';

describe('PromptEngine — Deterministic NLP & Live Hackathon Simulation', () => {
  const defaultContext = {
    zones: SEED_ZONES,
    sessions: SEED_SESSIONS,
    crowdStates: computeAllCrowdStates(SEED_ZONES),
    currentEventName: 'AI Future Summit 2026',
  };

  it('matches zone aliases accurately', () => {
    expect(matchZone('crowd rush at the cafeteria', SEED_ZONES)?.id).toBe('food-court');
    expect(matchZone('hardware lab short circuit', SEED_ZONES)?.id).toBe('workshop-hall');
    expect(matchZone('judging pod in startup arena', SEED_ZONES)?.id).toBe('startup-arena');
    expect(matchZone('keynote stage speech', SEED_ZONES)?.id).toBe('main-stage');
    expect(matchZone('meet mentors in the lounge', SEED_ZONES)?.id).toBe('networking-lounge');
  });

  it('switches event mode to 24h Hackathon seamlessly', () => {
    const mutations = processPrompt('switch to hackathon mode', defaultContext);
    expect(mutations.newEventName).toContain('MILO');
    expect(mutations.updatedSessions?.length).toBe(SEED_HACKATHON_SESSIONS.length);
    expect(mutations.promptResult.type).toBe('mode_switch');
    expect(mutations.promptResult.executionTimeMs).toBeLessThan(20);
  });

  it('restores AI Summit mode when requested', () => {
    const mutations = processPrompt('reset to summit mode', defaultContext);
    expect(mutations.newEventName).toContain('AI Future Summit');
    expect(mutations.updatedSessions?.length).toBe(SEED_SESSIONS.length);
    expect(mutations.promptResult.type).toBe('mode_switch');
  });

  it('simulates crowd surge with cascading crowd propagation', () => {
    const mutations = processPrompt('Midnight pizza drop at Food Court crowd surge 98%', defaultContext);
    expect(mutations.promptResult.type).toBe('crowd_surge');
    expect(mutations.updatedZones).toBeDefined();

    const foodCourt = mutations.updatedZones?.find(z => z.id === 'food-court');
    expect(foodCourt).toBeDefined();
    // 98% of 400 capacity = 392
    expect(foodCourt?.currentCrowd).toBe(Math.round(400 * 0.98));

    // Connected zone should have received cascade
    const connectedCentral = mutations.updatedZones?.find(z => z.id === 'central-corridor');
    expect(connectedCentral).toBeDefined();
    expect(mutations.newAlerts?.length).toBeGreaterThan(0);
    expect(mutations.newAlerts?.[0].severity).toBe('critical');
  });

  it('blocks zone and creates hazard incident on emergency prompt', () => {
    const mutations = processPrompt('Hardware Lab power outage and short-circuit in Workshop Hall block zone', defaultContext);
    expect(mutations.promptResult.type).toBe('incident');

    const workshop = mutations.updatedZones?.find(z => z.id === 'workshop-hall');
    expect(workshop?.isBlocked).toBe(true);
    expect(mutations.newIncidents?.length).toBe(1);
    expect(mutations.newAlerts?.[0].severity).toBe('critical');
  });

  it('adds and schedules a custom hackathon session via prompt', () => {
    const mutations = processPrompt('Schedule Building Autonomous AI Agents at 14:00 in Workshop Hall', defaultContext);
    expect(mutations.promptResult.type).toBe('session_added');
    expect(mutations.promptResult.newSession).toBeDefined();
    expect(mutations.promptResult.newSession?.title).toContain('Building Autonomous AI Agents');
    expect(mutations.promptResult.newSession?.startTime).toBe('14:00');
    expect(mutations.promptResult.newSession?.endTime).toBe('15:00');
    expect(mutations.promptResult.newSession?.zoneId).toBe('workshop-hall');
  });

  it('answers queries about pizza and locations', () => {
    const mutations = processPrompt('Where is pizza drop?', defaultContext);
    expect(mutations.promptResult.type).toBe('query');
    expect(mutations.promptResult.affectedZoneId).toBe('food-court');
    expect(mutations.promptResult.details).toContain('capacity');
  });
});

describe('Store Integration with PromptEngine', () => {
  beforeEach(() => {
    useEventStore.getState().resetDemo();
  });

  it('executePrompt action mutates store sessions and alerts', () => {
    const result = useEventStore.getState().executePrompt('Schedule Building Autonomous AI Agents at 14:00 in Workshop Hall');
    expect(result.type).toBe('session_added');

    const sessions = useEventStore.getState().sessions;
    expect(sessions.some(s => s.title.includes('Building Autonomous AI Agents'))).toBe(true);

    const alerts = useEventStore.getState().alerts;
    expect(alerts.length).toBeGreaterThan(0);
  });

  it('switchEventMode switches between hackathon and summit in store', () => {
    useEventStore.getState().switchEventMode('hackathon');
    expect(useEventStore.getState().eventState.name).toContain('MILO');

    useEventStore.getState().switchEventMode('summit');
    expect(useEventStore.getState().eventState.name).toContain('Summit');
  });
});
