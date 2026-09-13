import type { SimulationScenario, SimulationResult, VenueZone, ResponsePlan, ResponseAction, ZoneSimulationResult } from '../types';
import { getStatus, getUtilizationPct } from './crowdEngine';

// Cascade propagation: connected zones receive this fraction of the primary capacity delta
const CASCADE_FACTOR = 0.60;

export function runScenario(
  scenario: SimulationScenario,
  zones: VenueZone[],
  sessions: { id: string; zoneId: string; popularity: number }[]
): SimulationResult {
  const zoneMap  = new Map(zones.map(z => [z.id, z]));
  const deltaMap = new Map(scenario.deltas.map(d => [d.zoneId, d.newPct]));

  // Cascade: connected zones of primary targets get partial crowd increase
  const cascadeMap = new Map<string, number>();
  for (const { zoneId, newPct } of scenario.deltas) {
    const zone = zoneMap.get(zoneId);
    if (!zone) continue;
    const currentPct   = getUtilizationPct(zone);
    const pctDelta     = newPct - currentPct;
    // Convert to people delta
    const peopleDelta  = (pctDelta / 100) * zone.capacity;

    for (const connId of zone.connectedZoneIds) {
      if (deltaMap.has(connId)) continue;
      const conn = zoneMap.get(connId);
      if (!conn) continue;
      const connCurrentPct  = getUtilizationPct(conn);
      const cascadePeople   = peopleDelta * CASCADE_FACTOR;
      const cascadeNewPct   = connCurrentPct + (cascadePeople / conn.capacity) * 100;
      const existing        = cascadeMap.get(connId) ?? connCurrentPct;
      cascadeMap.set(connId, Math.max(existing, cascadeNewPct));
    }
  }

  const zoneResults: ZoneSimulationResult[] = [];

  for (const zone of zones) {
    const beforePct = getUtilizationPct(zone);
    let   afterPct  = beforePct;
    let   isPrimary = false;

    if (deltaMap.has(zone.id)) {
      afterPct  = deltaMap.get(zone.id)!;
      isPrimary = true;
    } else if (cascadeMap.has(zone.id)) {
      afterPct = cascadeMap.get(zone.id)!;
    }

    const afterPctRounded = Math.min(100, Math.round(afterPct));
    if (afterPctRounded === beforePct && !isPrimary) continue;

    zoneResults.push({
      zoneId:       zone.id,
      zoneName:     zone.name,
      beforePct,
      afterPct:     afterPctRounded,
      beforeStatus: getStatus(beforePct),
      afterStatus:  getStatus(afterPctRounded),
      isPrimary,
    });
  }

  const changedZoneIds       = new Set(zoneResults.map(r => r.zoneId));
  const affectedSessionIds   = sessions.filter(s => changedZoneIds.has(s.zoneId)).map(s => s.id);
  const estimatedAffectedAttendees = Math.round(
    zoneResults.reduce((acc, r) => {
      const zone = zoneMap.get(r.zoneId);
      return acc + (zone ? zone.capacity * (r.beforePct / 100) : 0);
    }, 0)
  );

  const primaryResult  = zoneResults.find(r => r.isPrimary);
  const cascadeResults = zoneResults.filter(r => !r.isPrimary);
  const impactSummary  = buildImpactSummary(primaryResult, cascadeResults);

  return { scenarioId: scenario.id, zoneResults, affectedSessionIds, estimatedAffectedAttendees, impactSummary };
}

function buildImpactSummary(primary: ZoneSimulationResult | undefined, cascades: ZoneSimulationResult[]): string {
  if (!primary) return 'No significant impact detected.';
  const parts = [`${primary.zoneName} overload (${primary.beforePct}% → ${primary.afterPct}%) is likely to propagate`];
  if (cascades.length > 0) {
    const names = cascades.map(c => `${c.zoneName} (${c.beforePct}% → ${c.afterPct}%)`).join(', ');
    parts.push(`through ${names}`);
  }
  parts.push('Immediate action recommended to prevent cascading congestion.');
  return parts.join('. ') + '.';
}

export function generateResponsePlan(result: SimulationResult, zones: VenueZone[]): ResponsePlan {
  const actions: ResponseAction[] = [];
  let actionIdx = 0;
  const id = () => `action-${++actionIdx}`;
  const zoneMap = new Map(zones.map(z => [z.id, z]));

  for (const zr of result.zoneResults) {
    if (zr.afterStatus === 'critical') {
      actions.push({ id: id(), label: `Redirect attendees away from ${zr.zoneName}`, targetZoneId: zr.zoneId, status: 'pending' });
      actions.push({ id: id(), label: `Recommend alternative sessions from ${zr.zoneName}`, targetZoneId: zr.zoneId, status: 'pending' });
    }
    if (zr.afterStatus === 'high' || zr.afterStatus === 'critical') {
      actions.push({ id: id(), label: `Deploy staff to ${zr.zoneName}`, targetZoneId: zr.zoneId, status: 'pending' });
    }
  }

  if (result.affectedSessionIds.length > 0) {
    actions.push({ id: id(), label: 'Notify affected attendees via MILO', status: 'pending' });
  }

  const hasAccessibilityRisk = result.zoneResults.some(zr => {
    const zone = zoneMap.get(zr.zoneId);
    return zone && !zone.hasAccessibleRoute;
  });
  if (hasAccessibilityRisk) {
    actions.push({ id: id(), label: 'Preserve accessible routes — reroute around affected zones', status: 'pending' });
  }

  const entranceAffected = result.zoneResults.some(zr => zr.zoneId.includes('entrance'));
  if (entranceAffected) {
    actions.push({ id: id(), label: 'Monitor East Entrance flow — open secondary gate if needed', targetZoneId: 'east-entrance', status: 'pending' });
  }

  return { id: `plan-${result.scenarioId}`, scenarioId: result.scenarioId, actions, status: 'draft' };
}