function cleanPrompt(value: unknown): string {
  return String(value ?? "")
    .replace(/^#{1,6}\s+/, "")
    .replace(/^\*\*(.*?)\**:?$/, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function uniquePrompts(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLowerCase();
    if (!value || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isPromptHeading(heading: string): boolean {
  return /\b(reflection prompts?|reflection questions?|journaling prompts?|prompts? for journaling|core prompts?)\b/i.test(
    heading,
  );
}

export function extractReflectionPrompts(
  data: Record<string, unknown> | null | undefined,
  markdown: string,
): string[] {
  const explicit = Array.isArray(data?.reflectionPrompts)
    ? data.reflectionPrompts.map(cleanPrompt).filter(Boolean)
    : [];
  if (explicit.length > 0) return uniquePrompts(explicit);

  const prompts: string[] = [];
  const sectionPattern = /^##\s+(.+?)\s*$\n([\s\S]*?)(?=^##\s+|(?![\s\S]))/gim;
  for (const match of markdown.matchAll(sectionPattern)) {
    const heading = match[1] ?? "";
    if (!isPromptHeading(heading)) continue;
    const body = match[2] ?? "";

    const listItems = Array.from(
      body.matchAll(/^\s*(?:[-*+]\s+|\d+[.)]\s+)(.+)$/gim),
      (item) => cleanPrompt(item[1]),
    ).filter(Boolean);
    if (listItems.length > 0) {
      prompts.push(...listItems);
      continue;
    }

    const paragraphs = body
      .split(/\n\s*\n/g)
      .map(cleanPrompt)
      .filter((paragraph) => paragraph.includes("?") && !isPromptHeading(paragraph));
    prompts.push(...paragraphs);
  }

  return uniquePrompts(prompts);
}
