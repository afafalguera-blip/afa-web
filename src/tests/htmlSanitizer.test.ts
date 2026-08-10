import { describe, expect, it } from 'vitest';
import { sanitizeRichTextHtml } from '../utils/htmlSanitizer';
import { getReadabilityMetrics } from '../utils/readability';

/**
 * El contenido del editor (noticias, páginas) se pinta con
 * dangerouslySetInnerHTML. Cualquier atributo o etiqueta que sobreviva aquí es
 * XSS almacenado ejecutable por cualquier visitante, así que estos casos son la
 * red de seguridad del sanitizador.
 */
describe('sanitizeRichTextHtml', () => {
  it('conserva el marcado permitido', () => {
    expect(sanitizeRichTextHtml('<p>Hola <strong>món</strong></p>')).toBe(
      '<p>Hola <strong>món</strong></p>',
    );
  });

  it('elimina scripts y su contenido', () => {
    expect(sanitizeRichTextHtml('<script>alert(1)</script><p>ok</p>')).toBe('<p>ok</p>');
  });

  it('elimina iframes, objetos y estilos', () => {
    expect(sanitizeRichTextHtml('<iframe src="https://evil.test"></iframe><p>ok</p>')).toBe('<p>ok</p>');
    expect(sanitizeRichTextHtml('<style>body{display:none}</style><p>ok</p>')).toBe('<p>ok</p>');
    expect(sanitizeRichTextHtml('<object data="x"></object><p>ok</p>')).toBe('<p>ok</p>');
  });

  it('quita los manejadores de eventos inline', () => {
    expect(sanitizeRichTextHtml('<p onclick="steal()">ok</p>')).toBe('<p>ok</p>');
    expect(sanitizeRichTextHtml('<img src="https://ok.test/a.png" onerror="steal()">')).toBe(
      '<img src="https://ok.test/a.png">',
    );
  });

  it('bloquea las urls javascript: en enlaces', () => {
    const out = sanitizeRichTextHtml('<a href="javascript:steal()">clic</a>');
    expect(out).not.toContain('javascript:');
  });

  it('elimina imágenes con protocolo no http(s)', () => {
    expect(sanitizeRichTextHtml('<img src="javascript:steal()">')).toBe('');
  });

  it('desenvuelve etiquetas no permitidas pero conserva el texto', () => {
    expect(sanitizeRichTextHtml('<div>texto</div>')).toBe('texto');
  });

  it('sanea también lo que había dentro de una etiqueta desenvuelta', () => {
    // Regresión: al desenvolver un contenedor no permitido, sus hijos se movían
    // al nivel superior sin volver a pasar por el sanitizador.
    expect(sanitizeRichTextHtml('<div><img src="https://ok.test/a.png" onerror="steal()"></div>')).toBe(
      '<img src="https://ok.test/a.png">',
    );
    expect(sanitizeRichTextHtml('<div><img src="javascript:steal()"></div>')).toBe('');
    expect(sanitizeRichTextHtml('<section><script>alert(1)</script>ok</section>')).toBe('ok');
    expect(sanitizeRichTextHtml('<div><p onclick="steal()">ok</p></div>')).toBe('<p>ok</p>');
  });

  it('fuerza rel seguro en los enlaces externos', () => {
    const out = sanitizeRichTextHtml('<a href="https://ok.test" target="_blank">x</a>');
    expect(out).toContain('rel="noopener noreferrer"');
    expect(out).toContain('target="_blank"');
  });

  it('descarta un target distinto de _blank', () => {
    const out = sanitizeRichTextHtml('<a href="https://ok.test" target="_top">x</a>');
    expect(out).not.toContain('target=');
  });

  it('reescribe las urls de Supabase Storage al proxy del CDN', () => {
    const out = sanitizeRichTextHtml(
      '<img src="https://zaxbtnjkidqwzqsehvld.supabase.co/storage/v1/object/public/Imagenes/logo.png">',
    );
    expect(out).toContain('src="/storage/object/public/Imagenes/logo.png"');
  });

  it('devuelve cadena vacía para entrada vacía', () => {
    expect(sanitizeRichTextHtml('')).toBe('');
  });
});

describe('getReadabilityMetrics', () => {
  it('cuenta palabras ignorando el marcado', () => {
    expect(getReadabilityMetrics('<p>una <strong>dues</strong> tres</p>')).toEqual({
      words: 3,
      minutes: 1,
    });
  });

  it('redondea al alza a 200 palabras por minuto', () => {
    const html = `<p>${'paraula '.repeat(250).trim()}</p>`;
    expect(getReadabilityMetrics(html).minutes).toBe(2);
  });

  it('nunca baja de 1 minuto', () => {
    expect(getReadabilityMetrics('')).toEqual({ words: 0, minutes: 1 });
  });
});
