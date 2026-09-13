
interface StatBlockProps {
  label: string;
  value: string | number;
  size?: 'sm' | 'md' | 'lg' | 'display';
  className?: string;
}

const sizeClasses = {
  sm:      'text-2xl',
  md:      'text-3xl',
  lg:      'text-4xl',
  display: 'text-5xl',
};

export function StatBlock({ label, value, size = 'md', className = '' }: StatBlockProps) {
  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <span className="text-[11px] font-medium uppercase tracking-widest text-midGray">{label}</span>
      <span className={`${sizeClasses[size]} font-semibold text-ink leading-none tracking-tight`}>{value}</span>
    </div>
  );
}
