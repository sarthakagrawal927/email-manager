'use client';

import { ArrowLeft, Copy, ExternalLink } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { trackCoreAction } from '@/lib/analytics';
import type { Email } from '@/lib/gmail';
import { triageItemForEmail } from '@/lib/triage';
import { TriageActionBar, TriageStateBadge } from '@/components/TriageActionBar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Props {
  email: Email;
  onBack: () => void;
  showBack?: boolean;
}

function priorityTone(priority: string) {
  if (priority === 'high') return 'destructive' as const;
  if (priority === 'medium') return 'secondary' as const;
  return 'outline' as const;
}

export function EmailDetail({ email, onBack, showBack = true }: Props) {
  const [acting, setActing] = useState(false);

  const triageInput = useMemo(() => {
    const item = triageItemForEmail(email);
    return {
      emailId: email.id,
      emailSubject: email.subject,
      from: email.from,
      brief:
        item?.brief ??
        [`Subject: ${email.subject}`, `From: ${email.from}`, `Context: ${email.snippet}`].join(
          '\n'
        ),
    };
  }, [email]);

  const triageItem = useMemo(() => triageItemForEmail(email), [email]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isTyping =
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement;
      if (isTyping) return;
      if (e.key === 'Escape' && showBack) onBack();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack, showBack]);

  async function handleCopySubject() {
    try {
      await navigator.clipboard.writeText(`${email.subject}\n${email.from}\n\n${email.snippet}`);
    } catch {
      // best-effort
    }
  }

  async function handleOneClickUnsubscribe() {
    setActing(true);
    try {
      const res = await fetch(`/api/emails/${email.id}/unsubscribe`, { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        trackCoreAction('unsubscribed');
      } else if (data.fallbackUrl) {
        window.open(data.fallbackUrl, '_blank', 'noopener,noreferrer');
      }
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--bg-subtle)]/30">
      <div className="glass-panel flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-3">
        {showBack ? (
          <Button type="button" variant="ghost" size="sm" onClick={onBack} className="md:hidden">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back
          </Button>
        ) : null}
        <div className="flex-1" />
        <Button type="button" variant="secondary" size="sm" onClick={handleCopySubject}>
          <Copy className="h-3.5 w-3.5" aria-hidden />
          Copy brief
        </Button>
        {email.unsubscribeLink ? (
          email.unsubscribePost ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={acting}
              onClick={handleOneClickUnsubscribe}
            >
              Unsubscribe
            </Button>
          ) : (
            <Button type="button" variant="destructive" size="sm" asChild>
              <a href={email.unsubscribeLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                Unsubscribe
              </a>
            </Button>
          )
        ) : null}
      </div>

      <div className="shrink-0 space-y-4 border-b border-[var(--border)]/80 px-5 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <TriageStateBadge emailId={email.id} />
          {email.labelIds.includes('UNREAD') ? <Badge>Unread</Badge> : null}
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-semibold leading-snug tracking-tight text-balance">
            {email.subject}
          </h1>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--text-muted)]">
            <span className="truncate">{email.from.replace(/<[^>]+>/, '').trim()}</span>
            <time className="shrink-0 tabular-nums">{new Date(email.date).toLocaleString()}</time>
          </div>
        </div>

        {triageItem ? (
          <Card className="border-[var(--border)]/70 bg-[var(--bg-card)]/70 shadow-none">
            <CardContent className="space-y-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={priorityTone(triageItem.priority)}>{triageItem.priority}</Badge>
                <span className="text-xs text-[var(--text-muted)]">
                  {triageItem.queue === 'respond'
                    ? 'Needs response'
                    : triageItem.queue === 'unsubscribe'
                      ? 'Unsubscribe candidate'
                      : triageItem.queue === 'reference'
                        ? 'Reference'
                        : 'Quick review'}
                </span>
              </div>
              <p className="text-sm text-[var(--text-muted)]">
                <span className="font-medium text-[var(--text)]">Why: </span>
                {triageItem.reason}
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                <span className="font-medium text-[var(--text)]">Suggested: </span>
                {triageItem.action}
              </p>
            </CardContent>
          </Card>
        ) : null}

        <TriageActionBar input={triageInput} />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden p-4">
        <div className="h-full overflow-hidden rounded-2xl border border-[var(--border)]/80 bg-[var(--bg-card)] shadow-[var(--shadow-soft)]">
          <iframe
            srcDoc={
              email.body ||
              `<pre style="font-family:inherit;white-space:pre-wrap;padding:1rem;color:inherit">${email.snippet}</pre>`
            }
            className={cn('h-full w-full border-0 bg-[var(--bg-card)]')}
            sandbox="allow-popups allow-popups-to-escape-sandbox"
            title="Email body"
          />
        </div>
      </div>
    </div>
  );
}
