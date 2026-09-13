import type { VenueZone, Route, AccessibilityProfile } from '../types';
import { getEdgeWeight } from '../data/seed';
import { getUtilizationPct } from './crowdEngine';

// ─── Cost constants ──────────────────────────────────────────────────────────
const CROWD_PENALTY_WEIGHT   = 0.05; // per % above 50
const BLOCKED_PENALTY        = 9999; // effectively infinite — excludes zone
const STAIRS_HARD_EXCLUSION  = 9999; // hard constraint, not a soft penalty

/** Dijkstra-based routing with crowd, blocked, and accessibility costs */
export function findRoute(
  fromZoneId: string,
  toZoneId: string,
  zones: VenueZone[],
  accessibilityProfile: AccessibilityProfile,
  blockedZoneIds: string[] = []
): Route | null {
  if (fromZoneId === toZoneId) {
    return { fromZoneId, toZoneId, zoneIds: [fromZoneId], walkMinutes: 0, isAccessible: true };
  }

  const zoneMap = new Map(zones.map(z => [z.id, z]));
  const dist    = new Map<string, number>();
  const prev    = new Map<string, string | null>();
  const visited = new Set<string>();

  for (const z of zones) dist.set(z.id, Infinity);
  dist.set(fromZoneId, 0);

  const queue = new Set(zones.map(z => z.id));

  while (queue.size > 0) {
    // Pick unvisited node with smallest distance
    let u: string | null = null;
    let minDist = Infinity;
    for (const id of queue) {
      const d = dist.get(id) ?? Infinity;
      if (d < minDist) { minDist = d; u = id; }
    }
    if (u === null || minDist === Infinity) break;
    if (u === toZoneId) break;

    queue.delete(u);
    visited.add(u);

    const uZone = zoneMap.get(u);
    if (!uZone) continue;

    for (const neighborId of uZone.connectedZoneIds) {
      if (visited.has(neighborId)) continue;
      const neighbor = zoneMap.get(neighborId);
      if (!neighbor) continue;

      // Hard accessibility constraint — exclude entirely, never just deprioritize
      if ((accessibilityProfile.wheelchairAccessible || accessibilityProfile.avoidStairs) && neighbor.hasStairs && !neighbor.hasAccessibleRoute) {
        continue; // Fully exclude this neighbor from candidate set
      }

      let edgeCost = getEdgeWeight(u, neighborId);
      const pct    = getUtilizationPct(neighbor);

      // Blocked penalty
      if (blockedZoneIds.includes(neighborId) || neighbor.isBlocked) {
        edgeCost += BLOCKED_PENALTY;
      }

      // Crowd penalty (soft — prefer less crowded, not a hard block unless blocked)
      if (pct > 50) edgeCost += (pct - 50) * CROWD_PENALTY_WEIGHT;

      // Stairs penalty only if not a hard constraint scenario
      if (neighbor.hasStairs && !accessibilityProfile.avoidStairs) {
        edgeCost += 1; // slight soft preference for step-free
      }

      const alt = (dist.get(u) ?? Infinity) + edgeCost;
      if (alt < (dist.get(neighborId) ?? Infinity)) {
        dist.set(neighborId, alt);
        prev.set(neighborId, u);
      }
    }
  }

  // Reconstruct path
  if ((dist.get(toZoneId) ?? Infinity) >= STAIRS_HARD_EXCLUSION) return null;

  const path: string[] = [];
  let current: string | null = toZoneId;
  while (current !== null) {
    path.unshift(current);
    current = prev.get(current) ?? null;
  }

  if (path[0] !== fromZoneId) return null; // no path found

  // Calculate actual walk minutes from path
  let walkMinutes = 0;
  for (let i = 0; i < path.length - 1; i++) {
    walkMinutes += getEdgeWeight(path[i]!, path[i + 1]!);
  }

  const isAccessible = path.every(zId => {
    const z = zoneMap.get(zId);
    return z ? z.hasAccessibleRoute || !z.hasStairs : true;
  });

  return { fromZoneId, toZoneId, zoneIds: path, walkMinutes, isAccessible };
}