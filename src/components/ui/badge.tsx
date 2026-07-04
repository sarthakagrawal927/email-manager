import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[var(--accent)]/12 text-[var(--accent)]',
        secondary: 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-muted)]',
        outline: 'border-[var(--border)] text-[var(--text-muted)]',
        destructive: 'border-transparent bg-[var(--danger)]/12 text-[var(--danger)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
