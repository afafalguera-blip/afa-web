const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'strong',
  'em',
  'u',
  's',
  'a',
  'ul',
  'ol',
  'li',
  'blockquote',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'img',
  'code',
  'pre'
]);

const DROP_CONTENT_TAGS = new Set(['script', 'style', 'iframe', 'object', 'embed']);

const GLOBAL_ALLOWED_ATTRS = new Set(['class']);
const TAG_ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel']),
  img: new Set(['src', 'alt', 'title'])
};

function isSafeUrl(url: string, allowMailAndTel: boolean): boolean {
  try {
    const parsed = new URL(url, window.location.origin);

    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return true;
    }

    if (allowMailAndTel && (parsed.protocol === 'mailto:' || parsed.protocol === 'tel:')) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

function sanitizeNode(element: Element): void {
  const children = Array.from(element.children);

  children.forEach((child) => {
    const tag = child.tagName.toLowerCase();

    if (!ALLOWED_TAGS.has(tag)) {
      if (DROP_CONTENT_TAGS.has(tag)) {
        child.remove();
        return;
      }

      const parent = child.parentNode;
      if (!parent) return;

      while (child.firstChild) {
        parent.insertBefore(child.firstChild, child);
      }

      child.remove();
      return;
    }

    const allowedAttrs = new Set([...(TAG_ALLOWED_ATTRS[tag] || []), ...GLOBAL_ALLOWED_ATTRS]);

    Array.from(child.attributes).forEach((attr) => {
      const attrName = attr.name.toLowerCase();
      const attrValue = attr.value.trim();

      if (attrName.startsWith('on') || !allowedAttrs.has(attrName)) {
        child.removeAttribute(attr.name);
        return;
      }

      if (tag === 'a' && attrName === 'href' && !isSafeUrl(attrValue, true)) {
        child.removeAttribute(attr.name);
        return;
      }

      if (tag === 'img' && attrName === 'src' && !isSafeUrl(attrValue, false)) {
        child.remove();
      }
    });

    if (!child.isConnected) return;

    if (tag === 'a') {
      child.setAttribute('rel', 'noopener noreferrer');
      if (child.getAttribute('target') !== '_blank') {
        child.removeAttribute('target');
      }
    }

    sanitizeNode(child);
  });
}

export function sanitizeRichTextHtml(html: string): string {
  if (!html) return '';

  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return html;
  }

  const parser = new DOMParser();
  const documentNode = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const container = documentNode.body.firstElementChild;

  if (!container) return '';

  sanitizeNode(container);
  return container.innerHTML;
}
