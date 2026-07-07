import React from "react";

// WaniKani mnemonics embed markup tags around highlighted terms. Render them as
// styled spans instead of dumping the raw tags as text.
const TAG_STYLES: Record<string, string> = {
  radical: "text-blue font-medium",
  kanji: "text-pink font-medium",
  vocabulary: "text-mauve font-medium",
  reading: "text-teal font-medium",
  meaning: "text-peach font-medium",
  ja: "font-medium",
};

function renderMarkup(text: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /<(\w+)>([\s\S]*?)<\/\1>/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const [, tag, content] = match;
    const cls = TAG_STYLES[tag.toLowerCase()];
    const children = renderMarkup(content, `${keyPrefix}-${i}`);
    parts.push(
      cls ? (
        <span key={`${keyPrefix}-${i}`} className={cls}>{children}</span>
      ) : (
        <React.Fragment key={`${keyPrefix}-${i}`}>{children}</React.Fragment>
      )
    );
    lastIndex = regex.lastIndex;
    i++;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

export function Mnemonic({ text }: { text: string | null }) {
  if (!text) return <span className="text-subtext">No mnemonic.</span>;
  return <>{renderMarkup(text, "m")}</>;
}
