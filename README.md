# Mushee Cloud

A Vercel-ready Next.js demo for Mushee Cloud: a premium AI workspace with Stellar testnet XLM payments today and SHX mainnet settlement positioning later.

## Features
- White/black premium landing page with animated raining logos and glass bars
- Dashboard with chat, image, tasks, wallet, faucet, and locked vault sections
- Freighter wallet connection for Stellar testnet
- Testnet XLM payment flow to treasury before prompt execution
- Secure Gemini proxy route using server-side environment variables
- Mushee website and Twitter links included

## Environment variables
Copy `.env.example` to `.env.local` and fill in:

- `GEMINI_API_KEY`
- `TREASURY_STELLAR_ADDRESS`
- `NEXT_PUBLIC_MUSHEE_WEBSITE`
- `NEXT_PUBLIC_MUSHEE_TWITTER`
- `NEXT_PUBLIC_PROMPT_COST_XLM`

## Local development
```bash
npm install
npm run dev
```

## Deploy to Vercel
1. Upload this project to GitHub or drag-and-drop into Vercel.
2. Add the environment variables from `.env.example` in Vercel.
3. Deploy.

## Notes
- The wallet flow is designed for Freighter on Stellar testnet.
- The faucet button points to the Stellar Laboratory testnet account creator.
- The Gemini route returns text for both chat and image requests. The image panel is prepared for a future dedicated image generation backend.
