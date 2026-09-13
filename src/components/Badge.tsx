
type BadgeVariant = 'solid' | 'soft' | 'outline' | 'ember';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  solid:   'bg-inkSoft text-paper',
  soft:    'bg-canvas text-inkSoft',
  outline: 'border border-hairline text-ink bg-paper',
  ember:   'border border-ember text-ember bg-paper',
};

export function Badge({ children, variant = 'soft', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-pill px-3 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}
