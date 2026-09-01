// Exercises the exact same request/response flow the frontend performs
// (three concurrent agent calls -> synthesis call), through the real
// proxy server (server.js), which in this test run is pointed at the
// local mock Anthropic server instead of the real internet endpoint.
// This verifies concurrency, JSON parsing, and error handling logic
// without requiring outbound internet access.

const PROXY_URL = 'http://localhost:8787/api/messages';

async function callClaude(promptText) {
  const start = Date.now();
  const response = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: promptText }],
    }),
  });
  const latencyMs = Date.now() - start;
  if (!response.ok) {
    const errBody = await response.text();
    return { ok: false, error: `HTTP ${response.status}: ${errBody}`, latencyMs };
  }
  const data = await response.json();
  const text = (data.content || []).map(b => b.text || '').join('\n');
  let parsed;
  try { parsed = JSON.parse(text.replace(/```json|```/g, '').trim()); }
  catch (e) { return { ok: false, error: 'parse_failed: ' + e.message, latencyMs }; }
  return { ok: true, data: parsed, latencyMs };
}

function momentumPrompt() {
  return `You are the Momentum Agent inside a multi-agent retail-investment research desk. Respond with ONLY a JSON object matching {"dimension":"price_momentum","signal":"BUY|HOLD|SELL","confidence":0.0,"reasoning":"...","key_metrics":{}}`;
}
function volumePrompt() {
  return `You are the Volume/Anomaly Agent inside a multi-agent retail-investment research desk. Respond with ONLY a JSON object matching {"dimension":"volume_anomaly","signal":"BUY|HOLD|SELL","confidence":0.0,"reasoning":"...","anomaly_detected":true,"key_metrics":{}}`;
}
function sentimentPrompt() {
  return `You are the Sentiment & Fundamentals Agent inside a multi-agent retail-investment research desk. Respond with ONLY a JSON object matching {"dimension":"sentiment_fundamental","signal":"BUY|HOLD|SELL","confidence":0.0,"reasoning":"...","citations":[]}`;
}
function synthesisPrompt(agentOutputs) {
  return `You are the Synthesis Agent on a multi-agent retail-investment research desk. Combine these agent outputs: ${JSON.stringify(agentOutputs)}. Respond with ONLY a JSON object matching {"action":"BUY|HOLD|SELL|REDUCE|AVOID","confidence":0.0,"headline":"...","personalized_reasoning":"...","conflicts_noted":null,"risk_adjustment_note":"...","citations":[]}`;
}

let pass = 0, fail = 0;
function check(label, cond) {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ FAILED: ${label}`); }
}

async function main() {
  console.log('--- Test 1: three agents run concurrently and return consistent structured JSON ---');
  const t0 = Date.now();
  const [momentum, volume, sentiment] = await Promise.all([
    callClaude(momentumPrompt()),
    callClaude(volumePrompt()),
    callClaude(sentimentPrompt()),
  ]);
  const wallClock = Date.now() - t0;

  check('momentum agent call succeeded', momentum.ok === true);
  check('momentum output has dimension=price_momentum', momentum.ok && momentum.data.dimension === 'price_momentum');
  check('momentum output has numeric confidence', momentum.ok && typeof momentum.data.confidence === 'number');

  check('volume agent call succeeded', volume.ok === true);
  check('volume output has dimension=volume_anomaly', volume.ok && volume.data.dimension === 'volume_anomaly');

  check('sentiment agent call succeeded', sentiment.ok === true);
  check('sentiment output has dimension=sentiment_fundamental', sentiment.ok && sentiment.data.dimension === 'sentiment_fundamental');
  check('sentiment output includes citations array', sentiment.ok && Array.isArray(sentiment.data.citations) && sentiment.data.citations.length > 0);

  const sumLatency = momentum.latencyMs + volume.latencyMs + sentiment.latencyMs;
  check('calls ran concurrently (wall clock << sum of individual latencies)', wallClock < sumLatency * 0.8);
  console.log(`  (wall clock ${wallClock}ms vs sum-of-latencies ${sumLatency}ms across 3 calls)`);

  console.log('\n--- Test 2: synthesis agent receives all three outputs and produces a final call ---');
  const agentOutputs = {
    momentum: momentum.ok ? momentum.data : null,
    volume: volume.ok ? volume.data : null,
    sentiment: sentiment.ok ? sentiment.data : null,
  };
  const synthesis = await callClaude(synthesisPrompt(agentOutputs));
  check('synthesis call succeeded', synthesis.ok === true);
  check('synthesis output has an action field', synthesis.ok && typeof synthesis.data.action === 'string');
  check('synthesis output has numeric confidence', synthesis.ok && typeof synthesis.data.confidence === 'number');
  check('synthesis output has personalized_reasoning', synthesis.ok && typeof synthesis.data.personalized_reasoning === 'string' && synthesis.data.personalized_reasoning.length > 0);
  check('synthesis output has citations array', synthesis.ok && Array.isArray(synthesis.data.citations));
  check('synthesis output explicitly notes the momentum/sentiment conflict', synthesis.ok && typeof synthesis.data.conflicts_noted === 'string' && synthesis.data.conflicts_noted.length > 0);

  console.log('\n--- Test 3: proxy surfaces upstream errors instead of masking them (bad model name) ---');
  const badResponse = await fetch(PROXY_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: null, max_tokens: 1000, messages: null }),
  });
  const badBody = await badResponse.json();
  check('missing model/messages -> HTTP 400 from proxy (not silently succeeding)', badResponse.status === 400);
  check('error body names the real problem', badBody.error === 'bad_request');

  console.log('\n--- Test 4: proxy refuses to run with no API key configured (server on :8788, no ANTHROPIC_API_KEY) ---');
  try {
    const noKeyResponse = await fetch('http://localhost:8788/api/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1000, messages: [{ role: 'user', content: 'hi' }] }),
    });
    const noKeyBody = await noKeyResponse.json();
    check('no-key server -> HTTP 500 (not a silent fake success)', noKeyResponse.status === 500);
    check('error names the real problem (server_misconfigured)', noKeyBody.error === 'server_misconfigured');
  } catch (e) {
    check('no-key server reachable on :8788', false);
    console.log('    (start it with: PORT=8788 node server.js, no ANTHROPIC_API_KEY set)');
  }

  console.log(`\n=== ${pass} passed, ${fail} failed ===`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error('Test script crashed:', e); process.exit(1); });
