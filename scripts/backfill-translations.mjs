// One-shot backfill: re-translates legacy news/announcements/notifications
// where CA or EN content equals the ES content (i.e. never actually translated).
//
// Usage:
//   SUPABASE_ACCESS_TOKEN=sbp_... TRANSLATION_PROXY_URL=https://....functions.supabase.co/translate \
//   SUPABASE_ANON_KEY=eyJ... node scripts/backfill-translations.mjs [--dry-run]

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'zaxbtnjkidqwzqsehvld';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROXY_URL = process.env.TRANSLATION_PROXY_URL || `https://${PROJECT_REF}.functions.supabase.co/translate`;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
const DRY_RUN = process.argv.includes('--dry-run');

if (!ACCESS_TOKEN) { console.error('Missing SUPABASE_ACCESS_TOKEN'); process.exit(1); }
if (!ANON_KEY) { console.error('Missing SUPABASE_ANON_KEY'); process.exit(1); }

const SQL_URL = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

async function sql(query) {
  const res = await fetch(SQL_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`SQL ${res.status}: ${await res.text()}`);
  return res.json();
}

async function translateBulk(fields, sourceLang, targetLangs, attempt = 1) {
  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
    body: JSON.stringify({ fields, sourceLang, targetLangs }),
  });
  const text = await res.text();
  if (!res.ok) {
    // Gemini free tier: 5 req/min. Retry on quota errors with the suggested delay.
    if (text.includes('RESOURCE_EXHAUSTED') && attempt <= 5) {
      const m = text.match(/retry in (\d+(?:\.\d+)?)s/i);
      const wait = (m ? parseFloat(m[1]) : 15) + 2;
      console.log(`  · rate limited, waiting ${wait.toFixed(0)}s (attempt ${attempt}/5)`);
      await new Promise((r) => setTimeout(r, wait * 1000));
      return translateBulk(fields, sourceLang, targetLangs, attempt + 1);
    }
    throw new Error(`Translate ${res.status}: ${text}`);
  }
  return JSON.parse(text).translations;
}

function jsonLiteral(value) {
  return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
}

async function backfillNews() {
  console.log('\n=== NEWS ===');
  const rows = await sql(`SELECT id, slug, translations FROM news WHERE translations IS NOT NULL`);
  let fixed = 0, skipped = 0;
  for (const row of rows) {
    const t = row.translations || {};
    const es = t.es || {};
    if (!es.title?.trim()) { skipped++; continue; }
    const targetLangs = [];
    if (!t.ca?.title?.trim() || t.ca.title.trim() === es.title.trim()) targetLangs.push('ca');
    if (!t.en?.title?.trim() || t.en.title.trim() === es.title.trim()) targetLangs.push('en');
    if (!targetLangs.length) { skipped++; continue; }

    console.log(`→ ${row.slug} (translating to: ${targetLangs.join(', ')})`);
    if (DRY_RUN) { fixed++; continue; }

    const fields = { title: es.title };
    if (es.excerpt?.trim()) fields.excerpt = es.excerpt;
    if (es.content?.trim()) fields.content = es.content;

    try {
      const translated = await translateBulk(fields, 'es', targetLangs);
      const newTranslations = { ...t };
      for (const lang of targetLangs) {
        newTranslations[lang] = {
          title: translated[lang]?.title || es.title,
          excerpt: translated[lang]?.excerpt || es.excerpt || '',
          content: translated[lang]?.content || es.content || '',
        };
      }
      await sql(`UPDATE news SET translations = ${jsonLiteral(newTranslations)} WHERE id = '${row.id}'`);
      fixed++;
      await new Promise((r) => setTimeout(r, 13000));
    } catch (err) {
      console.error(`  ✗ failed: ${err.message}`);
    }
  }
  console.log(`news: ${fixed} fixed, ${skipped} skipped`);
}

async function backfillAnnouncements() {
  console.log('\n=== ANNOUNCEMENTS ===');
  const rows = await sql(`SELECT id, message, translations FROM site_announcements WHERE translations IS NOT NULL OR message IS NOT NULL`);
  let fixed = 0, skipped = 0;
  for (const row of rows) {
    const t = row.translations || {};
    const esMsg = (t.es || row.message || '').toString().trim();
    if (!esMsg) { skipped++; continue; }
    const targetLangs = [];
    if (!t.ca?.trim() || t.ca.trim() === esMsg) targetLangs.push('ca');
    if (!t.en?.trim() || t.en.trim() === esMsg) targetLangs.push('en');
    if (!targetLangs.length) { skipped++; continue; }

    console.log(`→ announcement ${row.id} (translating to: ${targetLangs.join(', ')})`);
    if (DRY_RUN) { fixed++; continue; }

    try {
      const translated = await translateBulk({ message: esMsg }, 'es', targetLangs);
      const newT = { ...t, es: esMsg };
      for (const lang of targetLangs) newT[lang] = translated[lang]?.message || esMsg;
      await sql(`UPDATE site_announcements SET translations = ${jsonLiteral(newT)} WHERE id = '${row.id}'`);
      fixed++;
      await new Promise((r) => setTimeout(r, 13000));
    } catch (err) {
      console.error(`  ✗ failed: ${err.message}`);
    }
  }
  console.log(`announcements: ${fixed} fixed, ${skipped} skipped`);
}

async function backfillNotifications() {
  console.log('\n=== NOTIFICATIONS ===');
  const rows = await sql(`SELECT id, title, message, translations FROM notifications`);
  let fixed = 0, skipped = 0;
  for (const row of rows) {
    const t = row.translations || {};
    const esTitle = (t.es?.title || row.title || '').toString().trim();
    const esMsg = (t.es?.message || row.message || '').toString();
    if (!esTitle) { skipped++; continue; }
    const sameAsEs = (lang) => {
      const x = t[lang];
      if (!x?.title?.trim()) return true;
      return x.title.trim() === esTitle;
    };
    const targetLangs = [];
    if (sameAsEs('ca')) targetLangs.push('ca');
    if (sameAsEs('en')) targetLangs.push('en');
    if (!targetLangs.length) { skipped++; continue; }

    console.log(`→ notification ${row.id} (translating to: ${targetLangs.join(', ')})`);
    if (DRY_RUN) { fixed++; continue; }

    const fields = { title: esTitle };
    if (esMsg.trim()) fields.message = esMsg;

    try {
      const translated = await translateBulk(fields, 'es', targetLangs);
      const newT = { ...t, es: { title: esTitle, message: esMsg || undefined } };
      for (const lang of targetLangs) {
        newT[lang] = {
          title: translated[lang]?.title || esTitle,
          message: translated[lang]?.message || esMsg || undefined,
        };
      }
      await sql(`UPDATE notifications SET translations = ${jsonLiteral(newT)} WHERE id = '${row.id}'`);
      fixed++;
      await new Promise((r) => setTimeout(r, 13000));
    } catch (err) {
      console.error(`  ✗ failed: ${err.message}`);
    }
  }
  console.log(`notifications: ${fixed} fixed, ${skipped} skipped`);
}

(async () => {
  console.log(`Backfill translations${DRY_RUN ? ' (DRY RUN)' : ''}`);
  await backfillNews();
  await backfillAnnouncements();
  await backfillNotifications();
  console.log('\nDone.');
})().catch((err) => { console.error(err); process.exit(1); });
