// Netlify serverless function — handles /api/search and /api/download
// The bot (MQTT/Facebook messaging) does NOT run here — serverless only handles web requests.

let scReady = false;
async function ensureSC() {
  if (scReady) return;
  const play = require('play-dl');
  const id = await play.getFreeClientID();
  await play.setToken({ soundcloud: { client_id: id } });
  scReady = true;
}

exports.handler = async function (event, context) {
  const path = event.path.replace('/.netlify/functions/api', '').replace('/api', '') || '/';
  const q = event.queryStringParameters || {};

  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }

  // /search or /api/search
  if (path === '/search' || path === '' && q.q) {
    if (!q.q) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Missing q' }) };
    try {
      await ensureSC();
      const play = require('play-dl');
      const results = await play.search(q.q, { source: { soundcloud: 'tracks' }, limit: 10 });
      const mapped = results.map(r => ({
        title:     r.name || r.title || 'Unknown',
        url:       r.url,
        duration:  r.durationInSec || 0,
        thumbnail: r.thumbnails?.[0]?.url || r.thumbnail?.url || r.thumbnails?.[0] || '',
        artist:    r.user?.name || r.publisher?.name || 'Unknown Artist',
      }));
      return { statusCode: 200, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify({ results: mapped }) };
    } catch (e) {
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: e.message }) };
    }
  }

  // /health
  if (path === '/health') {
    return {
      statusCode: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'online', platform: 'netlify', botMode: 'web-only' })
    };
  }

  return { statusCode: 404, headers: cors, body: 'Not found' };
};
