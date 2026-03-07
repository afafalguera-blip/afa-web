export interface TranslationResult {
  title: string;
  content?: string;
  excerpt?: string;
  description?: string;
  details?: string;
  impact?: string;
  participants?: string;
}

const TRANSLATION_PROXY_URL = import.meta.env.VITE_TRANSLATION_PROXY_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const ALLOW_PUBLIC_TRANSLATION_FALLBACK = import.meta.env.VITE_ALLOW_PUBLIC_TRANSLATION_FALLBACK === 'true';
const TRANSLATION_TIMEOUT_MS = 12000;

async function fetchWithTimeout(input: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), TRANSLATION_TIMEOUT_MS);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

async function translateViaProxy(text: string, sourceLang: string, targetLang: string): Promise<string> {
  if (!TRANSLATION_PROXY_URL) {
    throw new Error('Translation proxy not configured');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (SUPABASE_ANON_KEY) {
    headers.apikey = SUPABASE_ANON_KEY;
    headers.Authorization = `Bearer ${SUPABASE_ANON_KEY}`;
  }

  const response = await fetchWithTimeout(TRANSLATION_PROXY_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      text,
      sourceLang,
      targetLang
    })
  });

  if (!response.ok) {
    throw new Error(`Translation proxy error: ${response.status}`);
  }

  const data = (await response.json()) as { translatedText?: string };

  if (!data?.translatedText) {
    throw new Error('Translation proxy returned no content');
  }

  return data.translatedText;
}

async function translateViaPublicGoogle(text: string, sourceLang: string, targetLang: string): Promise<string> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

  const response = await fetchWithTimeout(url);
  if (!response.ok) {
    throw new Error('Public translation endpoint unavailable');
  }

  const data = await response.json();
  if (!data || !data[0]) {
    throw new Error('Invalid translation response');
  }

  return (data[0] as string[][]).map((part) => part[0]).join('');
}

async function translateText(text: string, sourceLang: string, targetLang: string): Promise<string> {
  if (TRANSLATION_PROXY_URL) {
    return translateViaProxy(text, sourceLang, targetLang);
  }

  if (ALLOW_PUBLIC_TRANSLATION_FALLBACK || import.meta.env.DEV) {
    return translateViaPublicGoogle(text, sourceLang, targetLang);
  }

  throw new Error('Translation service not configured. Set VITE_TRANSLATION_PROXY_URL or enable fallback.');
}

export const TranslationService = {
  async translateContent(
    source: TranslationResult,
    targetLang: string,
    sourceLang: string = 'es'
  ): Promise<TranslationResult> {
    const langMap: Record<string, string> = { ca: 'ca', es: 'es', en: 'en' };
    const sl = langMap[sourceLang] || 'auto';
    const tl = langMap[targetLang] || 'es';

    const translatedResult: TranslationResult = { ...source };

    for (const key of Object.keys(source) as (keyof TranslationResult)[]) {
      const text = source[key];
      if (!text || typeof text !== 'string' || text.trim() === '') continue;

      try {
        const placeholders: string[] = [];
        const protectedText = text.replace(/<[^>]+>/g, (match) => {
          placeholders.push(match);
          return ` [[${placeholders.length - 1}]] `;
        });

        let translatedText = await translateText(protectedText, sl, tl);

        placeholders.forEach((tag, i) => {
          const regex = new RegExp(`\\s?\\[\\[${i}\\]\\]\\s?`, 'g');
          translatedText = translatedText.replace(regex, tag);
        });

        translatedText = translatedText.replace(/(\w)-\s+(\w)/g, '$1$2');
        translatedResult[key] = translatedText;
      } catch (error) {
        console.error(`Error translating field ${key}:`, error);
      }
    }

    return translatedResult;
  },

  async translateNews(source: TranslationResult, targetLang: string, sourceLang: string = 'es') {
    return this.translateContent(source, targetLang, sourceLang);
  }
};
