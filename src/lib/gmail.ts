import { google } from "googleapis";

export function getGmailClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.gmail({ version: "v1", auth });
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
      // nested multipart
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
  const headers = msg.payload?.headers ?? [];
  const unsubHeader = getHeader(headers, "List-Unsubscribe");
  let unsubscribeLink: string | null = null;

  if (unsubHeader) {
    const httpMatch = unsubHeader.match(/<(https?:\/\/[^>]+)>/);
    const mailtoMatch = unsubHeader.match(/<(mailto:[^>]+)>/);
    unsubscribeLink = httpMatch?.[1] ?? mailtoMatch?.[1] ?? null;
  }

  return {
    id: msg.id,
    threadId: msg.threadId,
    subject: getHeader(headers, "Subject") || "(no subject)",
    from: getHeader(headers, "From"),
    to: getHeader(headers, "To"),
    date: getHeader(headers, "Date"),
    snippet: msg.snippet ?? "",
    body: decodeBody(msg.payload),
    labelIds: msg.labelIds ?? [],
    unsubscribeLink,
  };
}

export async function listEmails(
  accessToken: string,
  options: { q?: string; labelIds?: string[]; maxResults?: number; pageToken?: string }
) {
  const gmail = getGmailClient(accessToken);
  const res = await gmail.users.messages.list({
    userId: "me",
    maxResults: options.maxResults ?? 25,
    q: options.q,
    labelIds: options.labelIds,
    pageToken: options.pageToken,
  });

  if (!res.data.messages?.length) {
    return { emails: [], nextPageToken: null };
  }

  const emails = await Promise.all(
    res.data.messages.map(async (m) => {
      const full = await gmail.users.messages.get({
        userId: "me",
        id: m.id!,
        format: "full",
      });
      return parseMessage(full.data);
    })
  );

  return { emails, nextPageToken: res.data.nextPageToken ?? null };
}

export async function getEmail(accessToken: string, id: string) {
  const gmail = getGmailClient(accessToken);
  const res = await gmail.users.messages.get({
    userId: "me",
    id,
    format: "full",
  });
  return parseMessage(res.data);
}

export async function modifyEmail(
  accessToken: string,
  id: string,
  addLabels: string[],
  removeLabels: string[]
) {
  const gmail = getGmailClient(accessToken);
  await gmail.users.messages.modify({
    userId: "me",
    id,
    requestBody: { addLabelIds: addLabels, removeLabelIds: removeLabels },
  });
}

export async function trashEmail(accessToken: string, id: string) {
  const gmail = getGmailClient(accessToken);
  await gmail.users.messages.trash({ userId: "me", id });
}

export async function sendEmail(
  accessToken: string,
  to: string,
  subject: string,
  body: string
) {
  const gmail = getGmailClient(accessToken);
  const raw = Buffer.from(
    `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${body}`
  ).toString("base64url");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });
}
