# BrickBuddy — AI-Powered LEGO Robot Building Assistant

**CMAA5043 Final Project** | Yusong, Jiayi

BrickBuddy is an interactive AI assistant that helps children aged 6–8 build LEGO robots through multimodal voice and image interaction, with integrated STEAM education and emotional support.

## Architecture

```
┌────────────────────┐      fetch /api/chat      ┌─────────────────────┐
│  React SPA (Vite)  │ ───────────────────────▶  │  Pages Function     │
│  · 3D LEGO viewer  │                           │  · validates payload │
│  · voice + camera  │ ◀─────────── JSON ─────── │  · model fallback    │
│  · chat UI         │                           │  · holds API key     │
└────────────────────┘                           └──────────┬──────────┘
                                                            │
                                                            ▼
                                                   ┌─────────────────┐
                                                   │   OpenRouter    │
                                                   │ (free models)   │
                                                   └─────────────────┘
```

The OpenRouter API key lives only in the Cloudflare Pages environment; the browser never sees it.

## Features
- **Live AI chat** with a rule-based fallback when the network is unavailable
- **Multimodal input**: voice (Web Speech API), camera (getUserMedia), template selection
- **Data-driven 3D viewer** (react-three-fiber) — bricks assemble step-by-step with a highlight on just-added parts
- **8 detailed steps** per robot (Dog / Car / Dino Bot) with STEAM tips and piece lists
- **Emotional support** banners and sound effects
- **Progress persistence** via localStorage

## Local development

### Option A — UI only (no live AI)
```bash
npm install
npm run dev
```
Chat falls back to the rule-based engine because `/api/chat` isn't served by Vite.

### Option B — Full stack with the AI proxy (recommended)
1. Copy `.dev.vars.example` to `.dev.vars` and paste your OpenRouter key.
2. Build the app and serve it behind the Pages runtime:
   ```bash
   npm run dev:full
   ```
   This runs `vite build` then `wrangler pages dev ./dist`, exposing both static assets and the `/api/chat` function on one port.

## Deployment (Cloudflare Pages)

1. Push to GitHub.
2. In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git**, pick this repo.
3. Build settings:
   - Framework preset: **None (Vite)**
   - Build command: `npm install && npm run build`
   - Build output directory: `dist`
   - Root directory: `Final Project/brickbuddy`
4. Environment variables (Production + Preview):
   - `OPENROUTER_API_KEY` = `sk-or-v1-…` (mark as **Encrypted**)
5. Save and deploy. First build takes ~2 min.

Optional: add a rate-limit rule in **Security → WAF → Rate limiting rules** targeting `/api/*` at e.g. 10 req/min per IP.

## Tech stack
- React 19 + Vite 8
- @react-three/fiber + @react-three/drei
- Cloudflare Pages + Pages Functions
- OpenRouter (Llama 3.3 70B primary; GLM, Nemotron, Gemma fallbacks)

## Repo
https://github.com/Yusong-Enceladus/CMAA5043
