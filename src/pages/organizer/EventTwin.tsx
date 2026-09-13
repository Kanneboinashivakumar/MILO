import { useState } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { StatusBadge } from '../../components/StatusBadge';
import { StatBlock } from '../../components/StatBlock';
import { ResponsePlanCard } from '../../features/organizer/ResponsePlanCard';
import { useEventStore } from '../../store/useEventStore';
import { runScenario, generateResponsePlan } from '../../engine/simulationEngine';

export function EventTwinPage() {
  const zones         = useEventStore(s => s.zones);
  const sessions      = useEventStore(s => s.sessions);
  const scenarios     = useEventStore(s => s.scenarios);
  const simResult     = useEventStore(s => s.simulationResult);
  const responsePlan  = useEventStore(s => s.responsePlan);
  const setSimResult  = useEventStore(s => s.setSimulationResult);
  const setResPlan    = useEventStore(s => s.setResponsePlan);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [running,    setRunning]    = useState(false);

  const selectedScenario = scenarios.find(s => s.id === selectedId);

  function handleSimulate() {
    if (!selectedScenario) return;
    setRunning(true);

    const result = runScenario(selectedScenario, zones, sessions);
    const plan   = generateResponsePlan(result, zones);

    setSimResult(result);
    setResPlan(plan);
    setRunning(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Event Twin</h1>
        <p className="text-sm text-midGray mt-0.5">
          Simulate scenarios and generate response plans &middot; Simulated Event Data
        </p>
      </div>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-widest text-midGray mb-3">Select a Scenario</p>
        <div className="grid grid-cols-2 gap-3">
          {scenarios.map(scenario => {
            const isActive = selectedId === scenario.id;
            return (
              <button
                key={scenario.id}
                onClick={() => {
                  setSelectedId(scenario.id);
                  setSimResult(null);
                  setResPlan(null);
                }}
                aria-pressed={isActive}
                className={[
                  'text-left rounded-card border p-4 transition-colors',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
                  isActive
                    ? 'bg-inkSoft border-inkSoft text-paper'
                    : 'bg-paper border-hairline text-ink hover:bg-canvas',
                ].join(' ')}
              >
                <p className="text-sm font-semibold">{scenario.label}</p>
                <p className={'text-xs mt-1 ' + (isActive ? 'text-paper opacity-75' : 'text-midGray')}>
                  {scenario.description}
                </p>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {scenario.deltas.map(d => (
                    <Badge key={d.zoneId} variant={isActive ? 'outline' : 'soft'} className="!text-[10px]">
                      {d.zoneId.replace(/-/g, ' ')} &rarr; {d.newPct}%
                    </Badge>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedScenario && (
        <Button
          fullWidth
          onClick={handleSimulate}
          disabled={running}
          aria-label={'Simulate scenario: ' + selectedScenario.label}
        >
          {running ? 'Simulating · ' : '? Simulate · ' + selectedScenario.label}
        </Button>
      )}

      {simResult && (
        <div className="flex flex-col gap-5">
          <Card className="!p-4 border-inkSoft border-2">
            <p className="text-[11px] font-medium uppercase tracking-widest text-midGray mb-2">Impact Summary</p>
            <p className="text-sm text-ink leading-relaxed font-medium">{simResult.impactSummary}</p>
            <div className="flex gap-4 mt-3">
              <StatBlock label="Affected Zones"    value={simResult.zoneResults.length}                  size="sm" />
              <StatBlock label="Affected Sessions" value={simResult.affectedSessionIds.length}           size="sm" />
              <StatBlock label="Estimated Affected Attendees" value={simResult.estimatedAffectedAttendees} size="sm" />
            </div>
          </Card>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-midGray mb-3">Zone Impact</p>
            <div className="flex flex-col gap-3">
              {simResult.zoneResults.map(zr => (
                <Card key={zr.zoneId} className="!p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-sm font-semibold text-ink">{zr.zoneName}</p>
                        {zr.isPrimary && <Badge variant="solid" className="!text-[10px]">Primary</Badge>}
                        {!zr.isPrimary && <Badge variant="outline" className="!text-[10px]">Cascade</Badge>}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-canvas rounded-nested p-3">
                          <p className="text-[10px] uppercase tracking-widest text-midGray mb-1">Before</p>
                          <p className="text-2xl font-semibold text-ink leading-none">{zr.beforePct}%</p>
                          <div className="mt-1">
                            <StatusBadge status={zr.beforeStatus} />
                          </div>
                        </div>
                        <div className="bg-canvas rounded-nested p-3">
                          <p className="text-[10px] uppercase tracking-widest text-midGray mb-1">After</p>
                          <p className={'text-2xl font-semibold leading-none ' + (zr.afterStatus === 'critical' ? 'text-ember' : 'text-ink')}>
                            {zr.afterPct}%
                          </p>
                          <div className="mt-1">
                            <StatusBadge status={zr.afterStatus} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {simResult.affectedSessionIds.length > 0 && (
            <Card className="!p-4">
              <p className="text-[11px] font-medium uppercase tracking-widest text-midGray mb-2">Affected Sessions</p>
              <ul className="flex flex-col gap-1">
                {simResult.affectedSessionIds.map(sid => {
                  const session = sessions.find(s => s.id === sid);
                  return (
                    <li key={sid} className="text-sm text-ink border-b border-hairline py-1.5 last:border-0 font-medium">
                      {session?.title ?? sid}
                      <span className="text-xs text-midGray ml-2">{session?.startTime} · {session?.endTime}</span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          {responsePlan && (
            <div>
              <p className="text-[11px] font-medium uppercase tracking-widest text-midGray mb-3">Generated Response Plan</p>
              <ResponsePlanCard plan={responsePlan} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
