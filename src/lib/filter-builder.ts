import type { Email } from "./gmail";

export type FilterCategory = "newsletter" | "receipt" | "notification" | "followup";

export interface GmailFilterSuggestion {
  id: string;
  category: FilterCategory;
  title: string;
  senderEmail: string;
  displayName: string;
  domain: string;
  matchCount: number;
  confidence: number;
  searchQuery: string;
  fromCriteria: string;
  hasWords: string;
  label: string;
  shouldArchive: boolean;
  shouldMarkAsRead: boolean;
  sampleSubjects: string[];
  reason: string;
}

interface SenderGroup {
  senderEmail: string;
  displayName: string;
  domain: string;
  emails: Email[];
  categoryCounts: Record<FilterCategory, number>;
}

const CATEGORY_META: Record<FilterCategory, {
  label: string;
  title: string;
  shouldArchive: boolean;
  shouldMarkAsRead: boolean;
  keywords: string;
}> = {
  newsletter: {
    label: "Kinetic/Newsletters",
    title: "Newsletter filter",
    shouldArchive: true,
    shouldMarkAsRead: true,
    keywords: "(newsletter OR digest OR roundup OR webinar OR unsubscribe)",
  },
  receipt: {
    label: "Kinetic/Receipts",
    title: "Receipt filter",
    shouldArchive: false,
    shouldMarkAsRead: false,
    keywords: "(receipt OR invoice OR order OR shipment OR statement OR payment)",
  },
  notification: {
    label: "Kinetic/Notifications",
    title: "Notification filter",
    shouldArchive: true,
    shouldMarkAsRead: true,
    keywords: "(notification OR alert OR update OR verify OR security)",
  },
  followup: {
    label: "Kinetic/Follow-up",
    title: "Follow-up filter",
    shouldArchive: false,
    shouldMarkAsRead: false,
    keywords: "(reply OR respond OR confirm OR approval OR question OR feedback)",
  },
};

const NEWSLETTER_PATTERNS = [
  /\b(newsletter|digest|roundup|webinar|promotion|sale|unsubscribe|view in browser)\b/i,
];

const RECEIPT_PATTERNS = [
  /\b(receipt|invoice|statement|payment|order|shipment|delivery|ticket|booking)\b/i,
];

const NOTIFICATION_PATTERNS = [
  /\b(notification|alert|update|security|verification|verify|login|password)\b/i,
];

const FOLLOWUP_PATTERNS = [
  /\b(reply|respond|confirm|approval|approve|question|thoughts|feedback|following up)\b/i,
];

function textFor(email: Email) {
  return `${email.subject}\n${email.from}\n${email.snippet}`;
}

function matchesAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

export function parseSenderAddress(from: string) {
  const emailMatch = from.match(/<([^>]+)>/);
  const senderEmail = (emailMatch?.[1] ?? from).toLowerCase().trim();
  const domain = senderEmail.match(/@(.+)/)?.[1] ?? "unknown";
  const displayName = from.replace(/<[^>]+>/g, "").replaceAll('"', "").trim() || senderEmail;
  return { senderEmail, domain, displayName };
}

function categoryForEmail(email: Email): FilterCategory | null {
  const text = textFor(email);
  const sender = parseSenderAddress(email.from).senderEmail;

  if (email.unsubscribeLink || matchesAny(text, NEWSLETTER_PATTERNS)) return "newsletter";
  if (matchesAny(text, RECEIPT_PATTERNS)) return "receipt";
  if (sender.includes("no-reply") || sender.includes("noreply") || matchesAny(text, NOTIFICATION_PATTERNS)) {
    return "notification";
  }
  if (matchesAny(text, FOLLOWUP_PATTERNS)) return "followup";

  return null;
}

function escapeQueryTerm(value: string) {
  return value.replace(/"/g, '\\"');
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function bestCategory(group: SenderGroup) {
  return (Object.entries(group.categoryCounts) as Array<[FilterCategory, number]>)
    .sort((a, b) => b[1] - a[1])[0];
}

export function buildGmailFilterSuggestions(emails: Email[]): GmailFilterSuggestion[] {
  const groups = new Map<string, SenderGroup>();

  for (const email of emails) {
    const category = categoryForEmail(email);
    if (!category) continue;

    const sender = parseSenderAddress(email.from);
    const existing = groups.get(sender.senderEmail);
    const group = existing ?? {
      ...sender,
      emails: [],
      categoryCounts: {
        newsletter: 0,
        receipt: 0,
        notification: 0,
        followup: 0,
      },
    };

    group.emails.push(email);
    group.categoryCounts[category]++;
    groups.set(sender.senderEmail, group);
  }

  return Array.from(groups.values())
    .map((group): GmailFilterSuggestion | null => {
      const [category, categoryCount] = bestCategory(group);
      if (group.emails.length < 2 && category !== "newsletter") return null;

      const meta = CATEGORY_META[category];
      const confidence = Math.round((categoryCount / group.emails.length) * 100);
      const fromCriteria = group.senderEmail;
      const hasWords = meta.keywords;
      const searchQuery = `from:(${escapeQueryTerm(fromCriteria)}) ${hasWords}`;
      const sampleSubjects = group.emails
        .slice(0, 3)
        .map((email) => email.subject)
        .filter(Boolean);

      return {
        id: `${category}:${group.senderEmail}`,
        category,
        title: `${meta.title}: ${group.displayName}`,
        senderEmail: group.senderEmail,
        displayName: group.displayName,
        domain: group.domain,
        matchCount: group.emails.length,
        confidence,
        searchQuery,
        fromCriteria,
        hasWords,
        label: meta.label,
        shouldArchive: meta.shouldArchive,
        shouldMarkAsRead: meta.shouldMarkAsRead,
        sampleSubjects,
        reason: `${categoryCount}/${group.emails.length} sampled messages matched ${category} patterns.`,
      };
    })
    .filter((suggestion): suggestion is GmailFilterSuggestion => Boolean(suggestion))
    .sort((a, b) => b.matchCount - a.matchCount || b.confidence - a.confidence || a.title.localeCompare(b.title))
    .slice(0, 25);
}

function filterEntryXml(suggestion: GmailFilterSuggestion) {
  const props = [
    ["from", suggestion.fromCriteria],
    ["hasTheWord", suggestion.hasWords],
    ["label", suggestion.label],
    ["shouldArchive", String(suggestion.shouldArchive)],
    ["shouldMarkAsRead", String(suggestion.shouldMarkAsRead)],
  ];

  return [
    "  <entry>",
    "    <category term=\"filter\"></category>",
    `    <title>${escapeXml(suggestion.title)}</title>`,
    "    <content></content>",
    ...props.map(([name, value]) => (
      `    <apps:property name="${name}" value="${escapeXml(value)}"></apps:property>`
    )),
    "  </entry>",
  ].join("\n");
}

export function buildGmailFilterXml(suggestions: GmailFilterSuggestion[]) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom" xmlns:apps="http://schemas.google.com/apps/2006">',
    '  <title>Mail Filters</title>',
    ...suggestions.map(filterEntryXml),
    "</feed>",
  ].join("\n");
}

export function buildFilterRecipe(suggestion: GmailFilterSuggestion) {
  return [
    `Search: ${suggestion.searchQuery}`,
    `From: ${suggestion.fromCriteria}`,
    `Has words: ${suggestion.hasWords}`,
    `Apply label: ${suggestion.label}`,
    `Skip inbox: ${suggestion.shouldArchive ? "yes" : "no"}`,
    `Mark as read: ${suggestion.shouldMarkAsRead ? "yes" : "no"}`,
  ].join("\n");
}
