import { defineConfig } from 'blume';

export default defineConfig({
  title: 'Email Manager Docs',
  description:
    'Gmail inbox workspace with local-first semantic search — private email tooling, client-side ML, no server-side mailbox storage.',
  // The canonical documentation tree lives at the repository root in `docs/`.
  // Blume is only the presentation + search layer; committed Markdown is the
  // source of truth. See `docs/README.md` for the knowledge-system layout.
  content: { root: '../../docs' },
  github: {
    owner: 'sarthak-fleet',
    repo: 'email-manager',
    branch: 'main',
    dir: 'docs',
  },
  search: { provider: 'orama' },
  ai: { llmsTxt: true },
  seo: { agentReadability: true, sitemap: true, robots: true },
  deployment: {
    site: 'https://docs.mail.sassmaker.com',
    output: 'static',
  },
});
