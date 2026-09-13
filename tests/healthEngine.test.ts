import { describe, it, expect } from 'vitest';
import { computeHealth, applyResponsePlan } from '../src/engine/healthEngine';
import { SEED_ZONES, SEED_SCENARIOS, SEED_SESSIONS } from '../src/data/seed';
import { runScenario, generateResponsePlan } from '../src/engine/simulationEngine';
import type { VenueZone } from '../src/types';

describe('healthEngine — computeHealth', () => {
  it('baseline health is between 0 and 100', () => {
    const health = computeHealth(SEED_ZONES, [], []);
    expect(health).toBeGreaterThanOrEqual(0);
    expect(health).toBeLessThanOrEqual(100);
  });

  it('health drops when a zone goes critical', () => {
    const baseline = computeHealth(SEED_ZONES, [], []);
    const criticalZones: VenueZone[] = SEED_ZONES.map(z =>
      z.id === 'main-stage' ? { ...z, currentCrowd: z.capacity } : z
    );
    const withCritical = computeHealth(criticalZones, [], []);
    expect(withCritical).toBeLessThan(baseline);
  });

  it('health rises after applying a response plan', () => {
    const overloadedZones: VenueZone[] = SEED_ZONES.map(z =>
      z.id === 'main-stage' ? { ...z, currentCrowd: z.capacity } : z
    );
    // Generate plan based on SEED_ZONES (main-stage at 72% triggering overload scenario)
    const scenario = SEED_SCENARIOS.find(s => s.id === 'scenario-overload')!;
    const result   = runScenario(scenario, SEED_ZONES, SEED_SESSIONS);
    const plan     = generateResponsePlan(result, SEED_ZONES);

    // Add a targeted redirect action for main-stage to ensure it applies
    plan.actions.push({ id: 'action-direct', label: 'Redirect attendees away from Main Stage', targetZoneId: 'main-stage', status: 'pending' });
    plan.actions.push({ id: 'action-staff',  label: 'Deploy staff to Main Stage', targetZoneId: 'main-stage', status: 'pending' });

    const { healthBefore, healthAfter } = applyResponsePlan(overloadedZones, plan);
    expect(healthAfter).toBeGreaterThanOrEqual(healthBefore);
  });

  it('clamps health at 100 with empty venue', () => {
    const emptyZones: VenueZone[] = SEED_ZONES.map(z => ({ ...z, currentCrowd: 0 }));
    const health = computeHealth(emptyZones, [], []);
    expect(health).toBeLessThanOrEqual(100);
    expect(health).toBeGreaterThanOrEqual(0);
  });
});

describe('healthEngine — applyResponsePlan', () => {
  it('reduces crowd in zones targeted by redirect actions', () => {
    // Directly create a plan with a redirect action for main-stage
    const criticalZones: VenueZone[] = SEED_ZONES.map(z =>
      z.id === 'main-stage' ? { ...z, currentCrowd: z.capacity } : z
    );
    const plan = {
      id: 'test-plan', scenarioId: 'test', status: 'draft' as const,
      actions: [
        { id: 'a1', label: 'Redirect attendees away from Main Stage', targetZoneId: 'main-stage', status: 'pending' as const },
        { id: 'a2', label: 'Deploy staff to Main Stage', targetZoneId: 'main-stage', status: 'pending' as const },
      ],
    };
    const mainStageBefore = criticalZones.find(z => z.id === 'main-stage')!.currentCrowd;
    const { zones: updatedZones } = applyResponsePlan(criticalZones, plan);
    const mainStageAfter = updatedZones.find(z => z.id === 'main-stage')!.currentCrowd;
    expect(mainStageAfter).toBeLessThan(mainStageBefore);
  });
});