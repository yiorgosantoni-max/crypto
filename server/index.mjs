import http from 'node:http';

const PORT = Number(process.env.PORT || 8787);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const send = (res, status, body) => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  res.end(JSON.stringify(body));
};

const readBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
};

const fetchJson = async (url) => {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Upstream request failed: ${response.status}`);
  return response.json();
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});

  try {
    if (req.method === 'GET' && req.url === '/api/health') {
      return send(res, 200, { ok: true, service: 'coin-rich-ai-api', timestamp: new Date().toISOString() });
    }

    if (req.method === 'GET' && req.url === '/api/market/global') {
      return send(res, 200, await fetchJson('https://api.coingecko.com/api/v3/global'));
    }

    if (req.method === 'GET' && req.url === '/api/market/fear-greed') {
      return send(res, 200, await fetchJson('https://api.alternative.me/fng/?limit=1'));
    }

    if (req.method === 'GET' && req.url === '/api/market/coins') {
      return send(res, 200, await fetchJson('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h'));
    }

    if (req.method === 'POST' && req.url === '/api/ai/chat') {
      const body = await readBody(req);
      const messages = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
      if (!messages.length) return send(res, 400, { error: 'messages are required' });

      if (!OPENAI_API_KEY) {
        return send(res, 503, {
          error: 'AI provider is not configured',
          message: 'Set OPENAI_API_KEY on the server to enable Tuffy AI. No provider secret is exposed to the browser.',
        });
      }

      const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          temperature: 0.2,
          messages: [
            {
              role: 'system',
              content: 'You are Tuffy AI, a crypto market education and analysis assistant. Do not claim to have live data unless it is supplied in the conversation. Do not guarantee profits. Distinguish analysis from financial advice and emphasize risk management.',
            },
            ...messages,
          ],
        }),
      });

      const data = await upstream.json();
      if (!upstream.ok) return send(res, upstream.status, { error: data?.error?.message || 'AI provider request failed' });
      return send(res, 200, { content: data?.choices?.[0]?.message?.content || 'No response generated.' });
    }

    return send(res, 404, { error: 'Not found' });
  } catch (error) {
    console.error(error);
    return send(res, 500, { error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

server.listen(PORT, () => console.log(`Coin Rich AI API listening on http://localhost:${PORT}`));
