// End-to-end API smoke test. Usage: node scripts/smoke.mjs [baseUrl]
const B = process.argv[2] || 'http://localhost:8787';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const login = async (u) => (await (await fetch(B + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: 'Demo@123' }) })).json());
const call = async (t, m, p, b) => { const r = await fetch(B + '/api' + p, { method: m, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: b ? JSON.stringify(b) : undefined }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
const T = {}; const U = {};
for (const u of ['field1', 'field2', 'mandal1', 'approver1']) { const r = await login(u); T[u] = r.token; U[u] = r.user; ok(!!r.token, 'login ' + u); }
ok((await login('field1').then(() => fetch(B + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'field1', password: 'bad' }) }))).status === 401, 'bad password rejected');
ok((await fetch(B + '/api/grievances')).status === 401, 'unauthenticated rejected');

for (const u of Object.keys(T)) { const d = await call(T[u], 'GET', '/dashboard'); ok(d.s === 200 && d.j.total >= 12, `dashboard ${u} total=${d.j.total} pending=${d.j.pending} overdue=${d.j.overdue}`); }

// Stage 1 — register
const tri = await call(T.mandal1, 'POST', '/ai/triage', { description: 'Drinking water has not come for 5 days in our street, elderly people suffering.' });
ok(tri.s === 200 && tri.j.mode && tri.j.result.category, `ai triage mode=${tri.j.mode} cat=${tri.j.result?.category}`);
ok((await call(T.field1, 'POST', '/grievances', {})).s === 403, 'field officer cannot register');
const bad = await call(T.mandal1, 'POST', '/grievances', { citizenName: 'X', village: '', phone: '123', category: 'roads', priority: 'low', description: 'short' });
ok(bad.s === 400, 'registration validation');
const cr = await call(T.mandal1, 'POST', '/grievances', { citizenName: 'Demo Citizen Test', village: 'Testpalli', phone: '9000000099', category: 'water_supply', priority: 'high', description: 'No drinking water for five days in our street.', attachments: [{ fileName: 'a.png', mimeType: 'image/png', dataBase64: 'iVBORw0KGgo=' }] });
ok(cr.s === 201 && /^PP-\d{4}-\d{5}$/.test(cr.j.refNo), 'created ' + cr.j.refNo);
const id = cr.j.id;
// skipping stages
ok((await call(T.approver1, 'POST', `/grievances/${id}/decision`, { decision: 'approve', confirm: true })).s === 409, 'cannot skip to decision');
ok((await call(T.field1, 'POST', `/grievances/${id}/verification`, { visitDate: '2024-01-01', observations: 'x'.repeat(20), findings: 'y'.repeat(20), outcome: 'verified' })).s === 409, 'field cannot verify unassigned/registered');
ok((await call(T.field1, 'GET', `/grievances/${id}`)).s === 403, 'field officer cannot open unassigned case');
// Stage 2
ok((await call(T.field1, 'POST', `/grievances/${id}/assign`, { assigneeId: U.field1.id })).s === 403, 'field cannot assign');
ok((await call(T.mandal1, 'POST', `/grievances/${id}/assign`, { assigneeId: U.field1.id })).s === 200, 'assigned to field1');
const today = new Date().toISOString().slice(0, 10);
const vbody = { visitDate: today, observations: 'Visited the street, no water in taps, 3 households met.', findings: 'Complaint confirmed on site.', evidenceNotes: 'Photo taken', outcome: 'verified', checklist: [{ item: 'Meet households', done: true }] };
ok((await call(T.field2, 'POST', `/grievances/${id}/verification`, vbody)).s === 403, 'other field officer blocked');
ok((await call(T.field1, 'POST', `/grievances/${id}/verification`, { ...vbody, visitDate: '2999-01-01' })).s === 400, 'future visit date rejected');
const fs = await call(T.field1, 'POST', '/ai/field-summary', vbody); ok(fs.s === 200, 'ai field summary');
ok((await call(T.field1, 'POST', `/grievances/${id}/verification`, vbody)).s === 200, 'field verification submitted');
// Stage 3
ok((await call(T.field1, 'POST', '/ai/review-assist', { grievanceId: id })).s === 403, 'field cannot use review AI');
const ra = await call(T.mandal1, 'POST', '/ai/review-assist', { grievanceId: id }); ok(ra.s === 200 && ra.j.result.draft_recommendation, 'ai review assist');
ok((await call(T.mandal1, 'POST', `/grievances/${id}/review`, { action: 'forward', notes: 'Looks fine', recommendation: '' })).s === 400, 'forward needs recommendation');
ok((await call(T.mandal1, 'POST', `/grievances/${id}/review`, { action: 'forward', notes: 'Looks consistent', recommendation: 'Approve repair of pipeline' })).s === 200, 'forwarded');
// Stage 4
ok((await call(T.mandal1, 'POST', `/grievances/${id}/decision`, { decision: 'approve', confirm: true })).s === 403, 'mandal cannot decide');
ok((await call(T.approver1, 'POST', `/grievances/${id}/decision`, { decision: 'reject', reason: '', confirm: true })).s === 400, 'reject needs reason');
ok((await call(T.approver1, 'POST', `/grievances/${id}/decision`, { decision: 'return', reason: 'ok reason here' })).s === 400, 'confirmation required');
const dn = await call(T.approver1, 'POST', '/ai/decision-note', { grievanceId: id }); ok(dn.s === 200 && !/^approve/i.test(dn.j.result.draft_note), 'ai decision note (no decision)');
ok((await call(T.approver1, 'POST', `/grievances/${id}/decision`, { decision: 'approve', confirm: true })).s === 200, 'approved');
ok((await call(T.approver1, 'POST', `/grievances/${id}/decision`, { decision: 'approve', confirm: true })).s === 409, 'cannot decide twice');
const d = await call(T.mandal1, 'GET', `/grievances/${id}`);
ok(d.j.status === 'approved' && d.j.history.length === 5, `final status approved, history=${d.j.history.length}`);
ok(d.j.history.every((h, i, a) => i === 0 || h.fromStatus === a[i - 1].toStatus), 'history chain consistent');
// reject / return paths on seeded cases
const list = await call(T.approver1, 'GET', '/grievances?status=awaiting_final_decision');
ok(list.j.length >= 2, 'decision queue ' + list.j.length);
ok((await call(T.approver1, 'POST', `/grievances/${list.j[0].id}/decision`, { decision: 'reject', reason: 'Not enough evidence from field', confirm: true })).s === 200, 'reject path');
ok((await call(T.approver1, 'POST', `/grievances/${list.j[1].id}/decision`, { decision: 'return', reason: 'Need citizen ID proof', confirm: true })).s === 200, 'return path');
const ret = await call(T.mandal1, 'GET', `/grievances/${list.j[1].id}`); ok(ret.j.status === 'returned', 'returned status');
ok((await call(T.mandal1, 'POST', `/grievances/${list.j[1].id}/assign`, { assigneeId: U.field2.id })).s === 200, 'returned case re-assigned');
// search / filter / sort
ok((await call(T.mandal1, 'GET', '/grievances?q=Rampuram&sort=priority')).j.every((r) => r.village === 'Rampuram'), 'search by village');
ok((await call(T.field1, 'GET', '/grievances')).j.length > 0, 'field list scoped');
console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0);
