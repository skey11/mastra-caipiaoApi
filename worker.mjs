// Wrapper to expose a module-worker compatible fetch for Cloudflare.
import * as app from './.mastra/output/index.mjs';

export default {
  async fetch(request, env, ctx) {
    if (typeof app.fetch === 'function') {
      return app.fetch(request, env, ctx);
    }
    if (app.default && typeof app.default.fetch === 'function') {
      return app.default.fetch(request, env, ctx);
    }
    throw new Error('No fetch handler found in built Mastra bundle');
  },
};
