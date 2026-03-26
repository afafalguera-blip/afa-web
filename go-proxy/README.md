# go.afafalguera.com proxy (Vercel)

This folder is intended to be deployed as a **separate Vercel project** with:

- **Root Directory**: `go-proxy`
- **Custom Domain**: `go.afafalguera.com`

The `vercel.json` rewrites:

- `https://go.afafalguera.com/<slug>`
  -> `https://zaxbtnjkidqwzqsehvld.functions.supabase.co/go/<slug>`

So short URLs can be used without exposing the Supabase Function path.
