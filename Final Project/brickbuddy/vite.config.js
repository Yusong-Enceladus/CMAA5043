import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Dev-mode proxy for Cloudflare Pages Functions.
 *
 * In production the `/api/chat` endpoint is handled by `functions/api/chat.js`
 * running on Cloudflare's edge. Vite's dev server knows nothing about Pages
 * Functions, so without this plugin every `/api/chat` POST falls through to
 * the SPA fallback and returns index.html (200 OK, but HTML not JSON). The
 * client then fails to parse, throws, and the AI fallback chain silently
 * lands on the offline generator — which is why an OpenRouter API key in
 * `.dev.vars` appears to "do nothing" in `npm run dev`.
 *
 * This plugin:
 *   1. Loads `.dev.vars` (same file `wrangler pages dev` reads) into a
 *      fake `env` object.
 *   2. Intercepts POST /api/chat in dev and calls the real handler with
 *      a Web Request / env, just like Cloudflare would.
 *   3. Streams the handler's Web Response back through Vite's Node res.
 */
function cloudflareApiDevPlugin() {
  return {
    name: 'brickbuddy-cf-api-dev',
    configureServer(server) {
      const envPath = resolve(server.config.root, '.dev.vars')
      const env = {}
      if (existsSync(envPath)) {
        const text = readFileSync(envPath, 'utf8')
        for (const line of text.split(/\r?\n/)) {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith('#')) continue
          const m = trimmed.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/i)
          if (!m) continue
          let value = m[2].trim()
          if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1)
          }
          env[m[1]] = value
        }
      }

      if (!env.OPENROUTER_API_KEY) {
        server.config.logger.warn(
          '[brickbuddy] .dev.vars has no OPENROUTER_API_KEY; /api/chat will return 503.'
        )
      } else {
        server.config.logger.info(
          `[brickbuddy] /api/chat dev proxy active (key \u2026${env.OPENROUTER_API_KEY.slice(-6)})`
        )
      }

      server.middlewares.use('/api/chat', async (req, res, next) => {
        if (req.method !== 'POST') return next()
        try {
          const { onRequestPost } = await server.ssrLoadModule('/functions/api/chat.js')

          const chunks = []
          for await (const chunk of req) chunks.push(chunk)
          const body = Buffer.concat(chunks)

          const url = new URL(req.url || '/api/chat', `http://${req.headers.host || 'localhost'}`)
          const webReq = new Request(url, {
            method: 'POST',
            headers: new Headers(req.headers),
            body: body.length ? body : undefined,
          })

          const webRes = await onRequestPost({ request: webReq, env })
          res.statusCode = webRes.status
          webRes.headers.forEach((v, k) => res.setHeader(k, v))
          const respBody = await webRes.arrayBuffer()
          res.end(Buffer.from(respBody))
        } catch (err) {
          server.config.logger.error(`[brickbuddy] /api/chat dev handler failed: ${err?.stack || err}`)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'dev handler crash', detail: String(err?.message || err) }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cloudflareApiDevPlugin()],
  base: './',
})
