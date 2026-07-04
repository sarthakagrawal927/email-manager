const EMAIL_SHELL_STYLES = `
  :root { color-scheme: light; }
  html, body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    color: #1c1e26;
    font-family: "Outfit", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 15px;
    line-height: 1.65;
    -webkit-font-smoothing: antialiased;
  }
  body { padding: 1.25rem 1.5rem 2rem; }
  a { color: #4556d9; }
  img { max-width: 100%; height: auto; }
  pre {
    white-space: pre-wrap;
    word-break: break-word;
    font-family: inherit;
    margin: 0;
  }
  blockquote {
    margin: 0.75rem 0;
    padding-left: 1rem;
    border-left: 3px solid #e2e4eb;
    color: #4a4d59;
  }
`;

/** Wrap Gmail HTML (or a plain snippet) in a high-contrast light reading shell. */
export function wrapEmailHtml(body: string | undefined, snippet: string): string {
  const inner = body?.trim() || `<pre>${escapeHtml(snippet)}</pre>`;

  return `<!doctype html><html><head><meta charset="utf-8"><style>${EMAIL_SHELL_STYLES}</style></head><body>${inner}</body></html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
