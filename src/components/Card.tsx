import { HTMLAttributes, ElementType, ReactNode } from 'react';

type CardProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  className?: string;
  as?: ElementType;
};

export function Card({ children, className = '', as: Tag = 'div', ...rest }: CardProps) {
  return (
    <Tag
      {...rest}
      className={`bg-paper rounded-card border border-hairline shadow-card p-5 ${className}`}
    >
      {children}
    </Tag>
  );
}