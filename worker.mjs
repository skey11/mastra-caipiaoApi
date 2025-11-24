// Wrapper to forward requests to Mastra build output, adding CORS.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

const withCors = (resp) => {
  const newHeaders = new Headers(resp.headers);
  Object.entries(CORS_HEADERS).forEach(([k, v]) => newHeaders.set(k, v));
  return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers: newHeaders });
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Lazy import Mastra bundle
    const app = await import('./.mastra/output/index.mjs');
    const handler =
      (typeof app.fetch === 'function' && app.fetch) ||
      (app.default && typeof app.default.fetch === 'function' && app.default.fetch);

    if (!handler) {
      return new Response('No Mastra fetch handler', { status: 500, headers: CORS_HEADERS });
    }

    const resp = await handler(request, env, ctx);
    return withCors(resp);
  },
};
