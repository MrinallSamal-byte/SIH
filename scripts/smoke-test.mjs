const base = process.env.BASE_URL ?? 'http://127.0.0.1:4000';
let failures = 0;
const results = [];

async function call(name, fn) {
  try {
    const out = await fn();
    results.push({ name, ok: true, data: out });
  } catch (e) {
    results.push({ name, ok: false, error: e.message });
    failures++;
  }
}

function req(method, path, body, token) {
  return fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (r) => {
    const text = await r.text();
    let json;
    try { json = JSON.parse(text); } catch { json = text; }
    if (!r.ok) throw new Error(`${r.status} ${text.slice(0, 300)}`);
    return json;
  });
}

async function main() {
  await call('health', () => req('GET', '/health'));

  // Public
  let trackingId;
  await call('POST /sos', async () => {
    const r = await req('POST', '/api/v1/sos', {
      type: 'flood',
      latitude: 20.31,
      longitude: 85.84,
      description: 'Family trapped on roof, water rising, pregnant woman',
      reporterName: 'Smoke Test',
      reporterPhone: '+91-0000000000',
    });
    trackingId = r.data.trackingId;
    if (r.data.priorityLabel !== 'RED') throw new Error('expected RED triage');
    return r.data;
  });

  await call('GET /reports/track', () => req('GET', `/api/v1/reports/track/${trackingId}`));

  await call('POST /checkins', () =>
    req('POST', '/api/v1/checkins', { fullName: 'Smoke', status: 'safe', latitude: 20.2, longitude: 85.8 }));

  await call('GET /shelters/nearby', () =>
    req('GET', '/api/v1/shelters/nearby?latitude=20.27&longitude=85.83&radiusKm=10'));

  await call('GET /alerts', () => req('GET', '/api/v1/alerts'));

  await call('POST /pfa/chat', () =>
    req('POST', '/api/v1/pfa/chat', { message: 'I am panicking and can\'t breathe' }));

  await call('GET /safe-routes/hazards', () => req('GET', '/api/v1/safe-routes/hazards'));

  // Admin
  let token;
  await call('POST /admin/auth/login', async () => {
    const r = await req('POST', '/api/v1/admin/auth/login', {
      email: 'admin@aapdasetu.org',
      password: 'Admin@123',
    });
    token = r.data.token;
    return { loggedIn: true };
  });

  await call('POST /missing/matches', async () => {
    const list = await req('GET', '/api/v1/admin/reports?type=missing_person', undefined, token);
    const r = list.data.items.find((x) => x.type === 'missing_person');
    if (!r) throw new Error('no missing_person report found');
    return req('POST', '/api/v1/missing/matches', { reportId: r.id });
  });

  await call('GET /admin/auth/me', () => req('GET', '/api/v1/admin/auth/me', undefined, token));
  await call('GET /admin/overview', () => req('GET', '/api/v1/admin/overview', undefined, token));
  await call('GET /admin/reports', () => req('GET', '/api/v1/admin/reports?status=pending', undefined, token));
  await call('GET /admin/volunteers', () => req('GET', '/api/v1/admin/volunteers?status=available', undefined, token));
  await call('GET /admin/shelters', () => req('GET', '/api/v1/admin/shelters', undefined, token));
  await call('GET /admin/agencies', () => req('GET', '/api/v1/admin/agencies', undefined, token));
  await call('GET /admin/resources', () => req('GET', '/api/v1/admin/resources', undefined, token));
  await call('GET /admin/alerts', () => req('GET', '/api/v1/admin/alerts', undefined, token));
  await call('GET /admin/analytics', () => req('GET', '/api/v1/admin/analytics', undefined, token));
  await call('GET /admin/audit-logs', () => req('GET', '/api/v1/admin/audit-logs', undefined, token));
  await call('GET /admin/checkins', () => req('GET', '/api/v1/admin/checkins', undefined, token));
  await call('GET /admin/damage-assessments', () => req('GET', '/api/v1/admin/damage-assessments', undefined, token));
  await call('GET /admin/missing/matches', () => req('GET', '/api/v1/admin/missing/matches', undefined, token));
  await call('GET /admin/hazards', () => req('GET', '/api/v1/admin/hazards', undefined, token));

  // Admin mutations
  await call('POST /admin/alerts', () =>
    req('POST', '/api/v1/admin/alerts', { title: 'Smoke Alert', message: 'Test message', severity: 'warning', channel: 'public' }, token));
  await call('PATCH /admin/reports/status', async () => {
    const list = await req('GET', '/api/v1/admin/reports?pageSize=1', undefined, token);
    const id = list.data.items[0].id;
    return req('PATCH', `/api/v1/admin/reports/${id}/status`, { status: 'in_progress' }, token);
  });
  await call('POST /admin/volunteers', () =>
    req('POST', '/api/v1/admin/volunteers', { name: 'Smoke Volunteer', phone: '+91-1111111111', skills: ['medical'] }, token));
  await call('POST /admin/shelters', () =>
    req('POST', '/api/v1/admin/shelters', { name: 'Smoke Shelter', address: 'Test', latitude: 20.3, longitude: 85.83, capacity: 100, facilities: ['water'] }, token));
  await call('POST /admin/hazards', () =>
    req('POST', '/api/v1/admin/hazards', { type: 'road_closed', name: 'Test closed road', geometry: { type: 'Point', coordinates: [85.8, 20.2] } }, token));

  // Auth guard
  await call('admin requires token (401 expected)', async () => {
    try {
      await req('GET', '/api/v1/admin/overview');
      throw new Error('should have been 401');
    } catch (e) {
      if (!/401|403/.test(e.message)) throw e;
      return 'rejected as expected';
    }
  });

  // Invalid login
  await call('invalid login (401 expected)', async () => {
    try {
      await req('POST', '/api/v1/admin/auth/login', { email: 'admin@aapdasetu.org', password: 'wrong' });
      throw new Error('should have been 401');
    } catch (e) {
      if (!/401/.test(e.message)) throw e;
      return 'rejected as expected';
    }
  });

  console.log('\n=== Smoke Test Results ===');
  for (const r of results) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok && r.data ? '  -> ' + JSON.stringify(r.data).slice(0, 120) : ''}${!r.ok ? '  (' + r.error + ')' : ''}`);
  }
  console.log(`\n${results.length - failures}/${results.length} passed`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('Smoke runner failed:', e.message);
  process.exit(1);
});
