# DKC Airconditioning and Refrigeration Services Website

This repository contains the DKC website source code.

The static website files can live in GitHub, but KODA AI requires a backend API. Pure GitHub Pages and direct `index.html` browser testing cannot run `/api/koda-chat`.

## KODA AI backend

KODA uses a Vercel Serverless Function with Google Gemini:

- Frontend request: `/api/koda-chat`
- Backend function: `api/koda-chat.js`
- Required environment variable: `GEMINI_API_KEY`
- Optional environment variable: `GEMINI_MODEL`
- Default model: `gemini-2.5-flash`

Never put the Gemini API key in `index.html`, `script.js`, or any other frontend file.

## Testing

Opening `index.html` directly only tests the static UI. KODA AI responses require the Vercel backend runtime.

Use Vercel local development:

```bash
npm install
npx vercel dev
```

Then open the localhost URL printed by Vercel.

Do not use `npm run dev` for this project. The site is static HTML/CSS/JS with a Vercel `api/` function, so the Vercel CLI should be started directly.

The `npm run serve` command only runs the legacy `server.js` local Node server. It is not the Vercel production runtime.

## Production deployment

1. Keep GitHub as the source repository.
2. Import the repository into Vercel.
3. Add `GEMINI_API_KEY` in Vercel Project Settings -> Environment Variables.
4. Deploy to Vercel.
5. Test KODA on the deployed Vercel URL.

If the site is opened directly from `index.html` or served on pure GitHub Pages, KODA shows a safe fallback message instead of appearing broken.

Vercel deployment trigger - 06/09/2026 10:50:59
