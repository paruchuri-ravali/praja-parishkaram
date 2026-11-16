import { createContext, useContext, useState, type ReactNode } from 'react';

export type Lang = 'te' | 'en';
type Dict = Record<string, string>;

const te: Dict = {
  app_name: 'ప్రజా పరిష్కారం', app_tag: 'మండల స్థాయి ఫిర్యాదుల నిర్వహణ', demo_notice: 'ఇది అసైన్‌మెంట్ ప్రోటోటైప్. కల్పిత డెమో డేటా మాత్రమే. ప్రభుత్వ వ్యవస్థతో అనుసంధానం లేదు.',
  nav_dashboard: 'డాష్‌బోర్డ్', nav_grievances: 'ఫిర్యాదులు', nav_new: 'కొత్త ఫిర్యాదు', logout: 'లాగ్ అవుట్', language: 'భాష',
  choose_user: 'మీ ఖాతాను ఎంచుకోండి', choose_user_hint: 'ఒక వినియోగదారుపై క్లిక్ చేస్తే వారి డాష్‌బోర్డ్ తెరుచుకుంటుంది (డెమో)', open: 'తెరువు', manual_login: 'యూజర్ పేరు / పాస్‌వర్డ్‌తో లాగిన్',
  login: 'లాగిన్', username: 'యూజర్ పేరు', password: 'పాస్‌వర్డ్', login_failed: 'యూజర్ పేరు లేదా పాస్‌వర్డ్ తప్పు', demo_accounts: 'డెమో ఖాతాలు (క్లిక్ చేసి లాగిన్ అవ్వండి)',
  role_field_officer: 'ఫీల్డ్ అధికారి', role_mandal_officer: 'మండల అధికారి', role_approving_officer: 'ఆమోదించే అధికారి',
  welcome: 'నమస్కారం', your_next: 'మీరు చేయాల్సిన పని',
  next_field_officer: 'మీకు అప్పగించిన ఫిర్యాదులను సందర్శించి, నివేదిక పంపండి.', next_mandal_officer: 'కొత్త ఫిర్యాదులను నమోదు చేసి అప్పగించండి; ఫీల్డ్ నివేదికలను సమీక్షించండి.', next_approving_officer: 'తుది నిర్ణయం కోసం వచ్చిన కేసులను పరిశీలించి నిర్ణయం తీసుకోండి.',
  stat_total: 'మొత్తం ఫిర్యాదులు', stat_pending: 'పెండింగ్', stat_high: 'అధిక ప్రాధాన్యత', stat_overdue: 'గడువు దాటినవి', stat_done: 'పూర్తయినవి', stat_mine: 'నాకు అప్పగించినవి', stat_action: 'నా చర్య అవసరం',
  by_stage: 'దశల వారీగా ఫిర్యాదులు', work_queue: 'ప్రాధాన్యత పని జాబితా', queue_empty: 'ప్రస్తుతం మీ చర్య అవసరమైన కేసులు లేవు. 👍', view_all: 'అన్నీ చూడండి',
  search: 'వెతకండి: ఐడి, పేరు, గ్రామం', all: 'అన్నీ', status: 'స్థితి', priority: 'ప్రాధాన్యత', category: 'వర్గం', village: 'గ్రామం', citizen: 'పౌరుడు', submitted: 'నమోదు తేదీ', due: 'గడువు', ref: 'ఫిర్యాదు ఐడి', sort_by: 'క్రమం', only_overdue: 'గడువు దాటినవి మాత్రమే', only_mine: 'నాకు అప్పగించినవి మాత్రమే',
  no_results: 'ఫిర్యాదులు ఏవీ కనబడలేదు', no_results_hint: 'వెతుకుతున్న పదం లేదా ఫిల్టర్ మార్చి చూడండి.', loading: 'లోడ్ అవుతోంది…', error_load: 'డేటా లోడ్ కాలేదు. మళ్లీ ప్రయత్నించండి.', retry: 'మళ్లీ ప్రయత్నించండి', overdue: 'గడువు దాటింది',
  st_registered: 'నమోదైంది', st_awaiting_field_verification: 'క్షేత్ర తనిఖీ కోసం', st_awaiting_officer_review: 'అధికారి సమీక్ష కోసం', st_awaiting_final_decision: 'తుది నిర్ణయం కోసం', st_returned: 'తిరిగి పంపబడింది', st_approved: 'ఆమోదించబడింది', st_rejected: 'తిరస్కరించబడింది',
  stage_1: 'ఫిర్యాదు నమోదు', stage_2: 'క్షేత్ర తనిఖీ', stage_3: 'అధికారి సమీక్ష', stage_4: 'తుది నిర్ణయం',
  pr_low: 'తక్కువ', pr_medium: 'మధ్యస్థం', pr_high: 'అధికం',
  cat_water_supply: 'తాగునీటి సరఫరా', cat_roads: 'రోడ్లు', cat_electricity: 'విద్యుత్', cat_sanitation: 'పారిశుద్ధ్యం', cat_pensions: 'పింఛన్లు', cat_other: 'ఇతర ప్రజా సేవలు',
  new_title: 'కొత్త ఫిర్యాదు నమోదు', citizen_name: 'పౌరుడి పేరు', phone: 'ఫోన్ నంబర్ (10 అంకెలు)', description: 'ఫిర్యాదు వివరాలు', desc_lang: 'ఫిర్యాదు భాష', submitted_on: 'నమోదు తేదీ', attachments: 'జోడింపులు (ఫోటో / PDF, గరిష్టంగా 5, ఒక్కొక్కటి 2MB)', add_files: 'ఫైళ్లు ఎంచుకోండి', register: 'ఫిర్యాదు నమోదు చేయండి', registered_ok: 'ఫిర్యాదు నమోదైంది', demo_data_hint: 'కల్పిత డెమో డేటా మాత్రమే వాడండి.',
  v_required: 'ఈ వివరం అవసరం', v_phone: '10 అంకెల ఫోన్ నంబర్ ఇవ్వండి', v_short: 'ఇంకొంచెం వివరంగా రాయండి (కనీసం 10 అక్షరాలు)', v_reason: 'కారణం తప్పనిసరి (కనీసం 5 అక్షరాలు)', v_future: 'భవిష్యత్ తేదీ ఇవ్వలేరు', v_file: 'ఫైల్ చాలా పెద్దది లేదా తప్పు రకం (JPG/PNG/PDF, 2MB లోపు)', v_generic: 'దయచేసి తప్పులను సరిచేయండి',
  ai_panel: 'AI సహాయం', ai_suggestion_label: 'ఇది AI సూచన మాత్రమే. అధికారి నిర్ధారించాలి.', ai_demo: 'డెమో మోడ్ — నిజమైన AI కాదు (API కీ లేదు). నమూనా సూచనలు మాత్రమే.', ai_live: 'లైవ్ AI (Claude)', ai_run: 'AI సూచన పొందండి', ai_running: 'AI ఆలోచిస్తోంది…', ai_failed: 'AI సహాయం ఇప్పుడు అందుబాటులో లేదు. మీరు ఇలాగే కొనసాగవచ్చు.', ai_timeout: 'AI స్పందన ఆలస్యమైంది. మళ్లీ ప్రయత్నించండి.', ai_invalid: 'AI సమాధానం సరిగా లేదు. మళ్లీ ప్రయత్నించండి.',
  ai_summary: 'సారాంశం', ai_summary_te: 'తెలుగు సారాంశం', ai_suggested_cat: 'సూచించిన వర్గం', ai_suggested_pri: 'సూచించిన ప్రాధాన్యత', ai_reason: 'కారణం', ai_apply: 'ఈ సూచనను వాడండి', ai_ignore: 'వద్దు, నేనే ఎంచుకుంటా', ai_translate_en: 'ఇంగ్లీష్‌లోకి అనువదించు', ai_translate_te: 'తెలుగులోకి అనువదించు', ai_translation: 'అనువాదం (అసలు పాఠం మారదు)', ai_checklist: 'తనిఖీ చెక్‌లిస్ట్ సూచన', ai_use_checklist: 'చెక్‌లిస్ట్‌లో చేర్చు', ai_missing: 'లేని సమాచారం', ai_incons: 'తేడాలు / అసంగతులు', ai_missing_ev: 'లేని ఆధారాలు', ai_case_summary: 'కేసు సారాంశం', ai_draft_rec: 'ముసాయిదా సిఫారసు (మీరు మార్చవచ్చు)', ai_use_draft: 'ముసాయిదాను సిఫారసు బాక్స్‌లో ఉంచు', ai_points: 'పరిశీలించాల్సిన అంశాలు', ai_note: 'ముసాయిదా నోట్', ai_none: 'ఏమీ కనబడలేదు',
  ai_never: 'AI ఎప్పుడూ ఆమోదం/తిరస్కరణ నిర్ణయం తీసుకోదు. తుది నిర్ణయం అధికారిదే.',
  detail_back: 'వెనక్కి', progress: 'పని పురోగతి', citizen_details: 'పౌరుడు & ప్రదేశం', complaint: 'ఫిర్యాదు', original_text: 'పౌరుడు రాసిన అసలు పాఠం', assigned_to: 'అప్పగించినది', not_assigned: 'ఇంకా అప్పగించలేదు',
  field_report: 'క్షేత్ర తనిఖీ నివేదిక', no_field_report: 'ఇంకా క్షేత్ర నివేదిక లేదు', visit_date: 'సందర్శన తేదీ', observations: 'పరిశీలనలు (ఏం చూశారు)', findings: 'నిర్ధారణలు', evidence_notes: 'ఆధారాల గమనికలు', outcome: 'తనిఖీ ఫలితం', out_verified: 'నిర్ధారించబడింది', out_partially_verified: 'పాక్షికంగా నిర్ధారించబడింది', out_not_verified: 'నిర్ధారించలేకపోయాం', checklist: 'తనిఖీ చెక్‌లిస్ట్', submit_report: 'నివేదిక పంపండి', report_submitted: 'నివేదిక పంపబడింది', field_attach: 'సైట్ ఫోటోలు / పత్రాలు (ఐచ్ఛికం)',
  review_section: 'అధికారి సమీక్ష', review_notes: 'సమీక్ష గమనికలు', recommendation: 'సిఫారసు', forward: 'తుది నిర్ణయానికి పంపండి', return_field: 'మరింత తనిఖీ కోసం తిరిగి పంపండి', review_done: 'సమీక్ష నమోదైంది', no_reviews: 'ఇంకా సమీక్షలు లేవు',
  assign: 'ఫీల్డ్ అధికారికి అప్పగించండి', assign_to: 'ఫీల్డ్ అధికారి', assign_btn: 'అప్పగించు', assigned_ok: 'అప్పగించబడింది', reassign: 'మళ్లీ అప్పగించండి',
  decision: 'తుది నిర్ణయం', approve: 'ఆమోదించు', reject: 'తిరస్కరించు', return_info: 'అదనపు సమాచారం కోసం తిరిగి పంపు', reason: 'కారణం', reason_req: 'కారణం (తిరస్కరణ / తిరిగి పంపడానికి తప్పనిసరి)', confirm_title: 'మీరు ఖచ్చితంగా నిర్ణయం నమోదు చేయాలనుకుంటున్నారా?', confirm_body: 'ఈ నిర్ణయం చరిత్రలో శాశ్వతంగా నమోదవుతుంది.', confirm_yes: 'అవును, నమోదు చేయి', cancel: 'రద్దు', decision_saved: 'నిర్ణయం నమోదైంది', decisions_history: 'నిర్ణయాలు', no_action: 'ప్రస్తుతం మీరు చేయాల్సిన చర్య ఏమీ లేదు.',
  timeline: 'చరిత్ర (ఆడిట్ లాగ్)', by: 'చేసినవారు', from_to: 'స్థితి మార్పు',
  act_registered: 'ఫిర్యాదు నమోదు', act_assigned: 'ఫీల్డ్ అధికారికి అప్పగింత', act_field_verification_submitted: 'క్షేత్ర నివేదిక పంపబడింది', act_forwarded_for_decision: 'తుది నిర్ణయానికి పంపబడింది', act_returned_for_more_verification: 'మరింత తనిఖీ కోసం తిరిగి పంపబడింది', act_decision_approve: 'ఆమోదించబడింది', act_decision_reject: 'తిరస్కరించబడింది', act_decision_return: 'అదనపు సమాచారం కోసం తిరిగి పంపబడింది', act_classification_updated: 'వర్గం / ప్రాధాన్యత మార్పు',
  attachments_title: 'జోడింపులు / ఆధారాలు', no_attachments: 'జోడింపులు లేవు', stage_complaint: 'ఫిర్యాదుతో', stage_field: 'క్షేత్ర తనిఖీలో',
  edit_class: 'వర్గం / ప్రాధాన్యత మార్చు', save: 'సేవ్', err_forbidden: 'ఈ చర్యకు మీకు అనుమతి లేదు', err_state: 'ఈ కేసు ఇప్పుడు ఆ దశలో లేదు', err_generic: 'ఏదో తప్పు జరిగింది. మళ్లీ ప్రయత్నించండి.', err_not_assigned: 'ఈ కేసు మీకు అప్పగించలేదు',
  action_done: 'మీ చర్య నమోదైంది ✔', days: 'రోజులు', closed: 'ముగిసింది',
};

const en: Dict = {
  app_name: 'Praja Parishkaram', app_tag: 'Mandal-level grievance management', demo_notice: 'Assignment prototype. Fictional demo data only. Not connected to any government system.',
  nav_dashboard: 'Dashboard', nav_grievances: 'Grievances', nav_new: 'New grievance', logout: 'Log out', language: 'Language',
  choose_user: 'Choose your account', choose_user_hint: 'Click a user to open their dashboard (demo)', open: 'Open', manual_login: 'Log in with username / password',
  login: 'Log in', username: 'Username', password: 'Password', login_failed: 'Wrong username or password', demo_accounts: 'Demo accounts (click to log in)',
  role_field_officer: 'Field Officer', role_mandal_officer: 'Mandal Officer', role_approving_officer: 'Approving Officer',
  welcome: 'Welcome', your_next: 'What to do next',
  next_field_officer: 'Visit the grievances assigned to you and submit your field report.', next_mandal_officer: 'Register new grievances and assign them; review field reports.', next_approving_officer: 'Review cases sent for final decision and decide.',
  stat_total: 'Total applications', stat_pending: 'Pending', stat_high: 'High priority', stat_overdue: 'Overdue', stat_done: 'Completed', stat_mine: 'Assigned to me', stat_action: 'Needs my action',
  by_stage: 'Applications by stage', work_queue: 'Prioritised work queue', queue_empty: 'No cases need your action right now. 👍', view_all: 'View all',
  search: 'Search: ID, name, village', all: 'All', status: 'Status', priority: 'Priority', category: 'Category', village: 'Village', citizen: 'Citizen', submitted: 'Submitted', due: 'Due', ref: 'Grievance ID', sort_by: 'Sort', only_overdue: 'Overdue only', only_mine: 'Assigned to me only',
  no_results: 'No grievances found', no_results_hint: 'Try a different search or filter.', loading: 'Loading…', error_load: 'Could not load data. Please try again.', retry: 'Try again', overdue: 'Overdue',
  st_registered: 'Registered', st_awaiting_field_verification: 'Awaiting field verification', st_awaiting_officer_review: 'Awaiting officer review', st_awaiting_final_decision: 'Awaiting final decision', st_returned: 'Returned', st_approved: 'Approved', st_rejected: 'Rejected',
  stage_1: 'Registration', stage_2: 'Field verification', stage_3: 'Officer review', stage_4: 'Final decision',
  pr_low: 'Low', pr_medium: 'Medium', pr_high: 'High',
  cat_water_supply: 'Water supply', cat_roads: 'Roads', cat_electricity: 'Electricity', cat_sanitation: 'Sanitation', cat_pensions: 'Pensions', cat_other: 'Other public services',
  new_title: 'Register a new grievance', citizen_name: 'Citizen name', phone: 'Phone (10 digits)', description: 'Complaint details', desc_lang: 'Complaint language', submitted_on: 'Submission date', attachments: 'Attachments (photo / PDF, max 5, 2MB each)', add_files: 'Choose files', register: 'Register grievance', registered_ok: 'Grievance registered', demo_data_hint: 'Use fictional demo data only.',
  v_required: 'This field is required', v_phone: 'Enter a 10-digit phone number', v_short: 'Please write a little more (at least 10 characters)', v_reason: 'A reason is required (at least 5 characters)', v_future: 'Future dates are not allowed', v_file: 'File too large or wrong type (JPG/PNG/PDF, under 2MB)', v_generic: 'Please fix the errors',
  ai_panel: 'AI assistance', ai_suggestion_label: 'This is an AI suggestion only. The officer must confirm.', ai_demo: 'DEMO MODE — not a real AI (no API key). Sample suggestions only.', ai_live: 'Live AI (Claude)', ai_run: 'Get AI suggestion', ai_running: 'AI is working…', ai_failed: 'AI help is unavailable right now. You can continue without it.', ai_timeout: 'AI took too long. Please try again.', ai_invalid: 'AI returned an unusable answer. Please try again.',
  ai_summary: 'Summary', ai_summary_te: 'Telugu summary', ai_suggested_cat: 'Suggested category', ai_suggested_pri: 'Suggested priority', ai_reason: 'Reason', ai_apply: 'Use this suggestion', ai_ignore: 'No, I will choose myself', ai_translate_en: 'Translate to English', ai_translate_te: 'Translate to Telugu', ai_translation: 'Translation (original text is unchanged)', ai_checklist: 'Suggested inspection checklist', ai_use_checklist: 'Add to checklist', ai_missing: 'Missing information', ai_incons: 'Possible inconsistencies', ai_missing_ev: 'Missing evidence', ai_case_summary: 'Case summary', ai_draft_rec: 'Draft recommendation (edit freely)', ai_use_draft: 'Put draft in recommendation box', ai_points: 'Points to consider', ai_note: 'Draft note', ai_none: 'None found',
  ai_never: 'AI never approves, rejects or returns a case. The final decision is the officer’s.',
  detail_back: 'Back', progress: 'Progress', citizen_details: 'Citizen & location', complaint: 'Complaint', original_text: 'Original text written by the citizen', assigned_to: 'Assigned to', not_assigned: 'Not assigned yet',
  field_report: 'Field verification report', no_field_report: 'No field report yet', visit_date: 'Visit date', observations: 'Observations (what you saw)', findings: 'Findings', evidence_notes: 'Evidence notes', outcome: 'Verification outcome', out_verified: 'Verified', out_partially_verified: 'Partially verified', out_not_verified: 'Not verified', checklist: 'Verification checklist', submit_report: 'Submit report', report_submitted: 'Report submitted', field_attach: 'Site photos / documents (optional)',
  review_section: 'Officer review', review_notes: 'Review notes', recommendation: 'Recommendation', forward: 'Forward for final decision', return_field: 'Return for more field verification', review_done: 'Review recorded', no_reviews: 'No reviews yet',
  assign: 'Assign to a field officer', assign_to: 'Field officer', assign_btn: 'Assign', assigned_ok: 'Assigned', reassign: 'Re-assign',
  decision: 'Final decision', approve: 'Approve', reject: 'Reject', return_info: 'Return for additional information', reason: 'Reason', reason_req: 'Reason (mandatory for reject / return)', confirm_title: 'Are you sure you want to record this decision?', confirm_body: 'This decision will be permanently recorded in the history.', confirm_yes: 'Yes, record it', cancel: 'Cancel', decision_saved: 'Decision recorded', decisions_history: 'Decisions', no_action: 'There is nothing for you to do on this case right now.',
  timeline: 'History (audit trail)', by: 'By', from_to: 'Status change',
  act_registered: 'Grievance registered', act_assigned: 'Assigned to field officer', act_field_verification_submitted: 'Field report submitted', act_forwarded_for_decision: 'Forwarded for final decision', act_returned_for_more_verification: 'Returned for more verification', act_decision_approve: 'Approved', act_decision_reject: 'Rejected', act_decision_return: 'Returned for additional information', act_classification_updated: 'Category / priority updated',
  attachments_title: 'Attachments / evidence', no_attachments: 'No attachments', stage_complaint: 'With complaint', stage_field: 'From field visit',
  edit_class: 'Change category / priority', save: 'Save', err_forbidden: 'You are not allowed to do this', err_state: 'This case is no longer at that stage', err_generic: 'Something went wrong. Please try again.', err_not_assigned: 'This case is not assigned to you',
  action_done: 'Your action has been recorded ✔', days: 'days', closed: 'Closed',
};

const dicts = { te, en };
type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string };
const C = createContext<Ctx>(null as unknown as Ctx);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setL] = useState<Lang>(() => ((localStorage.getItem('lang') as Lang) || 'te'));
  const setLang = (l: Lang) => { localStorage.setItem('lang', l); document.documentElement.lang = l; setL(l); };
  const t = (k: string) => dicts[lang][k] ?? en[k] ?? k;
  return <C.Provider value={{ lang, setLang, t }}>{children}</C.Provider>;
}
export const useI18n = () => useContext(C);
