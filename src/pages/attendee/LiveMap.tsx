import { memo, useState } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { Badge } from '../../components/Badge';
import { useEventStore } from '../../store/useEventStore';
import { MAP_LAYOUT, MAP_VIEWBOX, type ZoneLayout } from '../../data/mapLayout';
import { findRoute } from '../../engine/routingEngine';
import type { CrowdStatus } from '../../types';

const STATUS_FILL: Record<CrowdStatus, string> = {
  low:      '#f0fdf4', // soft green tint
  moderate: '#fefce8', // soft amber tint
  high:     '#262626', // dark ink
  critical: '#fef2f2', // soft red tint
};
const STATUS_BORDER: Record<CrowdStatus, string> = {
  low:      '#86efac',
  moderate: '#fde047',
  high:     '#0a0a0a',
  critical: '#dc2626',
};
const STATUS_TEXT: Record<CrowdStatus, string> = {
  low:      '#166534',
  moderate: '#854d0e',
  high:     '#fafafa',
  critical: '#991b1b',
};

const ZoneShape = memo(function ZoneShape({
  layout,
  status,
  utilizationPct,
  isSelected,
  isHighlighted,
  isOnRoute,
  isCurrentLocation,
  onClick,
}: {
  layout: ZoneLayout;
  status: CrowdStatus;
  utilizationPct: number;
  isSelected: boolean;
  isHighlighted: boolean;
  isOnRoute: boolean;
  isCurrentLocation: boolean;
  onClick: () => void;
}) {
  const isHigh = status === 'high';
  const isCritical = status === 'critical';

  let fill = STATUS_FILL[status];
  let stroke = STATUS_BORDER[status];
  let strokeWidth = 1.5;

  if (isSelected) {
    fill = '#0a0a0a';
    stroke = '#0a0a0a';
    strokeWidth = 3;
  } else if (isOnRoute) {
    stroke = '#0a0a0a';
    strokeWidth = 2.5;
  } else if (isCurrentLocation) {
    stroke = '#2563eb';
    strokeWidth = 2.5;
  }

  const textColor = isSelected ? '#ffffff' : isHigh ? '#ffffff' : '#0a0a0a';
  const subColor = isSelected ? '#a3a3a3' : isHigh ? '#d4d4d4' : '#737373';
  const pillBg = isSelected ? '#262626' : isHigh ? '#404040' : STATUS_FILL[status];
  const pillText = isSelected ? '#ffffff' : STATUS_TEXT[status];
  const pillBorder = isSelected ? '#404040' : STATUS_BORDER[status];

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={layout.displayName + ': ' + utilizationPct + '% crowd, ' + status + ' status.'}
      onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }}}
      style={{ cursor: 'pointer' }}
    >
      {/* Base Room Box */}
      <rect
        x={layout.x}
        y={layout.y}
        width={layout.width}
        height={layout.height}
        rx={12}
        ry={12}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        opacity={isHighlighted || isSelected ? 1 : 0.95}
      />

      {/* Pulsing beacon if Current Location */}
      {isCurrentLocation && (
        <circle
          cx={layout.x + 14}
          cy={layout.y + 14}
          r={7}
          fill="#3b82f6"
          opacity={0.85}
        />
      )}

      {/* Room Icon & Type Tag */}
      <text
        x={layout.x + 12}
        y={layout.y + (layout.height > 80 ? 26 : 22)}
        fontSize={13}
        style={{ pointerEvents: 'none' }}
        aria-hidden="true"
      >
        {layout.icon}
      </text>

      {/* Full Room Display Name (Never abbreviated!) */}
      <text
        x={layout.labelX}
        y={layout.labelY - (layout.height > 80 ? 8 : 2)}
        textAnchor="middle"
        fontSize={layout.width > 160 ? 12 : 11}
        fontWeight={700}
        fill={textColor}
        style={{ fontFamily: 'Inter, system-ui, sans-serif', pointerEvents: 'none' }}
        aria-hidden="true"
      >
        {layout.displayName}
      </text>

      {/* Room Subtitle / Function */}
      <text
        x={layout.labelX}
        y={layout.labelY + (layout.height > 80 ? 10 : 12)}
        textAnchor="middle"
        fontSize={9}
        fontWeight={500}
        fill={subColor}
        style={{ fontFamily: 'Inter, system-ui, sans-serif', pointerEvents: 'none' }}
        aria-hidden="true"
      >
        {layout.subtitle}
      </text>

      {/* Crowd Status Pill inside Room */}
      <g style={{ pointerEvents: 'none' }}>
        <rect
          x={layout.x + layout.width - 56}
          y={layout.y + layout.height - 22}
          width={48}
          height={16}
          rx={8}
          fill={pillBg}
          stroke={pillBorder}
          strokeWidth={1}
        />
        <text
          x={layout.x + layout.width - 32}
          y={layout.y + layout.height - 10}
          textAnchor="middle"
          fontSize={9}
          fontWeight={700}
          fill={pillText}
          style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
          aria-hidden="true"
        >
          {utilizationPct}%
        </text>
      </g>
    </g>
  );
});

export function LiveMapPage() {
  const zones            = useEventStore(s => s.zones);
  const crowdStates      = useEventStore(s => s.crowdStates);
  const sessions         = useEventStore(s => s.sessions);
  const attendee         = useEventStore(s => s.attendee);
  const itinerary        = useEventStore(s => s.itinerary);
  const highlightedRoute = useEventStore(s => s.highlightedRouteZoneIds);
  const setHighlighted   = useEventStore(s => s.setHighlightedRoute);
  const selectedZoneId   = useEventStore(s => s.selectedZoneId);
  const setSelectedZone  = useEventStore(s => s.setSelectedZone);

  const [activeFilter, setActiveFilter] = useState<'all' | 'stages' | 'facilities'>('all');

  const crowdMap = new Map(crowdStates.map(cs => [cs.zoneId, cs]));

  const selectedZone   = zones.find(z => z.id === selectedZoneId);
  const selectedCrowd  = selectedZoneId ? crowdMap.get(selectedZoneId) : undefined;
  const zoneSessions   = sessions.filter(s => s.zoneId === selectedZoneId && !s.isCancelled);

  function handleZoneClick(zoneId: string) {
    setSelectedZone(zoneId === selectedZoneId ? null : zoneId);
  }

  function handleRouteHere() {
    if (!selectedZoneId) return;
    const route = findRoute(attendee.currentZoneId, selectedZoneId, zones, attendee.accessibilityProfile);
    if (route) setHighlighted(route.zoneIds);
  }

  function handleClearRoute() {
    setHighlighted([]);
  }

  function getZoneCenter(id: string) {
    const l = MAP_LAYOUT.find(z => z.id === id);
    return l ? { x: l.x + l.width / 2, y: l.y + l.height / 2 } : null;
  }

  const routeSegments: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  for (let i = 0; i < highlightedRoute.length - 1; i++) {
    const a = getZoneCenter(highlightedRoute[i]!);
    const b = getZoneCenter(highlightedRoute[i + 1]!);
    if (a && b) routeSegments.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
  }

  const itinZoneIds = new Set(
    itinerary?.items.flatMap(item => item.routeZoneIds) ?? []
  );

  const filteredLayout = MAP_LAYOUT.filter(z => {
    if (activeFilter === 'stages') return z.category === 'stage';
    if (activeFilter === 'facilities') return z.category === 'facility' || z.category === 'entry';
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-canvas pb-6">
      {/* Map header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight text-ink">Interactive Venue Map</h1>
          <div className="flex items-center gap-1.5 text-xs text-midGray font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse inline-block" />
            <span>You are at {zones.find(z => z.id === attendee.currentZoneId)?.name ?? attendee.currentZoneId}</span>
          </div>
        </div>
        <p className="text-xs text-midGray mt-0.5">Real-time crowd flow, clear room names, and step-free guidance</p>
      </div>

      {/* Category filter tabs */}
      <div className="px-4 pb-2.5 flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex gap-1.5">
          {(['all', 'stages', 'facilities'] as const).map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={'text-xs font-semibold px-3 py-1 rounded-pill border transition-colors ' + (
                activeFilter === f
                  ? 'bg-ink text-paper border-ink'
                  : 'bg-paper text-ink border-hairline hover:bg-canvas'
              )}
            >
              {f === 'all' ? 'All Rooms' : f === 'stages' ? 'Key Stages' : 'Facilities & Help'}
            </button>
          ))}
        </div>
        {highlightedRoute.length > 0 && (
          <button
            onClick={handleClearRoute}
            className="text-xs text-midGray hover:text-ink font-semibold px-2 py-1 rounded border border-hairline bg-paper"
          >
            Clear Route ✕
          </button>
        )}
      </div>

      {/* Active Route banner */}
      {highlightedRoute.length > 0 && (
        <div className="px-4 pb-2">
          <div className="bg-paper border border-inkSoft rounded-nested px-3 py-2 flex items-center justify-between text-xs text-ink shadow-sm">
            <div className="flex items-center gap-2">
              <span className="font-bold">📍 Active Route:</span>
              <span>{highlightedRoute.length - 1} hops ({highlightedRoute.length * 2} min walk)</span>
            </div>
            {attendee.accessibilityProfile.avoidStairs && (
              <span className="text-[10px] bg-canvas px-2 py-0.5 rounded font-semibold text-midGray">♿ Step-Free</span>
            )}
          </div>
        </div>
      )}

      {/* SVG Interactive Floor Plan */}
      <div className="px-4 pb-2" aria-label="Interactive venue floor plan" role="region">
        <div className="bg-paper border border-hairline rounded-card overflow-hidden shadow-card relative">
          <svg
            viewBox={MAP_VIEWBOX}
            className="w-full"
            role="img"
            aria-label="Interactive venue floor plan showing real-time crowd heatmap and indoor zones"
            style={{ maxHeight: '52vh' }}
          >
            {/* Route connecting lines with animated flow */}
            {routeSegments.map((seg, i) => (
              <g key={i}>
                <line
                  x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
                  stroke="#2563eb" strokeWidth={6} opacity={0.35}
                />
                <line
                  x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
                  stroke="#0a0a0a" strokeWidth={3} strokeDasharray="6,4"
                  className="animate-pulse"
                />
              </g>
            ))}

            {/* Room Boxes */}
            {MAP_LAYOUT.map(layout => {
              const cs = crowdMap.get(layout.id);
              const pct = cs?.utilizationPct ?? 0;
              const status = cs?.status ?? 'low';
              const isDimmed = activeFilter !== 'all' && !filteredLayout.some(fl => fl.id === layout.id);

              return (
                <g key={layout.id} opacity={isDimmed ? 0.3 : 1} style={{ transition: 'opacity 0.2s' }}>
                  <ZoneShape
                    layout={layout}
                    status={status}
                    utilizationPct={pct}
                    isSelected={layout.id === selectedZoneId}
                    isHighlighted={itinZoneIds.has(layout.id)}
                    isOnRoute={highlightedRoute.includes(layout.id)}
                    isCurrentLocation={attendee.currentZoneId === layout.id}
                    onClick={() => handleZoneClick(layout.id)}
                  />
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Status Legend */}
      <div className="px-4 pb-2 flex gap-4 flex-wrap" role="note" aria-label="Map status legend">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border border-emerald-300 bg-emerald-50" aria-hidden="true" />
          <span className="text-[11px] text-midGray font-medium">&lt;50% Calm</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border border-amber-300 bg-amber-50" aria-hidden="true" />
          <span className="text-[11px] text-midGray font-medium">50–75% Moderate</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border border-neutral-900 bg-neutral-900" aria-hidden="true" />
          <span className="text-[11px] text-midGray font-medium">75–90% High</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border border-red-600 bg-red-50" aria-hidden="true" />
          <span className="text-[11px] text-ember font-semibold">&gt;90% Critical</span>
        </div>
      </div>

      {/* Zone Detail Bottom Sheet */}
      {selectedZone && selectedCrowd && (
        <div className="px-4 pt-1">
          <Card className="!p-4 shadow-card border-inkSoft border">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-ink">{selectedZone.name}</h2>
                <p className="text-xs text-midGray">Capacity: {selectedZone.capacity} attendees · Trend: <strong className="capitalize">{selectedCrowd.trend}</strong></p>
              </div>
              <button
                onClick={() => setSelectedZone(null)}
                className="text-midGray hover:text-ink text-sm p-1.5 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
                aria-label="Close zone details"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <StatusBadge status={selectedCrowd.status} pct={selectedCrowd.utilizationPct} />
              {selectedZone.hasAccessibleRoute && (
                <Badge variant="soft" className="!text-[10px]">♿ Step-free route</Badge>
              )}
              {selectedZone.hasStairs && (
                <Badge variant="outline" className="!text-[10px]">Stairs present</Badge>
              )}
            </div>

            {/* Sessions in this room */}
            {zoneSessions.length > 0 && (
              <div className="mb-3.5 bg-canvas rounded-nested p-2.5">
                <p className="text-[10px] uppercase tracking-widest text-midGray mb-1 font-bold">Upcoming Sessions Here</p>
                <div className="flex flex-col gap-1">
                  {zoneSessions.map(s => (
                    <div key={s.id} className="flex items-center justify-between text-xs text-ink font-medium">
                      <span>{s.title}</span>
                      <span className="text-midGray">{s.startTime}–{s.endTime}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Facilities in this room */}
            {selectedZone.facilities.length > 0 && (
              <div className="mb-3.5 flex gap-1.5 flex-wrap">
                {selectedZone.facilities.map((f, i) => (
                  <Badge key={i} variant="outline" className="!text-[10px]">{f.name}</Badge>
                ))}
              </div>
            )}

            {/* Action button */}
            {attendee.currentZoneId === selectedZone.id ? (
              <div className="bg-canvas border border-hairline rounded-nested p-2.5 text-center text-xs font-semibold text-ink">
                📍 You are currently here
              </div>
            ) : (
              <Button
                variant="filled"
                fullWidth
                onClick={handleRouteHere}
                aria-label={'Route to ' + selectedZone.name}
              >
                Route from Your Location &rarr;
              </Button>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
