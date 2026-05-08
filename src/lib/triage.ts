import type { Email } from "./gmail";

export type TriageQueueId = "respond" | "review" | "unsubscribe" | "reference";
export type TriagePriority = "high" | "medium" | "low";

export interface TriageItem {
  id: string;
  queue: TriageQueueId;
  priority: TriagePriority;
  email: Email;
  reason: string;
  action: string;
  brief: string;
  score: number;
}

export interface TriageQueue {
  id: TriageQueueId;
  title: string;
  description: string;
  items: TriageItem[];
}

const respondPatterns = [
  /\b(reply|respond|confirm|approval|approve|decision|question|thoughts|feedback)\b/i,
  /\b(can you|could you|would you|are you available|let me know|following up)\b/i,
];

const urgencyPatterns = [
  /\b(today|tomorrow|urgent|asap|deadline|due|reminder|interview|meeting|schedule|call)\b/i,
];

const referencePatterns = [
  /\b(receipt|invoice|statement|payment|order|shipment|ticket|security alert|verification)\b/i,
];

const bulkPatterns = [
  /\b(newsletter|digest|weekly|roundup|webinar|promotion|sale|unsubscribe)\b/i,
];

function textFor(email: Email) {
  return `${email.subject}\n${email.from}\n${email.snippet}`.toLowerCase();
}

function senderName(email: Email) {
  return email.from.replace(/<[^>]+>/g, "").replaceAll('"', "").trim() || email.from;
}

function priorityFrom(score: number): TriagePriority {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function matchesAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function makeBrief(email: Email, action: string, reason: string) {
  return [
    `Subject: ${email.subject}`,
    `From: ${email.from}`,
    `Suggested action: ${action}`,
    `Why: ${reason}`,
    `Context: ${email.snippet}`,
  ].join("\n");
}

export function triageEmails(emails: Email[]): TriageQueue[] {
  const items = emails.map((email): TriageItem => {
    const text = textFor(email);
    const unread = email.labelIds.includes("UNREAD");
    const starred = email.labelIds.includes("STARRED");
    const wantsResponse = matchesAny(text, respondPatterns);
    const urgent = matchesAny(text, urgencyPatterns);
    const reference = matchesAny(text, referencePatterns);
    const bulk = Boolean(email.unsubscribeLink) || matchesAny(text, bulkPatterns);

    let queue: TriageQueueId = "review";
    let reason = "Needs a quick manual review";
    let action = "Open and decide";
    let score = unread ? 24 : 8;

    if (wantsResponse || urgent || starred) {
      queue = "respond";
      reason = urgent ? "Looks time-sensitive" : starred ? "Starred by you" : "Likely expects a response";
      action = "Reply or schedule follow-up";
      score += 44;
    } else if (bulk) {
      queue = "unsubscribe";
      reason = email.unsubscribeLink ? "Unsubscribe link detected" : "Looks like recurring bulk mail";
      action = email.unsubscribePost ? "Review one-click unsubscribe" : "Review unsubscribe link";
      score += 26;
    } else if (reference) {
      queue = "reference";
      reason = "Looks like a receipt, account, or transactional record";
      action = "Review and keep for records";
      score += 22;
    }

    if (urgent) score += 22;
    if (starred) score += 16;
    if (email.unsubscribePost) score += 8;

    return {
      id: email.id,
      queue,
      priority: priorityFrom(score),
      email,
      reason,
      action,
      brief: makeBrief(email, action, reason),
      score,
    };
  });

  const queueMeta: Array<Omit<TriageQueue, "items">> = [
    {
      id: "respond",
      title: "Needs response",
      description: "Questions, follow-ups, deadlines, meetings, and starred messages.",
    },
    {
      id: "review",
      title: "Quick review",
      description: "Messages that deserve a glance but do not have a clear action yet.",
    },
    {
      id: "unsubscribe",
      title: "Unsubscribe candidates",
      description: "Recurring bulk mail and messages with unsubscribe links.",
    },
    {
      id: "reference",
      title: "Reference",
      description: "Receipts, orders, statements, and account records.",
    },
  ];

  return queueMeta.map((queue) => ({
    ...queue,
    items: items
      .filter((item) => item.queue === queue.id)
      .sort((a, b) => b.score - a.score || Date.parse(b.email.date) - Date.parse(a.email.date)),
  }));
}

export function triageSummary(queues: TriageQueue[]) {
  const all = queues.flatMap((queue) => queue.items);
  return {
    total: all.length,
    highPriority: all.filter((item) => item.priority === "high").length,
    needsResponse: queues.find((queue) => queue.id === "respond")?.items.length ?? 0,
    unsubscribeCandidates: queues.find((queue) => queue.id === "unsubscribe")?.items.length ?? 0,
  };
}

export { senderName };
