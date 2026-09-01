# AgentDesk — running the full submission

AgentDesk is two pieces:

1. **`hackverse-ps01-agentdesk.html`** — the frontend. Open it in any browser.
2. **`agentdesk-server/`** (this folder) — a small backend proxy that holds your
   real Anthropic API key server-side and forwards agent requests to it. The
   frontend talks to this proxy at `http://localhost:8787`, never to Anthropic
   directly.

## Why a backend is required

Opening the HTML file and letting its JavaScript call
`https://api.anthropic.com` directly does not work, and can't be made to work
safely:

- **CORS** — Anthropic's API does not send an `Access-Control-Allow-Origin`
  header permitting requests from a locally opened file (origin `null`) or
  from an arbitrary hosted origin. The browser blocks the request before your
  code sees a real response, which is why it shows up as a generic
  `TypeError: Failed to fetch` rather than a 4xx/5xx you could debug.
- **Secrets** — even if CORS allowed it, the request would need a real API key
  attached client-side, embedded in HTML/JS that ships to whoever opens the
  page. Anyone can read it via view-source. API keys must stay server-side.

The proxy in this folder solves both: it runs on your machine (or wherever you
deploy it), holds `ANTHROPIC_API_KEY` as a server-side environment variable,
and is the only thing that ever talks to `api.anthropic.com`.

## Setup

```bash
cd agentdesk-server
cp .env.example .env
# edit .env and paste your real key: ANTHROPIC_API_KEY=sk-ant-...
node server.js
```

No `npm install` needed — `server.js` uses only Node's built-in `http`/`https`
modules (Node 18+). You should see:

```
AgentDesk proxy listening on http://localhost:8787
  Upstream: https://api.anthropic.com/v1/messages
  API key configured: true
```

Then open `hackverse-ps01-agentdesk.html` in your browser and click **Run
multi-agent analysis**.

## Verifying it's working

- `curl http://localhost:8787/health` should return
  `{"ok":true,"upstream":"https://api.anthropic.com/v1/messages","apiKeyConfigured":true}`.
- If `apiKeyConfigured` is `false`, your `.env` isn't being read — confirm it's
  in `agentdesk-server/.env` (same folder as `server.js`) and has no quotes
  around the key.
- Agent cards that fail will now show the *real* reason in their card (proxy
  unreachable vs. an upstream error vs. a JSON-parsing failure), instead of a
  bare fetch error.

## Testing without a real API key

`test/mock-anthropic-server.js` is a tiny stand-in for the real Anthropic API
(same response shape) and `test/test-flow.js` exercises the exact same
concurrent-agents-then-synthesis flow the frontend uses, against the real
`server.js` proxy pointed at the mock:

```bash
node test/mock-anthropic-server.js &
ANTHROPIC_BASE_URL=http://localhost:9099/v1/messages ANTHROPIC_API_KEY=test-key PORT=8787 node server.js &
node test/test-flow.js
```

This verifies concurrency, structured-JSON parsing, citation presence, and
error handling end-to-end without spending real API credits — but it does not
confirm the real model's output quality, only the wiring. Run a real session
with a real key before the demo.

## Deploying instead of running locally

If you want judges to open a hosted link rather than run this locally, deploy
`agentdesk-server/` to any Node host (Render, Railway, Fly.io, a small VM,
etc.), set `ANTHROPIC_API_KEY` there as an environment variable, and change
`AGENT_PROXY_URL` near the top of the `callClaude` function in the HTML file
to your deployed proxy's URL. Never put the API key in the HTML file itself.
