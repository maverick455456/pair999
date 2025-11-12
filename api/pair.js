// /api/pair.js
export default async function handler(req, res) {
  // Allow only POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { number } = req.body || {};
    const clean = String(number || '').replace(/[^\d]/g, '');
    if (!clean) return res.status(400).json({ error: 'Invalid number' });

    const API_BASE = 'https://pair---dd-b14660533d0e.herokuapp.com/pair1';
    const TOKEN = 'mrdilaofche';
    const url = `${API_BASE}?token=${encodeURIComponent(TOKEN)}&number=${encodeURIComponent(clean)}`;

    // Server-side fetch → no CORS issue
    const r = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json, text/plain;q=0.9' } });
    const raw = await r.text();

    // Try JSON first
    let code = null, msg = '';
    try {
      const data = JSON.parse(raw);
      code = data.code || data.pairCode || null;
      msg  = data.msg  || data.message || '';
    } catch (_) {
      // Fallback: pull from text
      const jsonCodeMatch = /"code"\s*:\s*"([^"]+)"/i.exec(raw);
      const digitMatch    = /\b(\d{6,8})\b/.exec(raw);
      const groupMatch    = /\b([A-Z0-9]{4,10})\b/i.exec(raw);
      code = (jsonCodeMatch && jsonCodeMatch[1]) || (digitMatch && digitMatch[1]) || (groupMatch && groupMatch[1]) || null;
    }

    if (!r.ok) {
      return res.status(r.status).json({ error: msg || raw || `HTTP ${r.status}` });
    }

    return res.status(200).json({
      code: code || 'No code',
      msg:  msg  || 'Use this in WhatsApp → Linked Devices.'
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Internal error' });
  }
}
