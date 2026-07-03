'use client';

import { useEffect } from 'react';

interface Entry {
  keys: string;
  label: string;
}

const NAVIGATION: Entry[] = [
  { keys: 'j / ↓', label: 'Move to next message' },
  { keys: 'k / ↑', label: 'Move to previous message' },
  { keys: 'Shift + j / ↓', label: 'Extend selection down' },
  { keys: 'Shift + k / ↑', label: 'Extend selection up' },
  { keys: 'Enter', label: 'Open focused message' },
];

const ACTIONS: Entry[] = [
  { keys: 'd', label: 'Defer 1 day' },
  { keys: 'f', label: 'Follow up in 3 days' },
  { keys: 's', label: 'Summarize (copy brief)' },
  { keys: 'Esc', label: 'Clear selection / close overlay' },
  { keys: '?', label: 'Toggle this help overlay' },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ShortcutHelpOverlay({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div
        className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Keyboard shortcuts</h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg px-2 py-1 text-xs text-[var(--text-muted)] transition hover:bg-[var(--border)]/40"
          >
            Esc
          </button>
        </div>

        <Section title="Navigation" entries={NAVIGATION} />
        <Section title="Triage actions" entries={ACTIONS} className="mt-4" />

        <p className="mt-4 text-[11px] text-[var(--text-muted)]">
          Actions run on all selected messages. With no selection, they act on the focused message.
          Shortcuts are disabled while typing in a text field.
        </p>
      </div>
    </div>
  );
}

function Section({
  title,
  entries,
  className = '',
}: {
  title: string;
  entries: Entry[];
  className?: string;
}) {
  return (
    <div className={className}>
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        {title}
      </h3>
      <ul className="space-y-1.5">
        {entries.map((entry) => (
          <li key={entry.keys} className="flex items-center justify-between gap-3 text-xs">
            <span className="text-[var(--text-muted)]">{entry.label}</span>
            <kbd className="shrink-0 rounded border border-[var(--border)] bg-[var(--border)]/30 px-1.5 py-0.5 font-mono text-[10px]">
              {entry.keys}
            </kbd>
          </li>
        ))}
      </ul>
    </div>
  );
}
