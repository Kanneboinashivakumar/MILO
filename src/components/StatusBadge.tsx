import { Badge } from './Badge';
import type { CrowdStatus } from '../types';

interface StatusBadgeProps {
  status: CrowdStatus;
  pct?: number;
  className?: string;
}

const STATUS_CONFIG: Record<CrowdStatus, { label: string; variant: 'soft' | 'outline' | 'solid' | 'ember' }> = {
  low:      { label: 'LOW · calm',             variant: 'soft'    },
  moderate: { label: 'MODERATE · monitor',     variant: 'outline' },
  high:     { label: 'HIGH · attention',        variant: 'solid'   },
  critical: { label: 'CRITICAL · action required', variant: 'ember' },
};

export function StatusBadge({ status, pct, className = '' }: StatusBadgeProps) {
  const { label, variant } = STATUS_CONFIG[status];
  const text = pct !== undefined ? (label + ' · ' + pct + '%') : label;
  return (
    <Badge variant={variant} className={className}>
      {text}
    </Badge>
  );
}
