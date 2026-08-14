// Realtime WebSocket smoke test + damage assessment via real PNG.
import WebSocket from 'ws';
import sharp from 'sharp';

const WS_URL = process.env.WS_URL ?? 'ws://127.0.0.1:4000/ws';
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:4000';

function req(method, path, body, token) {
  return fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (r) => {
    const text = await r.text();
    let json;
    try { json = JSON.parse(text); } catch { json = text; }
    if (!r.ok) throw new Error(`${r.status} ${text.slice(0, 300)}`);
    return json;
  });
}

async function makePng() {
  // Real 64x64 image so image validation passes.
  const buf = await sharp({
    create: { width: 64, height: 64, channels: 3, background: { r: 180, g: 60, b: 40 } },
  }).png().toBuffer();
  return buf.toString('base64');
}

async function main() {
  const results = [];
  let failures = 0;

  // WebSocket test
  await new Promise((resolve) => {
    const ws = new WebSocket(WS_URL);
    const got = [];
    ws.on('open', () => {
      ws.send(JSON.stringify({ action: 'subscribe', channels: ['admin', 'public'] }));
    });
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      got.push(msg.type);
      if (msg.type === 'system:connected') {
        // Trigger a real event to observe streaming.
        req('POST', '/api/v1/sos', {
          type: 'medical',
          latitude: 20.3,
          longitude: 85.83,
          description: 'cardiac patient needs help',
        }).then(() => {});
      }
      if (msg.type === 'sos:new') {
        results.push({ name: `realtime sos:new (priority=${msg.payload.priorityLabel}, highPriority=${msg.highPriority})`, ok: true, data: got.join(',') });
        ws.close();
        resolve();
      }
    });
    ws.on('error', (e) => {
      results.push({ name: 'realtime connect', ok: false, error: e.message });
      failures++;
      resolve();
    });
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        results.push({ name: 'realtime event timeout', ok: false, error: 'no sos:new received' });
        failures++;
        ws.close();
        resolve();
      }
    }, 8000);
  });

  // Damage assessment (real PNG, should persist and return compensation)
  try {
    const r = await req('POST', '/api/v1/damage-assessment', {
      imageBase64: await makePng(),
      mimeType: 'image/png',
      reportedLatitude: 20.3,
      reportedLongitude: 85.83,
    });
    results.push({ name: 'damage-assessment (ML fallback MINOR)', ok: true, data: r.data });
  } catch (e) {
    results.push({ name: 'damage-assessment', ok: false, error: e.message });
    failures++;
  }

  // Duplicate detection test
  try {
    const r2 = await req('POST', '/api/v1/damage-assessment', {
      imageBase64: await makePng(),
      mimeType: 'image/png',
      reportedLatitude: 20.3,
      reportedLongitude: 85.83,
    });
    results.push({ name: `damage-assessment duplicate=${r2.data.duplicate}`, ok: r2.data.duplicate === true, data: r2.data });
    if (r2.data.duplicate !== true) failures++;
  } catch (e) {
    results.push({ name: 'damage-assessment duplicate', ok: false, error: e.message });
    failures++;
  }

  console.log('\n=== Realtime + Damage Smoke Results ===');
  for (const r of results) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}  ${r.ok && r.data ? '-> ' + JSON.stringify(r.data).slice(0, 200) : ''}${!r.ok ? '(' + r.error + ')' : ''}`);
  }
  console.log(`\n${results.length - failures}/${results.length} passed`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
