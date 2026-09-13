import type { VenueZone, Incident, ResponsePlan } from '../types';
import { getStatus, getUtilizationPct } from './crowdEngine';

const RISK_PER_CRITICAL_ZONE     = 8;
const RISK_PER_HIGH_ZONE         = 4;
const RISK_PER_MODERATE_ZONE     = 1;
const RISK_PER_INCIDENT          = 12;
const RISK_PER_ACCESSIBILITY_BLOCK = 6;

export function computeHealth(zones: VenueZone[], incidents: Incident[] = [], blockedAccessibleZones: string[] = []): number {
  let risk = 0;

  for (const zone of zones) {
    const pct    = getUtilizationPct(zone);
    const status = getStatus(pct);
    if (status === 'critical') risk += RISK_PER_CRITICAL_ZONE;
    else if (status === 'high') risk += RISK_PER_HIGH_ZONE;
    else if (status === 'moderate') risk += RISK_PER_MODERATE_ZONE;
  }

  const activeIncidents = incidents.filter(i => i.active).length;
  risk += activeIncidents * RISK_PER_INCIDENT;
  risk += blockedAccessibleZones.length * RISK_PER_ACCESSIBILITY_BLOCK;

  return Math.max(0, Math.min(100, 100 - risk));
}

/** Applies a response plan by reducing crowd in targeted zones */
export function applyResponsePlan(
  zones: VenueZone[],
  plan: ResponsePlan,
  incidents: Incident[] = [],
  blockedAccessibleZones: string[] = []
): { zones: VenueZone[]; healthBefore: number; healthAfter: number } {
  const healthBefore = computeHealth(zones, incidents, blockedAccessibleZones);

  const CROWD_REDUCTION_FACTOR = 0.18;

  const updatedZones = zones.map(zone => {
    const actionsForZone = plan.actions.filter(
      a => (a.targetZoneId === zone.id || !a.targetZoneId) &&
           (a.label.toLowerCase().includes('redirect') || a.label.toLowerCase().includes('deploy staff'))
    );
    if (actionsForZone.length === 0) return zone;
    const totalReduction = Math.min(0.5, actionsForZone.length * CROWD_REDUCTION_FACTOR);
    const newCrowd = Math.max(0, Math.round(zone.currentCrowd * (1 - totalReduction)));
    return { ...zone, currentCrowd: newCrowd, trend: 'falling' as const };
  });

  const healthAfter = computeHealth(updatedZones, incidents, blockedAccessibleZones);
  return { zones: updatedZones, healthBefore, healthAfter };
}
