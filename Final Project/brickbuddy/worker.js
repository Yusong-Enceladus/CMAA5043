/**
 * BrickBuddy — Cloudflare Worker entrypoint for Workers Builds.
 *
 * Serves the built Vite SPA from the ASSETS binding and handles the
 * `/api/chat` proxy by delegating to the shared chat handler in
 * `functions/api/chat.js`. Using one handler module keeps the code
 * compatible with both Workers Builds and classic Pages Functions.
 */

import { onRequestPost } from './functions/api/chat.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/chat') {
      if (request.method !== 'POST') {
        return new Response('method not allowed', { status: 405, headers: { Allow: 'POST' } });
      }
      return onRequestPost({ request, env });
    }

    return env.ASSETS.fetch(request);
  },
};
