import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
const TIMEOUT_MS = 25000;
const client = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: TIMEOUT_MS, maxRetries: 1 }) : null;

export const aiMode = () => (client ? 'live' : 'demo');

const SYSTEM = `You are an assistant for Mandal-level officers handling citizen grievances in Andhra Pradesh, India.
Rules: You only SUGGEST. Never decide approval, rejection or return. Never invent site visits, evidence, names, dates or facts not in the input.
If information is missing, say so. Reply with ONLY a single JSON object matching the requested shape, no markdown.
Write Telugu fields in simple, plain Telugu.`;

export class AiError extends Error {
  constructor(public code: 'timeout' | 'invalid_output' | 'request_failed', msg: string) { super(msg); }
}

async function callJson<T>(schema: z.ZodType<T>, shape: string, input: unknown): Promise<T> {
  if (!client) throw new Error('no client');
  let text = '';
  try {
    const res = await client.messages.create({
      model: MODEL, max_tokens: 1500, system: SYSTEM,
      messages: [{ role: 'user', content: `Return JSON of this shape:\n${shape}\n\nCase data (JSON):\n${JSON.stringify(input)}` }],
    });
    text = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
  } catch (e: any) {
    if (/timed? ?out|abort/i.test(String(e?.message))) throw new AiError('timeout', 'AI request timed out');
    throw new AiError('request_failed', 'AI request failed');
  }
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new AiError('invalid_output', 'No JSON in AI output');
  try {
    return schema.parse(JSON.parse(m[0]));
  } catch {
    throw new AiError('invalid_output', 'AI output failed validation');
  }
}

// ---------- schemas ----------
const triageS = z.object({
  summary_en: z.string(), summary_te: z.string(),
  category: z.enum(['water_supply', 'roads', 'electricity', 'sanitation', 'pensions', 'other']),
  priority: z.enum(['low', 'medium', 'high']), reason: z.string(),
});
const translateS = z.object({ translation: z.string(), target: z.enum(['te', 'en']) });
const checklistS = z.object({ items: z.array(z.string()).min(1).max(12) });
const fieldSumS = z.object({ summary: z.string(), missing: z.array(z.string()) });
const reviewS = z.object({
  case_summary: z.string(), inconsistencies: z.array(z.string()),
  missing_evidence: z.array(z.string()), draft_recommendation: z.string(),
});
const decisionNoteS = z.object({ draft_note: z.string(), points_to_consider: z.array(z.string()) });

export type Triage = z.infer<typeof triageS>;

// ---------- demo (deterministic) ----------
const CAT_KW: [string, RegExp][] = [
  ['water_supply', /water|నీరు|నీటి|బోరు|పైపు|tap|borewell/i],
  ['roads', /road|రోడ్|రోడ్డు|bridge|గుంత|pothole/i],
  ['electricity', /electric|power|కరెంట్|విద్యుత్|transformer|ట్రాన్స్/i],
  ['sanitation', /drain|sanitation|garbage|మురుగు|చెత్త|కాలువ|toilet/i],
  ['pensions', /pension|పింఛన్|పెన్షన్|ఫించన్/i],
];
const HIGH_KW = /days|weeks|నెల|రోజులు|వారాలు|no water|without|elderly|వృద్ధ|accident|ప్రమాదం|hospital|child|పిల్ల|urgent|తక్షణ|shock|disease|జ్వరం/i;
const CAT_CHECKLIST: Record<string, string[]> = {
  water_supply: ['Visit the water source / pipeline / borewell', 'Check if water is available and for how many hours', 'Test water clarity and smell', 'Meet at least 3 affected households', 'Photograph leaks or damage'],
  roads: ['Measure approximate damaged road length', 'Check for danger to vehicles and school children', 'Note nearby landmarks for location', 'Photograph damaged portions', 'Ask villagers how long the damage has existed'],
  electricity: ['Inspect the transformer / pole / line mentioned', 'Check for hanging or exposed wires (safety)', 'Ask households about outage hours', 'Confirm if the local lineman was informed', 'Photograph the equipment'],
  sanitation: ['Inspect drain / garbage point', 'Check for stagnant water or bad smell', 'Note nearby houses, school or temple affected', 'Check last cleaning date with panchayat', 'Photograph the area'],
  pensions: ['Verify identity of the pensioner (Aadhaar sighted, do not copy)', 'Check last pension received month', 'Confirm eligibility details with village secretariat', 'Ask about bank / payment issue', 'Note any documents shown'],
  other: ['Visit the location mentioned', 'Speak to the citizen and neighbours', 'Note the facts seen on site', 'Collect any documents shown', 'Photograph if relevant'],
};
const CAT_CHECKLIST_TE: Record<string, string[]> = {
  water_supply: ['నీటి వనరు / పైపులైన్ / బోరు దగ్గరికి వెళ్లి చూడండి', 'నీరు వస్తుందా, రోజుకు ఎన్ని గంటలు అని చూడండి', 'నీరు స్పష్టత, వాసన పరిశీలించండి', 'కనీసం 3 ప్రభావిత కుటుంబాలను కలవండి', 'లీకులు / నష్టం ఫోటో తీయండి'],
  roads: ['దెబ్బతిన్న రోడ్డు పొడవు అంచనా వేయండి', 'వాహనాలకు, పాఠశాల పిల్లలకు ప్రమాదం ఉందా చూడండి', 'ప్రదేశం గుర్తుకు దగ్గరి ల్యాండ్‌మార్క్ రాయండి', 'దెబ్బతిన్న భాగాల ఫోటోలు తీయండి', 'ఎంతకాలంగా ఇలా ఉందో గ్రామస్తులను అడగండి'],
  electricity: ['చెప్పిన ట్రాన్స్‌ఫార్మర్ / స్తంభం / లైన్ పరిశీలించండి', 'వేలాడే వైర్లు ఉన్నాయా (భద్రత) చూడండి', 'విద్యుత్ కోత గంటలను కుటుంబాలను అడగండి', 'స్థానిక లైన్‌మెన్‌కు చెప్పారా నిర్ధారించండి', 'పరికరాల ఫోటో తీయండి'],
  sanitation: ['కాలువ / చెత్త ప్రదేశం పరిశీలించండి', 'నిలిచిన నీరు, దుర్వాసన ఉందా చూడండి', 'దగ్గరి ఇళ్లు, పాఠశాల, గుడి ప్రభావితమా రాయండి', 'చివరి శుభ్రత తేదీ పంచాయతీని అడగండి', 'ప్రదేశం ఫోటో తీయండి'],
  pensions: ['పింఛనుదారు గుర్తింపు చూడండి (ఆధార్ కాపీ చేయవద్దు)', 'చివరిగా పింఛన్ వచ్చిన నెల చూడండి', 'అర్హత వివరాలు గ్రామ సచివాలయంతో నిర్ధారించండి', 'బ్యాంకు / చెల్లింపు సమస్య ఉందా అడగండి', 'చూపిన పత్రాలు నమోదు చేయండి'],
  other: ['చెప్పిన ప్రదేశానికి వెళ్లండి', 'పౌరుడిని, పొరుగువారిని కలవండి', 'ప్రత్యక్షంగా చూసిన విషయాలు రాయండి', 'చూపిన పత్రాలు సేకరించండి', 'అవసరమైతే ఫోటో తీయండి'],
};

const demo = {
  triage(d: { description: string }): Triage {
    const cat = (CAT_KW.find(([, re]) => re.test(d.description))?.[0] ?? 'other') as Triage['category'];
    const priority: Triage['priority'] = HIGH_KW.test(d.description) ? 'high' : d.description.length > 160 ? 'medium' : 'low';
    const first = d.description.trim().slice(0, 140);
    return { summary_en: `[Demo] Citizen complaint about ${cat.replace('_', ' ')}: "${first}${d.description.length > 140 ? '…' : ''}"`, summary_te: `[డెమో] ${cat} విషయమై పౌరుని ఫిర్యాదు: "${first}${d.description.length > 140 ? '…' : ''}"`, category: cat, priority, reason: '[Demo] Keyword-based rule, not a real AI analysis.' };
  },
  translate(d: { text: string; target: 'te' | 'en' }) { return { target: d.target, translation: `[Demo – no live translation available] ${d.text}` }; },
  checklist(d: { category: string; lang: string }) { return { items: (d.lang === 'te' ? CAT_CHECKLIST_TE : CAT_CHECKLIST)[d.category] ?? CAT_CHECKLIST.other }; },
  fieldSummary(d: { observations: string; findings: string; evidenceNotes: string; outcome: string; visitDate?: string }) {
    const missing: string[] = [];
    if (!d.evidenceNotes?.trim()) missing.push('Evidence notes are empty');
    if ((d.observations || '').trim().length < 40) missing.push('Observations are very short');
    if ((d.findings || '').trim().length < 20) missing.push('Findings need more detail');
    if (!d.visitDate) missing.push('Visit date missing');
    return { summary: `[Demo] Outcome: ${d.outcome}. Observations: ${(d.observations || '').slice(0, 200)}. Findings: ${(d.findings || '').slice(0, 200)}`, missing };
  },
  review(d: any) {
    const missing: string[] = [];
    if (!d.field) missing.push('No field verification report on file');
    else { if (!d.field.evidenceNotes?.trim()) missing.push('No evidence notes in field report'); if (!d.attachmentCount) missing.push('No photos / documents attached'); }
    const incons: string[] = [];
    if (d.field?.outcome === 'not_verified' && d.priority === 'high') incons.push('Complaint is high priority but field officer could not verify it');
    if (d.field?.outcome === 'partially_verified') incons.push('Field report only partially confirms the complaint');
    return { case_summary: `[Demo] ${d.category} complaint from ${d.village}. Field outcome: ${d.field?.outcome ?? 'none'}.`, inconsistencies: incons, missing_evidence: missing, draft_recommendation: `[Demo draft – edit before use] Based on the field outcome (${d.field?.outcome ?? 'none'}), the officer may consider forwarding for decision. Officer to confirm.` };
  },
  decisionNote(d: any) { return { draft_note: `[Demo draft – edit] Case ${d.refNo}: field outcome ${d.field?.outcome ?? 'none'}; mandal recommendation: ${d.review?.recommendation || 'none'}. Reason to be written by the approving officer.`, points_to_consider: ['Is the field evidence enough?', 'Does the field report match the complaint?', 'Is any citizen clarification still needed?'] }; },
};

// ---------- public API ----------
type Env<T> = { mode: 'live' | 'demo'; result: T };
async function run<T>(schema: z.ZodType<T>, shape: string, input: unknown, fallback: () => T): Promise<Env<T>> {
  if (!client) return { mode: 'demo', result: fallback() };
  return { mode: 'live', result: await callJson(schema, shape, input) };
}

export const ai = {
  triage: (d: { description: string }) => run(triageS, '{"summary_en":string,"summary_te":string (Telugu),"category":"water_supply|roads|electricity|sanitation|pensions|other","priority":"low|medium|high","reason":string}', { complaint: d.description }, () => demo.triage(d)),
  translate: (d: { text: string; target: 'te' | 'en' }) => run(translateS, '{"translation":string,"target":"te|en"}', d, () => demo.translate(d)),
  checklist: (d: { category: string; description: string; lang: 'te' | 'en' }) => run(checklistS, '{"items":string[] (5-8 practical field inspection steps, in the requested lang)}', d, () => demo.checklist(d)),
  fieldSummary: (d: any) => run(fieldSumS, '{"summary":string,"missing":string[] (information absent from the report; never invent)}', d, () => demo.fieldSummary(d)),
  review: (d: any) => run(reviewS, '{"case_summary":string,"inconsistencies":string[],"missing_evidence":string[],"draft_recommendation":string (draft for officer; no final decision)}', d, () => demo.review(d)),
  decisionNote: (d: any) => run(decisionNoteS, '{"draft_note":string (neutral draft; do NOT state approve/reject),"points_to_consider":string[]}', d, () => demo.decisionNote(d)),
};
