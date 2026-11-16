export type Role = 'field_officer' | 'mandal_officer' | 'approving_officer';
export type Status = 'registered' | 'awaiting_field_verification' | 'awaiting_officer_review' | 'awaiting_final_decision' | 'returned' | 'approved' | 'rejected';

export const TERMINAL: Status[] = ['approved', 'rejected'];

/** Allowed transitions: action -> {role, from[], to} */
export const TRANSITIONS = {
  assign: { role: 'mandal_officer', from: ['registered', 'returned'], to: 'awaiting_field_verification' },
  submit_verification: { role: 'field_officer', from: ['awaiting_field_verification'], to: 'awaiting_officer_review' },
  forward: { role: 'mandal_officer', from: ['awaiting_officer_review'], to: 'awaiting_final_decision' },
  return_to_field: { role: 'mandal_officer', from: ['awaiting_officer_review'], to: 'returned' },
  approve: { role: 'approving_officer', from: ['awaiting_final_decision'], to: 'approved' },
  reject: { role: 'approving_officer', from: ['awaiting_final_decision'], to: 'rejected' },
  return_decision: { role: 'approving_officer', from: ['awaiting_final_decision'], to: 'returned' },
} as const;

export type Action = keyof typeof TRANSITIONS;

export function canTransition(action: Action, role: Role, status: string) {
  const t = TRANSITIONS[action];
  if (t.role !== role) return { ok: false as const, code: 403, msg: 'role_not_allowed' };
  if (!(t.from as readonly string[]).includes(status)) return { ok: false as const, code: 409, msg: 'invalid_state' };
  return { ok: true as const, to: t.to as Status };
}

export const SLA_DAYS: Record<string, number> = { high: 3, medium: 7, low: 14 };
