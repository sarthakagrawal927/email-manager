import { defineConfig } from 'blume';

/**
 * Blume configuration for the email-manager docs site.
 *
 * The committed Markdown under docs/ is the source of truth. Blume is only
 * the presentation and search layer — generated output (.blume/) is
 * gitignored and never committed. See docs/development/workflows.md.
 */
export default defineConfig({
  title: 'email-manager docs',
  description:
    'Local-first knowledge system for email-manager — a Gmail inbox workspace with client-side semantic search (HuggingFace ONNX + IndexedDB; server stores only auth sessions).',

  content: {
    root: 'docs',
    // Render committed Markdown as the docs site. Archive is preserved for
    // git history and reachable via the repo, not as canonical pages.
    include: ['**/*.md'],
    exclude: ['archive/**'],
  },

  theme: {
    accent: 'indigo',
    radius: 'md',
    mode: 'system',
  },

  search: {
    provider: 'orama',
  },

  markdown: {
    imageZoom: true,
    code: {
      icons: true,
      wrap: false,
    },
  },

  ai: {
    llmsTxt: true,
  },

  seo: {
    og: { enabled: true },
    sitemap: true,
    robots: true,
    structuredData: true,
  },

  deployment: {
    output: 'static',
    // Set this when the docs site is published.
    // site: "https://docs.email-manager.example",
  },
});
