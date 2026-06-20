import { Link } from "react-router-dom";

export function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-sm leading-7">
      <Link to="/" className="text-xs text-gray-500 hover:underline">
        ← Email Manager
      </Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Privacy</h1>
      <p className="mt-4 text-xs text-gray-500">Last updated: 2026-05-15.</p>

      <h2 className="mt-8 text-base font-semibold">What we read</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>
          Your Gmail metadata — sender, recipient, subject, labels, timestamps — via the Gmail API.
        </li>
        <li>
          Message bodies are read only when needed to classify a suggestion; never persisted beyond
          the session.
        </li>
        <li>
          Your filter list, so we can show you what&apos;s already in place vs. what&apos;s being
          suggested.
        </li>
      </ul>

      <h2 className="mt-8 text-base font-semibold">What we store</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>OAuth tokens (encrypted) so the analysis can run in the background.</li>
        <li>Aggregate pattern fingerprints — sender + subject hashes, not content.</li>
        <li>The filter suggestions you&apos;ve seen, accepted, or dismissed.</li>
      </ul>

      <h2 className="mt-8 text-base font-semibold">What we never do</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>Send email on your behalf.</li>
        <li>
          Share or sell your data — the entire app is built around <em>reducing</em> the email
          surface area you&apos;re exposed to.
        </li>
        <li>Run third-party analytics or remarketing tags against your inbox content.</li>
      </ul>

      <h2 className="mt-8 text-base font-semibold">Deletion</h2>
      <p className="mt-2">
        Revoke the Google OAuth grant in your Google account to disconnect immediately. Any installed
        Gmail filters remain in Gmail until you remove them there.
      </p>
    </main>
  );
}