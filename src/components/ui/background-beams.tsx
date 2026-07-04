'use client';

import { motion } from 'framer-motion';

import { cn } from '@/lib/utils';

export function BackgroundBeams({ className }: { className?: string }) {
  const paths = [
    'M-380 -189C-380 -189 -312 216 152 343C616 470 684 875 684 875',
    'M-373 -197C-373 -197 -305 208 159 335C623 462 691 867 691 867',
    'M-366 -205C-366 -205 -298 200 166 327C630 454 698 859 698 859',
    'M-359 -213C-359 -213 -291 192 173 319C637 446 705 851 705 851',
  ];

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden [mask-image:radial-gradient(ellipse_at_center,black,transparent_78%)]',
        className
      )}
      aria-hidden
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,var(--accent)_0%,transparent_55%)] opacity-[0.08]" />
      <svg
        className="absolute inset-0 h-full w-full stroke-[var(--accent)]/20"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 696 316"
        fill="none"
      >
        {paths.map((path) => (
          <motion.path
            key={path}
            d={path}
            strokeWidth="0.8"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: [0.15, 0.45, 0.15] }}
            transition={{
              duration: 12,
              repeat: Number.POSITIVE_INFINITY,
              ease: 'easeInOut',
            }}
          />
        ))}
      </svg>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] opacity-[0.18]" />
    </div>
  );
}
