// Stands in for https://api.anthropic.com/v1/messages during local testing,
// since this sandbox has no outbound internet access to the real API.
// It returns responses shaped exactly like the real API
// ({ content: [{ type: "text", text: "..." }] }) so the proxy and frontend
// logic can be exercised end-to-end.

const http = require('http');

function replyFor(promptText) {
  if (promptText.includes('Momentum Agent')) {
    return { dimension: "price_momentum", signal: "BUY", confidence: 0.72, reasoning: "RSI and the moving-average crossover both point up.", key_metrics: { rsi_read: "62", trend_state: "uptrend" } };
  }
  if (promptText.includes('Volume/Anomaly Agent')) {
    return { dimension: "volume_anomaly", signal: "HOLD", confidence: 0.55, reasoning: "Volume is close to its 30-day average, no clear anomaly.", anomaly_detected: false, key_metrics: { volume_vs_avg_pct: "4.1%" } };
  }
  if (promptText.includes('Sentiment & Fundamentals Agent')) {
    return { dimension: "sentiment_fundamental", signal: "HOLD", confidence: 0.5, reasoning: "DOC-T2 flags a pending regulatory inquiry that offsets the positive guidance in DOC-T1.", citations: [{ source_id: "DOC-T1", source: "Q1 FY26 Earnings Call Transcript (synthetic)" }, { source_id: "DOC-T2", source: "SEBI Corporate Filing — Risk Factors (synthetic)" }] };
  }
  if (promptText.includes('Synthesis Agent')) {
    return { action: "HOLD", confidence: 0.6, headline: "Mixed signals warrant a hold, not a fresh entry.", personalized_reasoning: "Momentum is constructive but the regulatory overhang flagged in filings and the moderate risk profile argue against adding risk right now.", conflicts_noted: "Momentum agent leans bullish while the sentiment agent flags an unresolved regulatory inquiry; this call treats the fundamental risk as the deciding factor.", risk_adjustment_note: "A moderate risk profile does not chase the bullish technical signal alone given the open regulatory question.", citations: [{ source_id: "DOC-T2", source: "SEBI Corporate Filing — Risk Factors (synthetic)" }] };
  }
  return { error: "unrecognized_prompt_in_mock" };
}

const server = http.createServer((req, res) => {
  if (req.method !== 'POST') { res.writeHead(404); return res.end(); }
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    let parsed;
    try { parsed = JSON.parse(body); } catch (e) {
      res.writeHead(400); return res.end(JSON.stringify({ error: 'bad json' }));
    }
    const promptText = (parsed.messages || []).map(m => m.content).join('\n');
    const payload = replyFor(promptText);
    const responseBody = {
      content: [{ type: 'text', text: JSON.stringify(payload) }],
    };
    // Simulate realistic network latency so latency measurement logic is exercised.
    setTimeout(() => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(responseBody));
    }, 150 + Math.round(Math.random() * 200));
  });
});

server.listen(9099, () => console.log('Mock Anthropic API listening on http://localhost:9099'));
