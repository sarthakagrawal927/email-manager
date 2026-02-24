const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

function headers(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
}

async function gmailFetch(accessToken: string, path: string, init?: RequestInit) {
  const res = await fetch(`${GMAIL_API}${path}`, {
    ...init,
    headers: { ...headers(accessToken), ...init?.headers },
  });
  if (!res.ok) {
    const err: any = new Error(`Gmail API ${res.status}: ${res.statusText}`);
    err.status = res.status;
    try { err.details = await res.json(); } catch {}
    throw err;
  }
  return res.json();
}

export interface Email {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  body: string;
  labelIds: string[];
  unsubscribeLink: string | null;
  unsubscribePost: boolean;
}

function decodeBody(payload: any): string {
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, "base64url").toString("utf-8");
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        return Buffer.from(part.body.data, "base64url").toString("utf-8");
      }
    }
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return Buffer.from(part.body.data, "base64url").toString("utf-8");
      }
      if (part.parts) {
        const nested = decodeBody(part);
        if (nested) return nested;
      }
    }
  }
  return "";
}

function getHeader(headers: any[], name: string): string {
  return headers?.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

export function parseMessage(msg: any): Email {
  const hdrs = msg.payload?.headers ?? [];
  const unsubHeader = getHeader(hdrs, "List-Unsubscribe");
  const unsubPostHeader = getHeader(hdrs, "List-Unsubscribe-Post");
  let unsubscribeLink: string | null = null;

  if (unsubHeader) {
    const httpMatch = unsubHeader.match(/<(https?:\/\/[^>]+)>/);
    const mailtoMatch = unsubHeader.match(/<(mailto:[^>]+)>/);
    unsubscribeLink = httpMatch?.[1] ?? mailtoMatch?.[1] ?? null;
  }

  return {
    id: msg.id,
    threadId: msg.threadId,
    subject: getHeader(hdrs, "Subject") || "(no subject)",
    from: getHeader(hdrs, "From"),
    to: getHeader(hdrs, "To"),
    date: getHeader(hdrs, "Date"),
    snippet: msg.snippet ?? "",
    body: decodeBody(msg.payload),
    labelIds: msg.labelIds ?? [],
    unsubscribeLink,
    unsubscribePost: !!unsubPostHeader && !!unsubscribeLink?.startsWith("http"),
  };
}

export async function listEmails(
  accessToken: string,
  options: { q?: string; labelIds?: string[]; maxResults?: number; pageToken?: string; metadataOnly?: boolean }
) {
  const params = new URLSearchParams();
  params.set("maxResults", String(options.maxResults ?? 25));
  if (options.q) params.set("q", options.q);
  if (options.pageToken) params.set("pageToken", options.pageToken);
  if (options.labelIds) {
    for (const l of options.labelIds) params.append("labelIds", l);
  }

  const listData = await gmailFetch(accessToken, `/messages?${params}`);

  if (!listData.messages?.length) {
    return { emails: [], nextPageToken: null };
  }

  // metadata format is ~10x faster: only headers, no body parsing
  const format = options.metadataOnly ? "metadata" : "full";
  const msgParams = new URLSearchParams({ format });
  if (options.metadataOnly) {
    for (const h of ["Subject", "From", "To", "Date", "List-Unsubscribe", "List-Unsubscribe-Post"]) {
      msgParams.append("metadataHeaders", h);
    }
  }

  const emails = await Promise.all(
    listData.messages.map(async (m: any) => {
      const msg = await gmailFetch(accessToken, `/messages/${m.id}?${msgParams}`);
      return parseMessage(msg);
    })
  );

  return { emails, nextPageToken: listData.nextPageToken ?? null };
}

export async function getEmail(accessToken: string, id: string) {
  const data = await gmailFetch(accessToken, `/messages/${id}?format=full`);
  return parseMessage(data);
}

export async function modifyEmail(
  accessToken: string,
  id: string,
  addLabels: string[],
  removeLabels: string[]
) {
  await gmailFetch(accessToken, `/messages/${id}/modify`, {
    method: "POST",
    body: JSON.stringify({ addLabelIds: addLabels, removeLabelIds: removeLabels }),
  });
}

export async function trashEmail(accessToken: string, id: string) {
  await gmailFetch(accessToken, `/messages/${id}/trash`, { method: "POST" });
}

export async function sendEmail(
  accessToken: string,
  to: string,
  subject: string,
  body: string
) {
  const raw = Buffer.from(
    `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${body}`
  ).toString("base64url");

  await gmailFetch(accessToken, `/messages/send`, {
    method: "POST",
    body: JSON.stringify({ raw }),
  });
}
