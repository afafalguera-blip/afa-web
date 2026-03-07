import { sanitizeRichTextHtml } from './htmlSanitizer';

export interface ReadabilityMetrics {
  words: number;
  minutes: number;
}

function stripHtml(html: string): string {
  if (!html) return '';

  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return html.replace(/<[^>]*>/g, ' ');
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

export function getReadabilityMetrics(html: string): ReadabilityMetrics {
  const safeHtml = sanitizeRichTextHtml(html);
  const text = stripHtml(safeHtml).trim();

  if (!text) {
    return { words: 0, minutes: 1 };
  }

  const words = text.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));

  return { words, minutes };
}
