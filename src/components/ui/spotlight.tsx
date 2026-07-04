'use client';

import { motion } from 'framer-motion';

import { cn } from '@/lib/utils';

export function Spotlight({ className }: { className?: string }) {
  return (
    <motion.div
      aria-hidden
      className={cn(
        'pointer-events-none absolute -top-24 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-[var(--accent)] opacity-20 blur-[100px]',
        className
      )}
      animate={{ opacity: [0.12, 0.22, 0.12], scale: [0.95, 1.05, 0.95] }}
      transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
    />
  );
}
