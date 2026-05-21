/**
 * Owner-facing analytics — the fixed 4-event taxonomy.
 *
 * Every project in the fleet emits exactly these four events — `signup`,
 * `activated`, `core_action`, `returned` — so a single PostHog project can
 * build one cross-fleet funnel (signup -> activated -> core_action) and a
 * D1/D7 retention insight, with no custom dashboard.
 *
 * Every event carries `project: "email-manager"`. This wrapper is intentionally
 * thin so it can later be folded into `@saas-maker/posthog-client`.
 *
 * email-manager is an entirely client-side SPA (no server inbox DB), so this
 * module only needs the browser path. It routes through
 * `@saas-maker/posthog-client` (`track`), which is initialized by
 * `installBrowserMonitoring()` in `foundry-monitoring.ts`.
 */
"use client";

import { track } from "@saas-maker/posthog-client";

const PROJECT = "email-manager" as const;

/**
 * The product-specific action behind a `core_action` event.
 * email-manager's core verbs: reading a message, installing a Gmail filter,
 * and unsubscribing from a sender.
 */
export type CoreAction =
  | "email_opened"
  | "filter_installed"
  | "unsubscribed";

interface AnalyticsEventMap {
  /** First session after an account is created. */
  signup: { project: typeof PROJECT };
  /** The user reaches first real value — opens their first message. */
  activated: { project: typeof PROJECT };
  /** The thing the product exists to do. */
  core_action: { project: typeof PROJECT; action: CoreAction };
  /** A return session by a user with prior activity. */
  returned: { project: typeof PROJECT };
}

function emit<K extends keyof AnalyticsEventMap>(
  event: K,
  props: Omit<AnalyticsEventMap[K], "project">,
): void {
  try {
    track(event, { project: PROJECT, ...props });
  } catch {
    // Analytics must never break a user flow. Swallow and move on.
  }
}

/** Fire once, on the first session after an account is created. */
export function trackSignup(): void {
  emit("signup", {});
}

/** Fire once, when the user first reaches real value (first email opened). */
export function trackActivated(): void {
  emit("activated", {});
}

/** Fire on each completion of the core product action. */
export function trackCoreAction(action: CoreAction): void {
  emit("core_action", { action });
}

/** Fire on session start for a user who has prior activity. */
export function trackReturned(): void {
  emit("returned", {});
}
