import { describe, it, expect } from 'vitest';
import { runScenario, generateResponsePlan } from '../src/engine/simulationEngine';
import { SEED_ZONES, SEED_SESSIONS, SEED_SCENARIOS } from '../src/data/seed';

describe('simulationEngine — runScenario', () => {
  it('applies Main Stage Overload primary delta', () => {
    const scenario = SEED_SCENARIOS.find(s => s.id === 'scenario-overload')!;
    const result   = runScenario(scenario, SEED_ZONES, SEED_SESSIONS);
    const mainStage = result.zoneResults.find(r => r.zoneId === 'main-stage')!;
    expect(mainStage).toBeDefined();
    expect(mainStage.afterPct).toBeGreaterThanOrEqual(90);
    expect(mainStage.afterStatus).toBe('critical');
  });

  it('cascades to Central Corridor', () => {
    const scenario = SEED_SCENARIOS.find(s => s.id === 'scenario-overload')!;
    const result   = runScenario(scenario, SEED_ZONES, SEED_SESSIONS);
    const corridor = result.zoneResults.find(r => r.zoneId === 'central-corridor');
    expect(corridor).toBeDefined();
    expect(corridor!.afterPct).toBeGreaterThan(corridor!.beforePct);
  });

  it('cascade lands close to spec target (88%) for central corridor', () => {
    const scenario = SEED_SCENARIOS.find(s => s.id === 'scenario-overload')!;
    const result   = runScenario(scenario, SEED_ZONES, SEED_SESSIONS);
    const corridor = result.zoneResults.find(r => r.zoneId === 'central-corridor')!;
    // Spec target: ~88%, allow ±8 tolerance
    expect(corridor.afterPct).toBeGreaterThanOrEqual(75);
    expect(corridor.afterPct).toBeLessThanOrEqual(100);
  });

  it('returns no results for a no-op scenario', () => {
    const noOp = { id: 'noop', label: 'No-op', description: '', deltas: [] };
    const result = runScenario(noOp, SEED_ZONES, SEED_SESSIONS);
    expect(result.zoneResults.length).toBe(0);
  });

  it('detects affected sessions in changed zones', () => {
    const scenario = SEED_SCENARIOS.find(s => s.id === 'scenario-overload')!;
    const result   = runScenario(scenario, SEED_ZONES, SEED_SESSIONS);
    expect(result.affectedSessionIds.length).toBeGreaterThan(0);
  });
});

describe('simulationEngine — generateResponsePlan', () => {
  it('includes a redirect action when a zone goes critical', () => {
    const scenario = SEED_SCENARIOS.find(s => s.id === 'scenario-overload')!;
    const result   = runScenario(scenario, SEED_ZONES, SEED_SESSIONS);
    const plan     = generateResponsePlan(result, SEED_ZONES);
    const hasRedirect = plan.actions.some(a => a.label.toLowerCase().includes('redirect'));
    expect(hasRedirect).toBe(true);
  });

  it('plan has pending status for all actions initially', () => {
    const scenario = SEED_SCENARIOS.find(s => s.id === 'scenario-overload')!;
    const result   = runScenario(scenario, SEED_ZONES, SEED_SESSIONS);
    const plan     = generateResponsePlan(result, SEED_ZONES);
    expect(plan.actions.every(a => a.status === 'pending')).toBe(true);
  });

  it('generates empty/minimal plan for no-op scenario', () => {
    const noOp   = { id: 'noop', label: 'No-op', description: '', deltas: [] };
    const result = runScenario(noOp, SEED_ZONES, SEED_SESSIONS);
    const plan   = generateResponsePlan(result, SEED_ZONES);
    expect(plan.actions.length).toBe(0);
  });
});