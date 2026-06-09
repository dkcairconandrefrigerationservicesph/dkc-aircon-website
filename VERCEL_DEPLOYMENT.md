# Vercel deployment notes

This site uses a Vercel Serverless Function for KODA AI with Google Gemini:

- Frontend endpoint: `/api/koda-chat`
- Serverless function: `api/koda-chat.js`
- Required environment variable: `GEMINI_API_KEY`
- Optional environment variable: `GEMINI_MODEL`
- Default model: `gemini-2.5-flash`

Do not put the Gemini API key in `index.html`, `script.js`, or any frontend file.

## Local testing

Opening `index.html` directly in the browser will not run KODA AI because `file://` pages do not have a Vercel API runtime.

Use:

```bash
npm install
npx vercel dev
```

Then open the localhost URL printed by Vercel.

Do not point an npm `dev` script at `vercel dev`. Vercel can detect and invoke the npm dev script, which causes `vercel dev must not recursively invoke itself`.

`server.js` is only a legacy/manual local Node server. For the Vercel serverless API route, use `npx vercel dev`.

## Vercel setup

1. Import this repository into Vercel.
2. Add `GEMINI_API_KEY` in Vercel Project Settings -> Environment Variables.
3. Deploy the project.
4. Test KODA on the deployed Vercel URL.

GitHub Pages can still serve static HTML, CSS, and JS, but it cannot run `/api/koda-chat`.
