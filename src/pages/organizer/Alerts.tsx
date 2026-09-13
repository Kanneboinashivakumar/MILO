import { useState } from 'react';
import { useEventStore } from '../../store/useEventStore';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { StatusBadge } from '../../components/StatusBadge';
import type { Alert } from '../../types';

export function AlertsPage() {
  const alerts           = useEventStore(s => s.alerts);
  const incidents        = useEventStore(s => s.incidents);
  const acknowledgeAlert = useEventStore(s => s.acknowledgeAlert);
  const resolveIncident  = useEventStore(s => s.resolveIncident);
  const addAlert         = useEventStore(s => s.addAlert);

  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastType, setBroadcastType]       = useState<Alert['type']>('session');
  const [broadcastSeverity, setBroadcastSeverity] = useState<Alert['severity']>('moderate');
  const [broadcastSent, setBroadcastSent]       = useState(false);

  const activeAlerts   = alerts.filter(a => !a.acknowledged);
  const resolvedAlerts = alerts.filter(a => a.acknowledged);
  const activeIncidents = incidents.filter(i => i.active);

  function handleBroadcast(e: React.FormEvent) {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;

    addAlert({
      id: `alert-manual-${Date.now()}`,
      type: broadcastType,
      severity: broadcastSeverity,
      message: broadcastMessage.trim(),
      timestamp: new Date().toISOString(),
      acknowledged: false,
    });

    setBroadcastMessage('');
    setBroadcastSent(true);
    setTimeout(() => setBroadcastSent(false), 2500);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Alerts &amp; Real-Time Broadcasts</h1>
        <p className="text-sm text-midGray mt-0.5">
          {activeAlerts.length} active alerts &middot; {incidents.length} incidents recorded &middot; Instant live attendee dispatch
        </p>
      </div>

      {/* Broadcast Announcement Form */}
      <Card className="!p-5 bg-paper border border-hairline shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-base" role="img" aria-hidden="true">📢</span>
            <h2 className="text-sm font-semibold text-ink">Broadcast Real-Time Announcement</h2>
          </div>
          {broadcastSent && (
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-pill animate-fade-in">
              Broadcasted to Attendees ✓
            </span>
          )}
        </div>
        <form onSubmit={handleBroadcast} className="flex flex-col gap-3">
          <input
            type="text"
            value={broadcastMessage}
            onChange={e => setBroadcastMessage(e.target.value)}
            placeholder="e.g. Lunch is now open in Food Court North · Accessible seating reserved"
            className="w-full text-xs px-3 py-2 rounded-nested border border-hairline bg-canvas focus:outline-none focus:border-accent text-ink placeholder:text-midGray"
            aria-label="Broadcast announcement message"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="broadcast-category" className="text-xs text-midGray">Category:</label>
              <select
                id="broadcast-category"
                value={broadcastType}
                onChange={e => setBroadcastType(e.target.value as Alert['type'])}
                className="text-xs px-2 py-1 rounded border border-hairline bg-canvas text-ink"
              >
                <option value="session">Session / Schedule</option>
                <option value="crowd">Crowd Coordination</option>
                <option value="route">Route Advisory</option>
                <option value="accessibility">Accessibility</option>
                <option value="safety">Emergency / Safety</option>
              </select>

              <label htmlFor="broadcast-severity" className="text-xs text-midGray ml-2">Severity:</label>
              <select
                id="broadcast-severity"
                value={broadcastSeverity}
                onChange={e => setBroadcastSeverity(e.target.value as Alert['severity'])}
                className="text-xs px-2 py-1 rounded border border-hairline bg-canvas text-ink"
              >
                <option value="low">Low (Info)</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <Button
              type="submit"
              disabled={!broadcastMessage.trim()}
              className="!text-xs !px-4 !py-1.5"
            >
              Broadcast to Attendees &rarr;
            </Button>
          </div>
        </form>
      </Card>

      {activeIncidents.length > 0 && (
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-midGray mb-3">Active Incidents</p>
          <div className="flex flex-col gap-3">
            {activeIncidents.map(incident => (
              <Card key={incident.id} className="!p-4 border-ember border-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Badge variant="ember" className="mb-2 uppercase">INCIDENT · {incident.type}</Badge>
                    <p className="text-sm font-semibold text-ink">{incident.description}</p>
                    <p className="text-xs text-midGray mt-1">Zone: {incident.zoneId.replace(/-/g, ' ')}</p>
                    <p className="text-xs text-midGray">{new Date(incident.timestamp).toLocaleTimeString()}</p>
                  </div>
                  <Button
                    variant="outline"
                    className="!text-xs !px-3 !py-1.5 flex-shrink-0"
                    onClick={() => resolveIncident(incident.id)}
                    aria-label={'Resolve incident: ' + incident.description}
                  >
                    Resolve &amp; Unblock
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-[11px] font-medium uppercase tracking-widest text-midGray mb-3">
          Active Alerts {activeAlerts.length > 0 && '(' + activeAlerts.length + ')'}
        </p>
        {activeAlerts.length === 0 ? (
          <Card className="!p-4 text-center">
            <p className="text-sm text-midGray">No active alerts · event running normally.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {activeAlerts.map(alert => (
              <Card key={alert.id} className="!p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <StatusBadge status={alert.severity} />
                      <Badge variant="outline" className="!text-[10px] capitalize">{alert.type}</Badge>
                    </div>
                    <p className="text-sm text-ink font-medium">{alert.message}</p>
                    <p className="text-xs text-midGray mt-1">{new Date(alert.timestamp).toLocaleTimeString()}</p>
                  </div>
                  <Button
                    variant="ghost"
                    className="!text-xs !px-3 !py-1.5 flex-shrink-0 text-midGray hover:text-ink"
                    onClick={() => acknowledgeAlert(alert.id)}
                    aria-label={'Acknowledge alert: ' + alert.message}
                  >
                    Acknowledge
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {resolvedAlerts.length > 0 && (
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-midGray mb-3">
            Acknowledged ({resolvedAlerts.length})
          </p>
          <div className="flex flex-col gap-2">
            {resolvedAlerts.map(alert => (
              <div key={alert.id} className="flex items-center justify-between px-4 py-3 bg-surfaceAlt rounded-nested border border-hairline opacity-60">
                <div>
                  <p className="text-xs text-ink">{alert.message}</p>
                  <p className="text-[10px] text-midGray">{new Date(alert.timestamp).toLocaleTimeString()}</p>
                </div>
                <Badge variant="soft" className="!text-[10px]">Acknowledged</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {alerts.length === 0 && incidents.length === 0 && (
        <Card className="!p-8 text-center">
          <p className="text-base font-semibold text-ink mb-1">All clear</p>
          <p className="text-sm text-midGray">No alerts or incidents recorded.</p>
        </Card>
      )}

      <p className="text-[10px] text-midGray text-center pb-2">Simulated Event Data</p>
    </div>
  );
}
