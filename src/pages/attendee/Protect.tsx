import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { useEventStore } from '../../store/useEventStore';
import { getNearestFacility, findSafeRoute } from '../../engine/safetyEngine';
import type { Facility } from '../../types';

const FACILITY_TYPES: Array<{ type: Facility['type']; label: string }> = [
  { type: 'security', label: 'Security' },
  { type: 'firstAid', label: 'First Aid' },
  { type: 'exit',     label: 'Emergency Exit' },
];

export function ProtectPage() {
  const navigate       = useNavigate();
  const zones          = useEventStore(s => s.zones);
  const attendee       = useEventStore(s => s.attendee);
  const incidents      = useEventStore(s => s.incidents);
  const crowdStates    = useEventStore(s => s.crowdStates);
  const setHighlighted = useEventStore(s => s.setHighlightedRoute);
  const setSelectedZone = useEventStore(s => s.setSelectedZone);

  const activeIncident = incidents.find(i => i.active);
  const activeIncidentZone = activeIncident?.zoneId ?? null;
  const blockedZones = activeIncidentZone ? [activeIncidentZone] : [];

  const nearestFacilities = FACILITY_TYPES.map(ft => {
    const result = getNearestFacility(attendee.currentZoneId, ft.type, zones, attendee.accessibilityProfile, blockedZones);
    return { ...ft, result };
  });

  const safeRoute = activeIncidentZone
    ? findSafeRoute(attendee.currentZoneId, activeIncidentZone, zones, attendee.accessibilityProfile)
    : null;

  function handleNavigateFacility(facilityType: Facility['type']) {
    const facility = nearestFacilities.find(f => f.type === facilityType);
    if (!facility?.result) return;
    const targetZoneId = facility.result.zoneId;

    const route = findSafeRoute(
      attendee.currentZoneId,
      activeIncidentZone ?? '__none__',
      zones,
      attendee.accessibilityProfile,
      targetZoneId,
      blockedZones
    );

    if (route) {
      setHighlighted(route.zoneIds);
      setSelectedZone(targetZoneId);
      navigate('/attendee/map');
    }
  }

  function handleShowSafeRoute() {
    if (safeRoute) {
      setHighlighted(safeRoute.zoneIds);
      if (safeRoute.zoneIds.length > 0) {
        setSelectedZone(safeRoute.zoneIds[safeRoute.zoneIds.length - 1]!);
      }
      navigate('/attendee/map');
    }
  }

  const currentZone  = zones.find(z => z.id === attendee.currentZoneId);
  const currentCrowd = crowdStates.find(cs => cs.zoneId === attendee.currentZoneId);

  return (
    <div className="p-4 flex flex-col gap-5 pb-8">
      <div className="bg-ember rounded-card p-5 text-paper" role="alert" aria-live="assertive">
        <p className="text-[11px] font-medium uppercase tracking-widest mb-1 opacity-75">MILO Protect</p>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Emergency &amp; Safety</h1>
        <p className="text-sm opacity-90">
          {activeIncidentZone
            ? 'Active incident in ' + activeIncidentZone.replace(/-/g, ' ') + '. Hazard zone is automatically avoided.'
            : 'Immediate access to on-site security, medical assistance, and step-free evacuation routes.'}
        </p>
        <p className="text-xs mt-3 opacity-60">Demo Simulation · Not connected to real 911 dispatch</p>
      </div>

      <Card className="!p-4">
        <p className="text-[11px] font-medium uppercase tracking-widest text-midGray mb-2">Your Current Location</p>
        <p className="text-base font-semibold text-ink mb-1">{currentZone?.name ?? attendee.currentZoneId}</p>
        {currentCrowd && <StatusBadge status={currentCrowd.status} pct={currentCrowd.utilizationPct} />}
      </Card>

      {safeRoute && (
        <Card className="!p-4 border-inkSoft border-2 bg-paper">
          <p className="text-[11px] font-medium uppercase tracking-widest text-midGray mb-2">Calculated Safe Detour</p>
          <p className="text-sm text-ink mb-1 font-semibold">
            Avoids incident hazard &middot; {safeRoute.walkMinutes} min walk &middot; {safeRoute.zoneIds.length - 1} hops
          </p>
          {safeRoute.isAccessible && (
            <p className="text-xs text-green-700 font-medium">✓ Step-free evacuation path confirmed</p>
          )}
          <Button
            className="mt-3 w-full"
            onClick={handleShowSafeRoute}
            aria-label="Show safe evacuation route on map"
          >
            Show Safe Route on Map &rarr;
          </Button>
        </Card>
      )}

      {/* Emergency Contacts & Direct Hotlines */}
      <Card className="!p-4 border-l-4 border-l-ember">
        <p className="text-[11px] font-medium uppercase tracking-widest text-midGray mb-2">Emergency Hotlines &amp; Contacts</p>
        <div className="flex flex-col gap-2 text-xs">
          <div className="flex items-center justify-between py-1 border-b border-hairline">
            <span className="font-semibold text-ink">🚨 On-Site Security Dispatch</span>
            <span className="font-mono text-inkSoft font-bold">Ext. 911 / (800) 555-MILO</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-hairline">
            <span className="font-semibold text-ink">🩺 Medical Response Team</span>
            <span className="font-mono text-inkSoft font-bold">Ext. 404 (First Aid Pod)</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="font-semibold text-ink">ℹ️ Venue Help Desk</span>
            <span className="font-mono text-inkSoft font-bold">Ext. 101 (Central Info)</span>
          </div>
        </div>
      </Card>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-widest text-midGray mb-2">Nearest Safety Points</p>
        <div className="flex flex-col gap-3">
          {nearestFacilities.map(({ type, label, result }) => (
            <Card key={type} className="!p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">{label}</p>
                  {result ? (
                    <p className="text-xs text-midGray font-medium">{result.facility.name} &middot; {result.walkMinutes} min walk</p>
                  ) : (
                    <p className="text-xs text-midGray">Temporarily unreachable via safe routes</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  className="!text-xs !px-3 !py-1.5 flex-shrink-0 font-medium"
                  disabled={!result}
                  onClick={() => handleNavigateFacility(type)}
                  aria-label={'Navigate to nearest ' + label}
                >
                  Navigate &rarr;
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3" role="group" aria-label="Immediate emergency actions">
        <Button
          className="!bg-ember !text-paper !py-4 !text-base shadow-sm"
          fullWidth
          onClick={() => handleNavigateFacility('security')}
          aria-label="Call Security · Navigate to nearest Security station"
        >
          Call Security Point
        </Button>
        <Button
          variant="outline"
          className="!py-4 !text-base"
          fullWidth
          onClick={() => handleNavigateFacility('firstAid')}
          aria-label="Navigate to nearest First Aid station"
        >
          Navigate to First Aid
        </Button>
        <Button
          variant="outline"
          className="!py-4 !text-base"
          fullWidth
          onClick={() => handleNavigateFacility('exit')}
          aria-label="Navigate to nearest Emergency Exit"
        >
          Navigate to Emergency Exit
        </Button>
      </div>

      {attendee.accessibilityProfile.avoidStairs && (
        <div className="bg-canvas rounded-nested px-4 py-3 text-xs text-ink font-medium border border-hairline">
          ✓ All emergency routes are calculated to strictly exclude stairways per your accessibility profile.
        </div>
      )}

      <p className="text-[10px] text-midGray text-center">
        Simulated Event Data · In a physical deployment, MILO interfaces with venue dispatch
      </p>
    </div>
  );
}
