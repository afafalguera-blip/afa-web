import { proxyStorageUrl } from './storageUrl';

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
  let child = element.firstElementChild;

  while (child) {
    // Se calcula antes de tocar el nodo: al eliminarlo se pierde el hermano.
    let next = child.nextElementSibling;
    const tag = child.tagName.toLowerCase();

    if (!ALLOWED_TAGS.has(tag)) {
      if (!DROP_CONTENT_TAGS.has(tag) && child.parentNode) {
        const parent = child.parentNode;
        const firstUnwrapped = child.firstElementChild;

        while (child.firstChild) {
          parent.insertBefore(child.firstChild, child);
        }

        // Los hijos ascendidos todavía no han pasado por el saneado: seguir por
        // ellos, o un <div><img onerror=...> saldría intacto (XSS almacenado).
        if (firstUnwrapped) next = firstUnwrapped;
      }

      child.remove();
      child = next;
      continue;
    }

    const node = child;
    const allowedAttrs = new Set([...(TAG_ALLOWED_ATTRS[tag] || []), ...GLOBAL_ALLOWED_ATTRS]);

    Array.from(node.attributes).forEach((attr) => {
      const attrName = attr.name.toLowerCase();
      const attrValue = attr.value.trim();

      if (attrName.startsWith('on') || !allowedAttrs.has(attrName)) {
        node.removeAttribute(attr.name);
        return;
      }

      if (tag === 'a' && attrName === 'href') {
        if (!isSafeUrl(attrValue, true)) {
          node.removeAttribute(attr.name);
          return;
        }
        const proxied = proxyStorageUrl(attrValue);
        if (proxied !== attrValue) node.setAttribute('href', proxied);
      }

      if (tag === 'img' && attrName === 'src') {
        if (!isSafeUrl(attrValue, false)) {
          node.remove();
          return;
        }
        const proxied = proxyStorageUrl(attrValue);
        if (proxied !== attrValue) node.setAttribute('src', proxied);
      }
    });

    if (node.isConnected) {
      if (tag === 'a') {
        node.setAttribute('rel', 'noopener noreferrer');
        if (node.getAttribute('target') !== '_blank') {
          node.removeAttribute('target');
        }
      }

      sanitizeNode(node);
    }

    child = next;
  }
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
