const ELLIPSIS = "...";

export function truncateText(text: string, maxChars: number): string {
  const t = text.trim();
  if (t.length <= maxChars) return t;
  const cut = Math.max(0, maxChars - ELLIPSIS.length);
  return t.slice(0, cut) + ELLIPSIS;
}

export const GALLERY_TITLE_PREVIEW_MAX = 48;
export const GALLERY_BODY_PREVIEW_MAX = 100;
