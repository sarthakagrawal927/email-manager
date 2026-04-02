let pipelineInstance: any = null;

async function getEmbedder() {
  if (!pipelineInstance) {
    const { pipeline } = await import("@huggingface/transformers");
    pipelineInstance = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2",
      { dtype: "fp32" }
    );
  }
  return pipelineInstance;
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function prepareEmailText(email: {
  subject: string;
  from: string;
  body: string;
  snippet: string;
}): string {
  const sender = email.from.replace(/<[^>]+>/, "").trim();
  const bodyText = stripHtml(email.body || email.snippet);
  return `${email.subject}. From ${sender}. ${bodyText.slice(0, 500)}`;
}

export async function embed(text: string): Promise<number[]> {
  const extractor = await getEmbedder();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}
