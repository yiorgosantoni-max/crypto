# Vercel Deployment

This project is a Vite SPA. `vercel.json` explicitly sets the Vite build output
to `dist` and adds an SPA fallback so direct navigation to client-side routes
does not return a Vercel 404.

## Vercel settings

Use:

- Framework Preset: Vite (or leave automatic detection enabled)
- Build Command: `npm run build`
- Output Directory: `dist`

## Environment variables

Frontend variables should be added in Vercel Project Settings:

- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL` (only after the API is deployed)

Never put server secrets in `VITE_*` variables.

## Security note

The uploaded archive contained unexpected obfuscated JavaScript appended to
`vite.config.ts` after the legitimate Vite configuration. That payload has
been removed in this cleaned build. Do not restore it. If the same payload
exists in the GitHub repository, inspect the commit history and rotate any
credentials that were present in the affected repository.
