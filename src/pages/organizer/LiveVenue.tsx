import { useEventStore } from '../../store/useEventStore';
import { Card } from '../../components/Card';
import { StatusBadge } from '../../components/StatusBadge';
import { MAP_LAYOUT, MAP_VIEWBOX } from '../../data/mapLayout';
import type { CrowdStatus } from '../../types';

const STATUS_FILL: Record<CrowdStatus, string> = {
  low:      '#f5f5f5',
  moderate: '#e5e5e5',
  high:     '#171717',
  critical: '#e7000b',
};
const STATUS_TEXT: Record<CrowdStatus, string> = {
  low:      '#737373',
  moderate: '#0a0a0a',
  high:     '#fafafa',
  critical: '#ffffff',
};

const TREND_LABEL: Record<string, string> = {
  rising:  'Rising ?',
  falling: 'Falling ?',
  stable:  'Stable ?',
};

export function LiveVenuePage() {
  const zones       = useEventStore(s => s.zones);
  const crowdStates = useEventStore(s => s.crowdStates);
  const crowdMap    = new Map(crowdStates.map(cs => [cs.zoneId, cs]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Live Venue</h1>
        <p className="text-sm text-midGray mt-0.5">Real-time crowd state across all zones &middot; Simulated Event Data</p>
      </div>

            <Card className="!p-4 shadow-card border-hairline border">
        <svg
          viewBox={MAP_VIEWBOX}
          className="w-full"
          role="img"
          aria-label="Venue map showing crowd levels per zone"
          style={{ maxHeight: '42vh' }}
        >
          {MAP_LAYOUT.map(layout => {
            const cs       = crowdMap.get(layout.id);
            const status   = cs?.status ?? 'low';
            const pct      = cs?.utilizationPct ?? 0;
            const fill     = STATUS_FILL[status];
            const textC    = STATUS_TEXT[status];

            return (
              <g key={layout.id} aria-label={layout.displayName + ': ' + pct + '% crowd, ' + status + ' status'}>
                <rect
                  x={layout.x} y={layout.y}
                  width={layout.width} height={layout.height}
                  rx={12} fill={fill} stroke={status === 'critical' ? '#dc2626' : status === 'high' ? '#0a0a0a' : '#d4d4d4'} strokeWidth={1.5}
                />
                <text
                  x={layout.x + 12}
                  y={layout.y + (layout.height > 80 ? 24 : 20)}
                  fontSize={12}
                  style={{ pointerEvents: 'none' }}
                  aria-hidden="true"
                >
                  {layout.icon}
                </text>
                <text
                  x={layout.labelX} y={layout.labelY - (layout.height > 80 ? 8 : 2)}
                  textAnchor="middle" fontSize={layout.width > 160 ? 12 : 11} fontWeight={700} fill={textC}
                  style={{ fontFamily: 'Inter, system-ui, sans-serif', pointerEvents: 'none' }}
                  aria-hidden="true"
                >
                  {layout.displayName}
                </text>
                <text
                  x={layout.labelX} y={layout.labelY + (layout.height > 80 ? 10 : 12)}
                  textAnchor="middle" fontSize={9} fontWeight={500} fill={textC} opacity={0.8}
                  style={{ fontFamily: 'Inter, system-ui, sans-serif', pointerEvents: 'none' }}
                  aria-hidden="true"
                >
                  {layout.subtitle}
                </text>
                <g style={{ pointerEvents: 'none' }}>
                  <rect
                    x={layout.x + layout.width - 52}
                    y={layout.y + layout.height - 22}
                    width={44}
                    height={16}
                    rx={8}
                    fill={status === 'high' ? '#404040' : '#ffffff'}
                    stroke={status === 'critical' ? '#dc2626' : '#d4d4d4'}
                    strokeWidth={1}
                  />
                  <text
                    x={layout.x + layout.width - 30}
                    y={layout.y + layout.height - 10}
                    textAnchor="middle" fontSize={9} fontWeight={700} fill={textC}
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                    aria-hidden="true"
                  >
                    {pct}%
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </Card>

      <Card className="!p-0 overflow-hidden">
        <table className="w-full text-sm" aria-label="Zone-by-zone crowd data">
          <thead>
            <tr className="border-b border-hairline bg-surfaceAlt">
              <th scope="col" className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-midGray font-medium">Zone</th>
              <th scope="col" className="text-right px-4 py-3 text-[10px] uppercase tracking-widest text-midGray font-medium">Crowd %</th>
              <th scope="col" className="text-right px-4 py-3 text-[10px] uppercase tracking-widest text-midGray font-medium">Capacity</th>
              <th scope="col" className="text-right px-4 py-3 text-[10px] uppercase tracking-widest text-midGray font-medium">Predicted</th>
              <th scope="col" className="text-center px-4 py-3 text-[10px] uppercase tracking-widest text-midGray font-medium">Status</th>
              <th scope="col" className="text-right px-4 py-3 text-[10px] uppercase tracking-widest text-midGray font-medium">Trend</th>
            </tr>
          </thead>
          <tbody>
            {crowdStates
              .slice()
              .sort((a, b) => b.utilizationPct - a.utilizationPct)
              .map(cs => {
                const zone = zones.find(z => z.id === cs.zoneId);
                return (
                  <tr key={cs.zoneId} className="border-b border-hairline last:border-0 hover:bg-surfaceAlt transition-colors">
                    <td className="px-4 py-3 font-medium text-ink">{zone?.name ?? cs.zoneId}</td>
                    <td className="px-4 py-3 text-right text-ink font-semibold">{cs.utilizationPct}%</td>
                    <td className="px-4 py-3 text-right text-midGray">{zone?.capacity ?? ' · '}</td>
                    <td className="px-4 py-3 text-right text-midGray">{cs.predictedPct}%</td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={cs.status} />
                    </td>
                    <td className="px-4 py-3 text-right text-midGray text-xs">{TREND_LABEL[cs.trend] ?? cs.trend}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
