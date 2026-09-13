
type ButtonVariant = 'filled' | 'ghost' | 'outline';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: React.ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  filled: 'bg-inkSoft text-paper hover:bg-ink focus-visible:bg-ink',
  ghost:  'bg-transparent text-ink hover:bg-canvas focus-visible:bg-canvas',
  outline:'bg-paper text-ink border border-hairline hover:bg-canvas focus-visible:bg-canvas',
};

export function Button({ variant = 'filled', children, fullWidth = false, className = '', disabled, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={[
        'rounded-pill px-5 py-2.5 text-sm font-medium transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
        variantClasses[variant],
        fullWidth ? 'w-full' : '',
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  );
}
