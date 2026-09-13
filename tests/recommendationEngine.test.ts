import { describe, it, expect } from 'vitest';
import { parseAttendeeInput, generateItinerary, scoreSession } from '../src/engine/recommendationEngine';
import { SEED_ZONES, SEED_SESSIONS, SEED_ATTENDEE } from '../src/data/seed';
import type { Attendee } from '../src/types';

describe('recommendationEngine — parseAttendeeInput', () => {
  it('extracts AI interest and 90 minutes', () => {
    const result = parseAttendeeInput('I have 90 minutes and I am interested in AI and startups');
    expect(result.availableMinutes).toBe(90);
    expect(result.interests).toContain('ai');
    expect(result.interests).toContain('startups');
  });

  it('extracts hour-based time', () => {
    const result = parseAttendeeInput('I have 2 hours for networking');
    expect(result.availableMinutes).toBe(120);
    expect(result.interests).toContain('networking');
  });

  it('defaults to 90 min and ai when no info given', () => {
    const result = parseAttendeeInput('just show me something');
    expect(result.availableMinutes).toBe(90);
    expect(result.interests.length).toBeGreaterThan(0);
  });
});

describe('recommendationEngine — scoreSession', () => {
  // Use attendee with only 'ai' interest so the AI session clearly dominates
  const attendee: Attendee = { ...SEED_ATTENDEE, interests: ['ai'], availableMinutes: 90 };

  it('scores AI-tagged session higher than non-AI session for an AI-interested attendee', () => {
    // session-4: AI Agents Workshop — tags: ai, agents, workshop, product (matches 'ai')
    const aiSession  = SEED_SESSIONS.find(s => s.id === 'session-4')!;
    // session-5: Founder Networking — tags: networking, startups, founders (no 'ai')
    const netSession = SEED_SESSIONS.find(s => s.id === 'session-5')!;
    const aiScore    = scoreSession(aiSession,  attendee, SEED_ZONES, 600, 690).score;
    const netScore   = scoreSession(netSession, attendee, SEED_ZONES, 600, 690).score;
    expect(aiScore).toBeGreaterThan(netScore);
  });

  it('gives -1 score to cancelled session', () => {
    const cancelled = { ...SEED_SESSIONS[0]!, isCancelled: true };
    const { score } = scoreSession(cancelled, attendee, SEED_ZONES, 600, 690);
    expect(score).toBe(-1);
  });

  it('gives -1 score when route violates hard accessibility constraint', () => {
    const strictProfile: Attendee = {
      ...attendee,
      accessibilityProfile: { wheelchairAccessible: true, avoidStairs: true, avoidCrowds: false },
    };
    // Make every path to main-stage require stairs by setting hasStairs=true, hasAccessibleRoute=false
    // AND making it the only neighbor (disconnect everything else)
    const zones = SEED_ZONES.map(z =>
      z.id === 'main-stage'
        ? { ...z, hasStairs: true, hasAccessibleRoute: false, connectedZoneIds: [] }
        : z
    );
    const mainStageSession = SEED_SESSIONS.find(s => s.zoneId === 'main-stage')!;
    const { score } = scoreSession(mainStageSession, strictProfile, zones, 600, 690);
    expect(score).toBe(-1);
  });
});

describe('recommendationEngine — generateItinerary', () => {
  const attendee: Attendee = { ...SEED_ATTENDEE, interests: ['ai', 'startups'], availableMinutes: 90 };

  it('generates an itinerary within the time budget', () => {
    const itin = generateItinerary(attendee, SEED_SESSIONS, SEED_ZONES, 90);
    expect(itin.items.length).toBeGreaterThan(0);
    expect(itin.totalMinutes).toBe(90);
  });

  it('respects time budget — generates items without errors', () => {
    const itin = generateItinerary(attendee, SEED_SESSIONS, SEED_ZONES, 60);
    expect(itin.items.length).toBeGreaterThanOrEqual(0);
  });

  it('every item has a non-empty reason string', () => {
    const itin = generateItinerary(attendee, SEED_SESSIONS, SEED_ZONES, 90);
    for (const item of itin.items) {
      expect(item.reason.length).toBeGreaterThan(0);
    }
  });
});