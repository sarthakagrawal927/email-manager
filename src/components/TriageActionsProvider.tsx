'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  buildActiveMap,
  countByState,
  latestRecord,
  loadRecords,
  runTriageAction,
  saveRecords,
  type TriageActionInput,
  type TriageActionKind,
  type TriageActionRecord,
} from '@/lib/triage-actions';

interface TriageActionsContextValue {
  records: TriageActionRecord[];
  now: number;
  activeMap: Map<string, TriageActionRecord>;
  counts: ReturnType<typeof countByState>;
  latestFor: (emailId: string) => TriageActionRecord | undefined;
  runAction: (
    input: TriageActionInput,
    kind: TriageActionKind,
    opts?: { snoozeMs?: number }
  ) => Promise<TriageActionRecord>;
  undoLatest: (emailId: string) => void;
}

const TriageActionsContext = createContext<TriageActionsContextValue | null>(null);

export function TriageActionsProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<TriageActionRecord[]>(() =>
    typeof window === 'undefined' ? [] : loadRecords()
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const pushRecord = useCallback((record: TriageActionRecord) => {
    setRecords((prev) => {
      const next = [...prev, record];
      saveRecords(next);
      return next;
    });
  }, []);

  const undoLatest = useCallback((emailId: string) => {
    setRecords((prev) => {
      let removedIdx = -1;
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].emailId === emailId) {
          removedIdx = i;
          break;
        }
      }
      if (removedIdx < 0) return prev;
      const next = [...prev.slice(0, removedIdx), ...prev.slice(removedIdx + 1)];
      saveRecords(next);
      return next;
    });
  }, []);

  const runAction = useCallback(
    async (input: TriageActionInput, kind: TriageActionKind, opts?: { snoozeMs?: number }) => {
      const record = await runTriageAction(input, kind, opts);
      pushRecord(record);
      return record;
    },
    [pushRecord]
  );

  const activeMap = useMemo(() => buildActiveMap(records, now), [records, now]);
  const counts = useMemo(() => countByState(records, now), [records, now]);

  const latestFor = useCallback((emailId: string) => latestRecord(records, emailId), [records]);

  const value = useMemo(
    () => ({ records, now, activeMap, counts, latestFor, runAction, undoLatest }),
    [records, now, activeMap, counts, latestFor, runAction, undoLatest]
  );

  return <TriageActionsContext.Provider value={value}>{children}</TriageActionsContext.Provider>;
}

export function useTriageActions() {
  const ctx = useContext(TriageActionsContext);
  if (!ctx) throw new Error('useTriageActions must be used within TriageActionsProvider');
  return ctx;
}
