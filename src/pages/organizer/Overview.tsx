import { useEventStore } from '../../store/useEventStore';
import { Card } from '../../components/Card';
import { StatBlock } from '../../components/StatBlock';
import { StatusBadge } from '../../components/StatusBadge';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { useNavigate } from 'react-router-dom';

export function OverviewPage() {
  const eventState   = useEventStore(s => s.eventState);
  const zones        = useEventStore(s => s.zones);
  const crowdStates  = useEventStore(s => s.crowdStates);
  const alerts       = useEventStore(s => s.alerts);
  const incidents    = useEventStore(s => s.incidents);
  const responsePlan = useEventStore(s => s.responsePlan);
  const navigate     = useNavigate();

  const criticalZones   = crowdStates.filter(cs => cs.status === 'critical');
  const highZones       = crowdStates.filter(cs => cs.status === 'high');
  const activeAlerts    = alerts.filter(a => !a.acknowledged);
  const activeIncidents = incidents.filter(i => i.active);

  const crowdFlow     = Math.max(0, 100 - criticalZones.length * 20 - highZones.length * 8);
  const safety        = Math.max(0, 100 - activeIncidents.length * 25);
  const accessibility = Math.round((zones.filter(z => z.hasAccessibleRoute).length / zones.length) * 100);
  const sessionHealth = 100;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Command Center</h1>
        <p className="text-sm text-midGray mt-0.5">{eventState.name} &middot; Simulated Event Data</p>
      </div>

      <Card>
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-midGray mb-1">Event Health Score</p>
            <div className="flex items-end gap-2">
              <span
                className={'text-6xl font-semibold leading-none tracking-tight ' + (eventState.health < 50 ? 'text-ember' : 'text-ink')}
                aria-label={'Event health score: ' + eventState.health + ' out of 100'}
              >
                {eventState.health}
              </span>
              <span className="text-xl text-midGray mb-1 font-medium">/ 100</span>
            </div>
            {eventState.health < 60 && (
              <p className="text-xs text-ember font-medium mt-1">CRITICAL · Immediate intervention recommended</p>
            )}
            {eventState.health >= 60 && eventState.health < 75 && (
              <p className="text-xs text-midGray mt-1 font-medium">MODERATE · Active monitoring advised</p>
            )}
            {eventState.health >= 75 && (
              <p className="text-xs text-midGray mt-1 font-medium">GOOD · Venue running smoothly</p>
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/organizer/event-twin')}
            aria-label="Open Event Twin to simulate scenarios"
          >
            Open Event Twin &rarr;
          </Button>
        </div>

        <div className="mt-5 pt-4 border-t border-hairline grid grid-cols-4 gap-4">
          <StatBlock label="Crowd Flow" value={Math.round(crowdFlow) + '%'} size="sm" />
          <StatBlock label="Safety"     value={Math.round(safety) + '%'}     size="sm" />
          <StatBlock label="Access"     value={accessibility + '%'}          size="sm" />
          <StatBlock label="Sessions"   value={sessionHealth + '%'}          size="sm" />
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Card className="!p-4">
          <p className="text-[11px] font-medium uppercase tracking-widest text-midGray mb-3">Critical Zones</p>
          {criticalZones.length === 0 ? (
            <p className="text-sm text-midGray">None &middot; All zones within safe limits</p>
          ) : (
            <ul className="flex flex-col gap-2" aria-label="Critical zones list">
              {criticalZones.map(cs => {
                const zone = zones.find(z => z.id === cs.zoneId);
                return (
                  <li key={cs.zoneId} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-ink font-medium truncate">{zone?.name ?? cs.zoneId}</span>
                    <StatusBadge status={cs.status} pct={cs.utilizationPct} />
                  </li>
                );
              })}
              {highZones.slice(0, 2).map(cs => {
                const zone = zones.find(z => z.id === cs.zoneId);
                return (
                  <li key={cs.zoneId} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-ink truncate">{zone?.name ?? cs.zoneId}</span>
                    <StatusBadge status={cs.status} pct={cs.utilizationPct} />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="!p-4">
          <p className="text-[11px] font-medium uppercase tracking-widest text-midGray mb-3">Active Alerts</p>
          {activeAlerts.length === 0 && activeIncidents.length === 0 ? (
            <p className="text-sm text-midGray">No active alerts</p>
          ) : (
            <ul className="flex flex-col gap-2" aria-label="Active alerts list">
              {activeIncidents.map(inc => (
                <li key={inc.id} className="text-sm">
                  <Badge variant="ember" className="mb-1">INCIDENT</Badge>
                  <p className="text-ink text-xs mt-0.5">{inc.description}</p>
                </li>
              ))}
              {activeAlerts.slice(0, 3).map(alert => (
                <li key={alert.id} className="text-xs text-ink border-b border-hairline pb-1.5 last:border-0">
                  <StatusBadge status={alert.severity} className="mb-0.5" />
                  <p className="text-midGray mt-0.5 text-xs">{alert.message}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="!p-4">
          <p className="text-[11px] font-medium uppercase tracking-widest text-midGray mb-3">Response Status</p>
          {!responsePlan ? (
            <div>
              <p className="text-sm text-midGray mb-3">No active response plan.</p>
              <Button
                variant="outline"
                className="!text-xs w-full"
                onClick={() => navigate('/organizer/event-twin')}
                aria-label="Create response plan via Event Twin"
              >
                Create Response Plan
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Badge variant={responsePlan.status === 'applied' ? 'solid' : 'outline'}>
                  {responsePlan.status === 'applied' ? 'APPLIED' : 'DRAFT'}
                </Badge>
                <span className="text-xs text-midGray">{responsePlan.actions.length} actions</span>
              </div>
              <div className="flex gap-3 mt-1">
                <StatBlock label="Applied" value={responsePlan.actions.filter(a => a.status === 'applied').length} size="sm" />
                <StatBlock label="Pending" value={responsePlan.actions.filter(a => a.status === 'pending').length} size="sm" />
              </div>
              {responsePlan.healthBefore !== undefined && responsePlan.healthAfter !== undefined && (
                <div className="mt-2 p-2 bg-canvas rounded-nested text-xs text-ink font-medium">
                  Health: {responsePlan.healthBefore} &rarr; {responsePlan.healthAfter}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      <Card className="!p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-medium uppercase tracking-widest text-midGray">Live Crowd Status</p>
          <Button
            variant="ghost"
            className="!text-xs !py-1 !px-2"
            onClick={() => navigate('/organizer/live-venue')}
            aria-label="Open full live venue view"
          >
            Full View &rarr;
          </Button>
        </div>
        <table className="w-full text-sm" aria-label="Zone crowd status">
          <thead>
            <tr className="border-b border-hairline">
              <th scope="col" className="text-left text-[10px] uppercase tracking-widest text-midGray py-2 font-medium">Zone</th>
              <th scope="col" className="text-right text-[10px] uppercase tracking-widest text-midGray py-2 font-medium">Crowd</th>
              <th scope="col" className="text-right text-[10px] uppercase tracking-widest text-midGray py-2 font-medium">Status</th>
              <th scope="col" className="text-right text-[10px] uppercase tracking-widest text-midGray py-2 font-medium">Trend</th>
            </tr>
          </thead>
          <tbody>
            {crowdStates
              .slice()
              .sort((a, b) => b.utilizationPct - a.utilizationPct)
              .slice(0, 8)
              .map(cs => {
                const zone = zones.find(z => z.id === cs.zoneId);
                return (
                  <tr key={cs.zoneId} className="border-b border-hairline last:border-0">
                    <td className="py-2 text-ink font-medium">{zone?.name ?? cs.zoneId}</td>
                    <td className="py-2 text-right text-ink font-semibold">{cs.utilizationPct}%</td>
                    <td className="py-2 text-right">
                      <StatusBadge status={cs.status} />
                    </td>
                    <td className="py-2 text-right text-midGray capitalize">{cs.trend}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
