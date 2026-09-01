// AgentDesk backend proxy — zero external dependencies (Node 18+ built-ins only).
//
// Why this exists: browsers cannot call https://api.anthropic.com directly from
// client-side JS. Two independent reasons:
//   1. CORS — api.anthropic.com does not send Access-Control-Allow-Origin for
//      arbitrary browser origins (and a static HTML file opened locally has
//      origin "null" / "file://", which is never allowed). The browser blocks
//      the request before your code ever sees a real HTTP status, which is why
//      it surfaces as a generic "TypeError: Failed to fetch" instead of a 4xx/5xx.
//   2. Secrets — even if CORS allowed it, calling the API from the browser would
//      require shipping a real API key inside the HTML/JS that ships to the
//      user, readable by anyone via view-source.
//
// This server sits between the AgentDesk frontend and the real Anthropic API:
// it holds the key as a server-side environment variable, forwards requests on
// the frontend's behalf, and sends back permissive CORS headers of its own
// (this is a local dev proxy, not a public deployment).
//
// Run:
//   cd agentdesk-server
//   cp .env.example .env   # then paste your real key into .env
//   node server.js
// Then open hackverse-ps01-agentdesk.html in a browser (it calls
// http://localhost:8787/api/messages by default). No npm install required.

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// --- minimal .env loader (no dependency needed) ---
function loadDotEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadDotEnv();

const PORT = process.env.PORT || 8787;
// Lets the test suite point this server at a local mock instead of the real
// Anthropic API, without touching server logic.
const UPSTREAM_URL = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com/v1/messages';
const API_KEY = process.env.ANTHROPIC_API_KEY;

function withCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, status, obj) {
  withCors(res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; if (data.length > 2_000_000) req.destroy(); });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function forwardToUpstream(payload) {
  return new Promise((resolve, reject) => {
    const url = new URL(UPSTREAM_URL);
    const body = JSON.stringify(payload);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;
    const reqOpts = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
    };
    const upstreamReq = lib.request(reqOpts, upstreamRes => {
      let chunks = '';
      upstreamRes.on('data', c => chunks += c);
      upstreamRes.on('end', () => resolve({ status: upstreamRes.statusCode, body: chunks }));
    });
    upstreamReq.on('error', reject);
    upstreamReq.write(body);
    upstreamReq.end();
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { withCors(res); res.writeHead(204); return res.end(); }

  if (req.method === 'GET' && req.url === '/health') {
    return sendJson(res, 200, { ok: true, upstream: UPSTREAM_URL, apiKeyConfigured: Boolean(API_KEY) });
  }

  if (req.method === 'POST' && req.url === '/api/messages') {
    if (!API_KEY) {
      return sendJson(res, 500, {
        error: 'server_misconfigured',
        message: 'ANTHROPIC_API_KEY is not set on the server. Copy .env.example to .env and add your key, then restart the server.',
      });
    }

    let parsedBody;
    try {
      parsedBody = JSON.parse(await readBody(req));
    } catch (e) {
      return sendJson(res, 400, { error: 'bad_request', message: 'Request body must be valid JSON.' });
    }
    const { model, max_tokens, messages } = parsedBody || {};
    if (!model || !messages) {
      return sendJson(res, 400, { error: 'bad_request', message: 'Request body must include model and messages.' });
    }

    try {
      const upstream = await forwardToUpstream({ model, max_tokens, messages });
      if (upstream.status < 200 || upstream.status >= 300) {
        // Forward the real upstream status/error instead of masking it as a generic failure.
        return sendJson(res, upstream.status, { error: 'upstream_error', status: upstream.status, message: upstream.body });
      }
      withCors(res);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(upstream.body);
    } catch (err) {
      // Network-level failure actually talking to Anthropic (DNS, TLS, connection refused, etc).
      return sendJson(res, 502, { error: 'proxy_fetch_failed', message: String(err && err.message ? err.message : err) });
    }
  }

  sendJson(res, 404, { error: 'not_found' });
});

server.listen(PORT, () => {
  console.log(`AgentDesk proxy listening on http://localhost:${PORT}`);
  console.log(`  Upstream: ${UPSTREAM_URL}`);
  console.log(`  API key configured: ${Boolean(API_KEY)}`);
});
