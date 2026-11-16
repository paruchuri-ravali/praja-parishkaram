import bcrypt from 'bcryptjs';
import { sql } from 'drizzle-orm';
import { db, pool } from './client.js';
import * as s from './schema.js';

// All people, villages and phone numbers below are FICTIONAL demo data.
const PASSWORD = 'Demo@123';
const daysAgo = (n: number, hour = 10) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(hour, 0, 0, 0); return d; };
const iso = (d: Date) => d.toISOString().slice(0, 10);
const SLA: Record<string, number> = { high: 3, medium: 7, low: 14 };

await db.execute(sql`truncate table grievance_history, grievance_attachments, grievance_decisions, officer_reviews, field_verifications, grievance_assignments, grievances, users restart identity cascade`);
const hash = await bcrypt.hash(PASSWORD, 10);
const mk = async (username: string, name: string, nameTe: string, role: string) =>
  (await db.insert(s.users).values({ username, passwordHash: hash, name, nameTe, role, mandal: 'Demo Mandal' }).returning())[0];
const field1 = await mk('field1', 'K. Ramesh (Field Officer)', 'కె. రమేష్ (ఫీల్డ్ అధికారి)', 'field_officer');
const field2 = await mk('field2', 'P. Lakshmi (Field Officer)', 'పి. లక్ష్మి (ఫీల్డ్ అధికారి)', 'field_officer');
const mandal = await mk('mandal1', 'S. Venkata Rao (Mandal Officer)', 'ఎస్. వెంకట రావు (మండల అధికారి)', 'mandal_officer');
const approver = await mk('approver1', 'D. Sujatha (Approving Officer)', 'డి. సుజాత (ఆమోదించే అధికారి)', 'approving_officer');

type Stage = 'registered' | 'assigned' | 'review' | 'decision' | 'returned' | 'approved' | 'rejected';
type Seed = { cit: string; village: string; phone: string; cat: (typeof s.CATEGORIES)[number]; pri: 'low' | 'medium' | 'high'; desc: string; lang: 'te' | 'en'; age: number; stage: Stage; field?: typeof field1; outcome?: 'verified' | 'partially_verified' | 'not_verified' };
const G: Seed[] = [
  { cit: 'Demo Citizen A. Lakshmamma', village: 'Rampuram', phone: '9000000001', cat: 'water_supply', pri: 'high', lang: 'te', age: 2, stage: 'registered', desc: 'మా వీధిలో 6 రోజులుగా తాగునీరు రావడం లేదు. వృద్ధులు, పిల్లలు ఇబ్బంది పడుతున్నారు. దయచేసి వెంటనే పైపులైన్ సరిచేయండి.' },
  { cit: 'Demo Citizen B. Srinivas', village: 'Gollapalem', phone: '9000000002', cat: 'roads', pri: 'medium', lang: 'en', age: 3, stage: 'registered', desc: 'The village approach road near the school has large potholes. Two-wheelers are slipping during rain and children walk on this road daily.' },
  { cit: 'Demo Citizen C. Venkataiah', village: 'Chintalapudi', phone: '9000000003', cat: 'electricity', pri: 'high', lang: 'te', age: 5, stage: 'assigned', field: field1, desc: 'మా కాలనీ ట్రాన్స్‌ఫార్మర్ నుంచి వైర్లు వేలాడుతున్నాయి. వర్షం వస్తే షాక్ కొట్టే ప్రమాదం ఉంది. 4 రోజులుగా విద్యుత్ కోతలు కూడా ఉన్నాయి.' },
  { cit: 'Demo Citizen D. Padmavathi', village: 'Kothapalli', phone: '9000000004', cat: 'pensions', pri: 'medium', lang: 'te', age: 9, stage: 'assigned', field: field2, desc: 'నా వితంతు పింఛన్ గత 3 నెలలుగా రావడం లేదు. బ్యాంకులో అడిగితే సచివాలయంలో అడగమన్నారు.' },
  { cit: 'Demo Citizen E. Appa Rao', village: 'Nandigama', phone: '9000000005', cat: 'sanitation', pri: 'medium', lang: 'en', age: 8, stage: 'assigned', field: field1, desc: 'The main drain near the temple is blocked and sewage water is overflowing onto the street, causing mosquito problems.' },
  { cit: 'Demo Citizen F. Sarojini', village: 'Rampuram', phone: '9000000006', cat: 'water_supply', pri: 'medium', lang: 'te', age: 10, stage: 'review', field: field1, outcome: 'verified', desc: 'మా బోరు మోటార్ పాడైపోయి 10 రోజులుగా నీరు రావడం లేదు. పంచాయతీకి చెప్పినా పట్టించుకోలేదు.' },
  { cit: 'Demo Citizen G. Murali Krishna', village: 'Gollapalem', phone: '9000000007', cat: 'roads', pri: 'low', lang: 'en', age: 12, stage: 'review', field: field2, outcome: 'partially_verified', desc: 'Request to repair the damaged culvert on the road to the fields. Some farmers say it is dangerous for bullock carts.' },
  { cit: 'Demo Citizen H. Rajeswari', village: 'Chintalapudi', phone: '9000000008', cat: 'pensions', pri: 'high', lang: 'te', age: 11, stage: 'decision', field: field2, outcome: 'verified', desc: 'నా భర్త మరణించి 5 నెలలు అయింది. వితంతు పింఛన్ మంజూరు కావడం లేదు. వృద్ధురాలిని, ఆదాయం లేదు.' },
  { cit: 'Demo Citizen I. Narasimha', village: 'Kothapalli', phone: '9000000009', cat: 'electricity', pri: 'medium', lang: 'te', age: 14, stage: 'decision', field: field1, outcome: 'not_verified', desc: 'మా వీధిలో వీధి దీపాలు 2 నెలలుగా వెలగడం లేదు. రాత్రిపూట దొంగతనాల భయం ఉంది.' },
  { cit: 'Demo Citizen J. Bhargavi', village: 'Nandigama', phone: '9000000010', cat: 'sanitation', pri: 'low', lang: 'en', age: 20, stage: 'returned', field: field2, outcome: 'partially_verified', desc: 'Garbage is not being collected from our lane for two weeks. Please arrange regular pickup.' },
  { cit: 'Demo Citizen K. Subba Rao', village: 'Rampuram', phone: '9000000011', cat: 'water_supply', pri: 'medium', lang: 'te', age: 25, stage: 'approved', field: field1, outcome: 'verified', desc: 'ప్రభుత్వ పాఠశాల దగ్గర చేతి పంపు పాడైంది. పిల్లలకు తాగునీరు లేదు. మరమ్మతు చేయండి.' },
  { cit: 'Demo Citizen L. Yellamma', village: 'Gollapalem', phone: '9000000012', cat: 'other', pri: 'low', lang: 'te', age: 28, stage: 'rejected', field: field2, outcome: 'not_verified', desc: 'మా పొలం పక్కన ప్రభుత్వ భూమిలో ఎవరో కంచె వేశారు అని ఫిర్యాదు. (వివరాలు స్పష్టంగా లేవు)' },
  { cit: 'Demo Citizen M. Hanumantha Rao', village: 'Chintalapudi', phone: '9000000013', cat: 'roads', pri: 'high', lang: 'en', age: 6, stage: 'review', field: field1, outcome: 'verified', desc: 'A bridge approach slab has collapsed on the Chintalapudi-Kothapalli road. Vehicles are at risk of accidents, especially at night.' },
];

const OBS: Record<string, [string, string, string]> = {
  verified: ['సైట్‌ను సందర్శించి సమస్యను స్వయంగా చూశాను. ఫిర్యాదులో చెప్పినట్లే ఉంది. 3 కుటుంబాలతో మాట్లాడాను.', 'Complaint confirmed on site; affected households interviewed.', 'ఫోటోలు తీశాను (demo note: no real file).'],
  partially_verified: ['Visited the site. The problem exists but the extent is smaller than described in the complaint.', 'Partly confirmed. Need engineering estimate to be sure.', 'One photo taken.'],
  not_verified: ['Visited the location. Could not find the issue described; neighbours were not aware of it.', 'Could not verify the complaint on site.', ''],
};

for (const x of G) {
  const sub = daysAgo(x.age);
  const [g] = await db.insert(s.grievances).values({ refNo: 'TMP', citizenName: x.cit, village: x.village, phone: x.phone, category: x.cat, priority: x.pri, description: x.desc, descriptionLang: x.lang, status: 'registered', submittedOn: iso(sub), dueOn: iso(new Date(sub.getTime() + SLA[x.pri] * 86400000)), createdBy: mandal.id, createdAt: sub, updatedAt: sub }).returning();
  const ref = `PP-${iso(sub).slice(0, 4)}-${String(g.id).padStart(5, '0')}`;
  await db.update(s.grievances).set({ refNo: ref }).where(sql`id = ${g.id}`);
  let cur = 'registered'; let t = sub;
  const hist = async (action: string, u: typeof mandal, to: string | null, comment: string, dayOff: number) => {
    t = new Date(sub.getTime() + dayOff * 86400000 + 3600000);
    await db.insert(s.grievanceHistory).values({ grievanceId: g.id, action, actorId: u.id, actorName: u.name, actorRole: u.role, fromStatus: to ? cur : null, toStatus: to ?? cur, comment, createdAt: t });
    if (to) cur = to;
  };
  await hist('registered', mandal, 'registered', `Registered ${ref}`, 0);
  if (x.stage === 'registered') continue;
  await db.insert(s.grievanceAssignments).values({ grievanceId: g.id, assigneeId: x.field!.id, assignedBy: mandal.id, stage: 'field', active: x.stage === 'assigned', createdAt: t });
  await hist('assigned', mandal, 'awaiting_field_verification', `Assigned to ${x.field!.name}`, 1);
  await db.update(s.grievances).set({ status: cur }).where(sql`id = ${g.id}`);
  if (x.stage === 'assigned') continue;
  const o = OBS[x.outcome!];
  const visit = iso(new Date(sub.getTime() + 2 * 86400000));
  await db.insert(s.fieldVerifications).values({ grievanceId: g.id, officerId: x.field!.id, visitDate: visit, observations: o[0], findings: o[1], evidenceNotes: o[2], checklist: [], outcome: x.outcome!, createdAt: new Date(sub.getTime() + 2 * 86400000) });
  await hist('field_verification_submitted', x.field!, 'awaiting_officer_review', `Outcome: ${x.outcome}`, 2);
  if (x.stage === 'review') { await db.update(s.grievances).set({ status: cur }).where(sql`id = ${g.id}`); continue; }
  if (x.stage === 'returned' && x.cat === 'sanitation') {
    await db.insert(s.officerReviews).values({ grievanceId: g.id, officerId: mandal.id, notes: 'Field report is thin; please re-visit with photographs and confirm the number of lanes affected.', recommendation: '', action: 'return', createdAt: t });
    await hist('returned_for_more_verification', mandal, 'returned', 'Field report is thin; please re-visit with photographs and confirm the number of lanes affected.', 3);
    await db.update(s.grievances).set({ status: cur }).where(sql`id = ${g.id}`); continue;
  }
  await db.insert(s.officerReviews).values({ grievanceId: g.id, officerId: mandal.id, notes: 'Field report reviewed against the complaint.', recommendation: x.outcome === 'not_verified' ? 'Field could not verify; officer may consider rejecting or asking for citizen clarification.' : 'Complaint is supported by field findings; recommend action.', action: 'forward', createdAt: t });
  await hist('forwarded_for_decision', mandal, 'awaiting_final_decision', 'Field report reviewed against the complaint.', 3);
  if (x.stage !== 'decision') {
    const dec = x.stage === 'approved' ? 'approve' : 'reject';
    const reason = dec === 'approve' ? '' : 'Not verified at site and no supporting evidence from the citizen.';
    await db.insert(s.grievanceDecisions).values({ grievanceId: g.id, officerId: approver.id, decision: dec, reason, decidedAt: new Date(sub.getTime() + 5 * 86400000) });
    await hist(`decision_${dec}`, approver, x.stage, reason, 5);
  }
  await db.update(s.grievances).set({ status: cur }).where(sql`id = ${g.id}`);
}
console.log(`Seeded ${G.length} grievances. Demo password for all users: ${PASSWORD}`);
await pool.end();
