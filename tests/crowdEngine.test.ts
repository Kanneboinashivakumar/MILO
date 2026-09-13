import { describe, it, expect } from 'vitest';
import { getStatus, predictNext, computeCrowdState, CROWD_THRESHOLD_LOW, CROWD_THRESHOLD_MODERATE, CROWD_THRESHOLD_HIGH } from '../src/engine/crowdEngine';
import type { VenueZone } from '../src/types';

const makeZone = (currentCrowd: number, capacity = 100): VenueZone => ({
  id: 'z1', name: 'Test', capacity, currentCrowd, trend: 'stable',
  facilities: [], connectedZoneIds: [], hasStairs: false, hasAccessibleRoute: true, isBlocked: false,
});

describe('crowdEngine — getStatus', () => {
  it('returns low below threshold', ()  => expect(getStatus(49)).toBe('low'));
  it('returns low at 0',            ()  => expect(getStatus(0)).toBe('low'));
  it('returns moderate at boundary',()  => expect(getStatus(CROWD_THRESHOLD_LOW)).toBe('moderate'));
  it('returns moderate at 74',      ()  => expect(getStatus(74)).toBe('moderate'));
  it('returns high at boundary',    ()  => expect(getStatus(CROWD_THRESHOLD_MODERATE)).toBe('high'));
  it('returns high at 89',          ()  => expect(getStatus(89)).toBe('high'));
  it('returns critical at boundary',()  => expect(getStatus(CROWD_THRESHOLD_HIGH)).toBe('critical'));
  it('returns critical at 100',     ()  => expect(getStatus(100)).toBe('critical'));
  it('returns critical above 100',  ()  => expect(getStatus(110)).toBe('critical'));
});

describe('crowdEngine — predictNext', () => {
  it('returns single value unchanged', () => expect(predictNext([50])).toBe(50));
  it('extrapolates rising trend',       () => expect(predictNext([60, 70, 80])).toBe(90));
  it('extrapolates falling trend',      () => expect(predictNext([80, 70, 60])).toBe(50));
  it('extrapolates flat trend',         () => expect(predictNext([50, 50, 50])).toBe(50));
  it('clamps at 100',                   () => expect(predictNext([90, 95, 100])).toBeLessThanOrEqual(100));
  it('clamps at 0',                     () => expect(predictNext([10, 5, 0])).toBeGreaterThanOrEqual(0));
});

describe('crowdEngine — computeCrowdState', () => {
  it('computes state for a zone', () => {
    const zone  = makeZone(72); // 72%
    const state = computeCrowdState(zone);
    expect(state.zoneId).toBe('z1');
    expect(state.utilizationPct).toBe(72);
    expect(state.status).toBe('moderate');
  });
});