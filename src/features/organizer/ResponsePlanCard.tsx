import { useState } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { StatBlock } from '../../components/StatBlock';
import { IconCheck } from '../../components/Icons';
import { useEventStore } from '../../store/useEventStore';
import { applyResponsePlan } from '../../engine/healthEngine';
import type { ResponsePlan } from '../../types';

interface ResponsePlanCardProps {
  plan: ResponsePlan;
}

export function ResponsePlanCard({ plan }: ResponsePlanCardProps) {
  const zones           = useEventStore(s => s.zones);
  const incidents       = useEventStore(s => s.incidents);
  const setResponsePlan = useEventStore(s => s.setResponsePlan);
  const applyToStore    = useEventStore(s => s.applyResponsePlanToStore);

  const [healthBefore, setHealthBefore] = useState<number | undefined>(plan.healthBefore);
  const [healthAfter,  setHealthAfter]  = useState<number | undefined>(plan.healthAfter);
  const [previewing,   setPreviewing]   = useState(false);

  function handlePreview() {
    const { healthBefore: hb, healthAfter: ha } = applyResponsePlan(zones, plan, incidents);
    setHealthBefore(hb);
    setHealthAfter(ha);
    setPreviewing(true);
  }

  function handleApply() {
    const { zones: updatedZones, healthBefore: hb, healthAfter: ha } = applyResponsePlan(zones, plan, incidents);

    const appliedPlan: ResponsePlan = {
      ...plan,
      status:      'applied',
      healthBefore: hb,
      healthAfter:  ha,
      actions:     plan.actions.map(a => ({ ...a, status: 'applied' as const })),
    };

    setResponsePlan(appliedPlan);
    applyToStore(updatedZones);
    setHealthBefore(hb);
    setHealthAfter(ha);
    setPreviewing(false);
  }

  const pendingCount   = plan.actions.filter(a => a.status === 'pending').length;
  const appliedCount   = plan.actions.filter(a => a.status === 'applied').length;
  const isFullyApplied = plan.status === 'applied';

  return (
    <div className="flex flex-col gap-4">
      {/* Health impact transition */}
      {(healthBefore !== undefined && healthAfter !== undefined) && (
        <Card className="!p-5 border-inkSoft border-2" role="status" aria-live="polite">
          <p className="text-[11px] font-medium uppercase tracking-widest text-midGray mb-3">
            {isFullyApplied ? 'Response Applied · Health Impact' : previewing ? 'Previewing Projected Health Impact' : 'Projected Health Impact'}
          </p>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-widest text-midGray mb-1">Before</p>
              <p
                className={'text-5xl font-semibold leading-none ' + (healthBefore < 60 ? 'text-ember' : 'text-ink')}
                aria-label={'Health before: ' + healthBefore}
              >
                {healthBefore}
              </p>
            </div>
            <div className="text-2xl text-midGray font-light" aria-hidden="true">&rarr;</div>
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-widest text-midGray mb-1">After Response</p>
              <p
                className={'text-5xl font-semibold leading-none ' + (healthAfter >= 75 ? 'text-ink' : healthAfter >= 60 ? 'text-ink' : 'text-ember')}
                aria-label={'Health after: ' + healthAfter}
              >
                {healthAfter}
              </p>
            </div>
            <div className="flex-1 text-right">
              <Badge variant={healthAfter > healthBefore ? 'solid' : 'outline'} className="text-xs">
                {healthAfter > healthBefore ? '+' + (healthAfter - healthBefore) + ' improvement' : 'Maintained'}
              </Badge>
            </div>
          </div>
        </Card>
      )}

      {/* Actions checklist */}
      <Card className="!p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-medium uppercase tracking-widest text-midGray">Response Actions</p>
          <div className="flex gap-2">
            <StatBlock label="Applied" value={appliedCount} size="sm" />
            <StatBlock label="Pending" value={pendingCount}  size="sm" />
          </div>
        </div>

        <ul className="flex flex-col divide-y divide-hairline" aria-label="Response plan actions">
          {plan.actions.map(action => (
            <li key={action.id} className="flex items-start gap-3 py-3">
              <div
                className={'mt-0.5 w-4 h-4 rounded flex items-center justify-center flex-shrink-0 text-xs ' + (action.status === 'applied' ? 'bg-inkSoft text-paper' : 'border border-hairline bg-canvas')}
                aria-hidden="true"
              >
                {action.status === 'applied' && <IconCheck className="w-3 h-3 text-paper" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={'text-sm ' + (action.status === 'applied' ? 'text-midGray line-through' : 'text-ink font-medium')}>
                  {action.label}
                </p>
                {action.targetZoneId && (
                  <p className="text-xs text-midGray mt-0.5">Target: {action.targetZoneId.replace(/-/g, ' ')}</p>
                )}
              </div>
              <Badge variant={action.status === 'applied' ? 'solid' : 'outline'} className="flex-shrink-0 capitalize text-xs">
                {action.status}
              </Badge>
            </li>
          ))}
        </ul>
      </Card>

      {/* Action buttons */}
      {!isFullyApplied && (
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handlePreview}
            aria-label="Preview projected health impact without applying"
          >
            Preview Response
          </Button>
          <Button
            fullWidth
            onClick={handleApply}
            aria-label="Apply response plan · this will update crowd levels and event health"
          >
            Apply Response Plan
          </Button>
        </div>
      )}

      {isFullyApplied && (
        <div className="bg-canvas rounded-nested px-4 py-3 text-sm text-ink font-medium text-center flex items-center justify-center gap-2 border border-hairline">
          <IconCheck className="w-4 h-4 text-ink" />
          <span>Response plan applied · crowd levels and event health updated</span>
        </div>
      )}
    </div>
  );
}
