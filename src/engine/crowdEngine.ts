import type { VenueZone, CrowdState, CrowdStatus } from '../types';

// ─── Thresholds (named constants, never magic numbers) ───────────────────────
export const CROWD_THRESHOLD_LOW      = 50;
export const CROWD_THRESHOLD_MODERATE = 75;
export const CROWD_THRESHOLD_HIGH     = 90;

export function getStatus(utilizationPct: number): CrowdStatus {
  if (utilizationPct < CROWD_THRESHOLD_LOW)      return 'low';
  if (utilizationPct < CROWD_THRESHOLD_MODERATE) return 'moderate';
  if (utilizationPct < CROWD_THRESHOLD_HIGH)     return 'high';
  return 'critical';
}

export function getUtilizationPct(zone: VenueZone): number {
  if (zone.capacity === 0) return 0;
  return Math.round((zone.currentCrowd / zone.capacity) * 100);
}

/** Simple linear extrapolation over the last 2-3 readings, clamped 0-100 */
export function predictNext(recentValues: number[]): number {
  if (recentValues.length === 0) return 0;
  if (recentValues.length === 1) return recentValues[0]!;
  const window = recentValues.slice(-3);
  const deltas: number[] = [];
  for (let i = 1; i < window.length; i++) {
    deltas.push((window[i] ?? 0) - (window[i - 1] ?? 0));
  }
  const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  const last = window[window.length - 1] ?? 0;
  return Math.min(100, Math.max(0, Math.round(last + avgDelta)));
}

export function computeCrowdState(zone: VenueZone, history: number[] = []): CrowdState {
  const utilizationPct = getUtilizationPct(zone);
  const status          = getStatus(utilizationPct);
  const predictedPct    = predictNext([...history, utilizationPct]);
  return { zoneId: zone.id, utilizationPct, status, trend: zone.trend, predictedPct };
}

export function computeAllCrowdStates(zones: VenueZone[]): CrowdState[] {
  return zones.map(z => computeCrowdState(z));
}