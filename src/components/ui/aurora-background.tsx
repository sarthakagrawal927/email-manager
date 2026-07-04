'use client';

import { motion } from 'framer-motion';

import { cn } from '@/lib/utils';

export function AuroraBackground({ className }: { className?: string }) {
  return (
    <div
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      aria-hidden
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--accent-soft),transparent_50%)]" />
      <motion.div
        className="absolute -left-1/4 top-0 h-[520px] w-[520px] rounded-full bg-[var(--accent)] opacity-[0.12] blur-[120px]"
        animate={{ x: [0, 80, 0], y: [0, 40, 0] }}
        transition={{ duration: 18, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -right-1/4 top-1/4 h-[480px] w-[480px] rounded-full bg-[oklch(0.55_0.15_300)] opacity-[0.1] blur-[100px]"
        animate={{ x: [0, -60, 0], y: [0, 30, 0] }}
        transition={{ duration: 22, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklch,var(--border)_40%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--border)_40%,transparent)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)] opacity-40" />
    </div>
  );
}
