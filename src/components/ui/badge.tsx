import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[var(--accent-soft)] text-[var(--accent)]',
        secondary: 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text)]',
        outline: 'border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-muted)]',
        destructive:
          'border-[var(--danger)]/30 bg-[var(--danger)]/18 text-[var(--danger)] font-semibold',
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
