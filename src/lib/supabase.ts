import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Missing Supabase environment variables. Check your .env.local file.');
}

// Gateway/edge hiccups (Cloudflare 52x, transient 5xx, rate limits) return
// responses without CORS headers, which the browser surfaces as "CORS blocked"
// and leaves pages with empty data. Retry idempotent reads a couple of times so
// a single transient failure doesn't blank out the UI. Non-idempotent requests
// (POST/PATCH/DELETE, e.g. creating an inscription) are never retried to avoid
// duplicates.
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504, 520, 521, 522, 523, 524]);
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const method = (init?.method || 'GET').toUpperCase();
  const idempotent = method === 'GET' || method === 'HEAD';
  const attempts = idempotent ? 3 : 1;

  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(input, init);
      if (idempotent && RETRYABLE_STATUS.has(res.status) && i < attempts - 1) {
        await sleep(300 * (i + 1));
        continue;
      }
      return res;
    } catch (err) {
      // Network/CORS failure (fetch throws). Retry idempotent requests.
      lastError = err;
      if (idempotent && i < attempts - 1) {
        await sleep(300 * (i + 1));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  global: {
    fetch: fetchWithRetry,
    headers: {
      // Tell Supabase CDN to cache responses and allow browser caching
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
    },
  },
});
