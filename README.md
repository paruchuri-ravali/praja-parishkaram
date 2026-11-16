# Praja Parishkaram (ప్రజా పరిష్కారం)

Telugu-first grievance management for Mandal-level officers in Andhra Pradesh.

> **Assignment prototype – not an official government portal.** All citizens, villages, phone numbers and officers are fictional. There is no integration with any real government system.

**Live demo (AWS, HTTP):** http://praja-alb-263167003.ap-south-1.elb.amazonaws.com — log in from the user list, password `Demo@123`.

## 1. Problem statement and target users
Citizen grievances (drinking water, roads, electricity, sanitation, pensions…) reach the Mandal office on paper or through informal channels. Files move between desks, nobody can see where a case is stuck, and decisions are poorly recorded.

Target users, all inside one Mandal:
- **Field Officer** – visits the site and verifies the complaint.
- **Mandal Officer** – registers, assigns and reviews cases.
- **Approving Officer** – takes the final decision.

## 2. Why grievance management
It has a clear, auditable, multi-role workflow, a real need for Telugu-first usability, and a natural place for AI to *assist* (summaries, checklists, missing-information checks) while a human remains accountable.

## 3. Manual process vs. proposed workflow
| Manual today | Proposed |
|---|---|
| Paper file moves desk to desk | One digital case with a single reference number (`PP-YYYY-NNNNN`) |
| Status asked by phone | Live status, stage progress bar, overdue flags |
| Field notes on paper, often incomplete | Structured report, checklist, evidence, outcome |
| Decisions poorly recorded | Mandatory reason for reject/return, permanent audit trail |

## 4. Workflow stages and roles
```
Registered ──assign──▶ Awaiting field verification ──submit──▶ Awaiting officer review ──forward──▶ Awaiting final decision ──▶ Approved
     ▲                          ▲                                       │                                   │ ├──▶ Rejected
     │                          └──────────── Returned ◀───────────────┴──────── return ◀─────────────────┘ └──▶ Returned
```
| Stage | Role | Actions |
|---|---|---|
| 1 Registration | Mandal Officer | Register (validated), confirm category/priority, assign to a Field Officer |
| 2 Field verification | Field Officer (assigned only) | Checklist, visit date, observations, findings, evidence, outcome (verified / partially / not verified) |
| 3 Officer review | Mandal Officer | Review notes + recommendation; forward, or return for more verification |
| 4 Final decision | Approving Officer | Approve / Reject / Return, reason mandatory for reject and return, confirmation dialog |

Returned cases go back to the Mandal Officer who re-assigns them to a Field Officer. Transitions are enforced on the **server** (`server/src/workflow.ts`), not just hidden in the UI.

## 5. AI assistance at each stage
| Stage | AI help | Why useful |
|---|---|---|
| Registration | Summary (EN + TE), suggested category and priority, Telugu⇄English translation | Faster triage of long or unclear complaints |
| Field verification | Category-specific inspection checklist; summary of observations; highlight of missing information | Consistent, complete reports; never invents a visit or evidence |
| Officer review | Case summary, inconsistencies between complaint and field findings, missing evidence, draft recommendation | Reduces reading time; officer edits the draft |
| Final decision | Neutral draft note and points to consider | Supports, never replaces, the officer's reasoning |

## 6. Human decision-making and AI limitations
- AI **never** approves, rejects or returns a case. Only the three decision endpoints (human, role-checked, `confirm:true` required) change status.
- Every AI result is labelled as a suggestion, shown separately, and can be edited or ignored. Citizen text is never overwritten; translations appear beside it.
- Only the relevant case fields are sent to the AI. Output is JSON-validated with zod; invalid output, timeouts and failures show a friendly message and the workflow continues without AI.
- AI can be wrong, can mistranslate, and has no access to the site. Treat it as a draft.
- **Demo mode:** with no `ANTHROPIC_API_KEY` the app returns deterministic keyword-based samples, always labelled “DEMO MODE – not a real AI”. Live mode calls the Anthropic Claude API from the backend only.

## 7. Telugu support and usability
Telugu is the default; a visible తెలుగు / English switch is in the header (choice remembered). Statuses, stages, validation, buttons, AI panel and empty states are translated in simple language. Font: Noto Sans Telugu. Large (44px+) touch targets, "what to do next" banner per role, responsive layout, loading skeletons, clear error/empty states.

## 8. Architecture and key decisions
```
React + Vite + Tailwind + shadcn/ui  ──REST/JSON (JWT)──▶  Hono (Node, TS)  ──▶  PostgreSQL (Drizzle)
                                                                │
                                                                └──▶ Anthropic API (server-side only)
```
- Monorepo with `server/` and `web/`. In production the Hono server also serves the built SPA, so there is one container and no CORS.
- Role + state validation in one place (`workflow.ts`); each action writes domain rows and a history row in one DB transaction.
- Attachments (JPG/PNG/WebP/PDF, ≤2 MB) are stored in Postgres for simplicity. For a real pilot move them to S3.

## 9. Database
`users`, `grievances`, `grievance_assignments`, `field_verifications`, `officer_reviews`, `grievance_decisions`, `grievance_history`, `grievance_attachments`. Foreign keys, indexes, and CHECK constraints on role/status/category/priority. Reports, reviews, decisions and history are append-only, so earlier decisions are never overwritten. Schema: `server/src/db/schema.ts`; migrations in `server/drizzle/`.

## 10. API overview (all `/api`, JWT bearer except login)
| Method | Path | Notes |
|---|---|---|
| POST | `/auth/login` · GET `/auth/me` · GET `/auth/officers` | demo login |
| GET | `/dashboard` | totals, by stage, my work, prioritised queue |
| GET/POST | `/grievances` | list (search, filter, sort) / register (mandal) |
| GET | `/grievances/:id` · `/:id/attachments/:aid` | detail with history |
| PATCH | `/grievances/:id/classification` | edit/accept AI category+priority (mandal) |
| POST | `/grievances/:id/assign` | mandal |
| POST | `/grievances/:id/verification` | assigned field officer |
| POST | `/grievances/:id/review` | mandal: forward / return |
| POST | `/grievances/:id/decision` | approving officer: approve / reject / return |
| POST | `/ai/triage` `/translate` `/checklist` `/field-summary` `/review-assist` `/decision-note` · GET `/ai/status` | suggestions only |

## 11. Environment variables (`.env.example`)
`DATABASE_URL`, `DATABASE_SSL` (true for RDS), `JWT_SECRET`, `PORT`, `CORS_ORIGIN` (dev only), `ANTHROPIC_API_KEY` (optional), `ANTHROPIC_MODEL`, `AUTO_SEED` (seed demo data on first start only), `WEB_DIR`, and for the web dev server `VITE_API_URL`.

## 12–13. Local setup, migrate, seed
```bash
npm install
cp .env.example server/.env            # edit DATABASE_URL; set ANTHROPIC_API_KEY to enable live AI
echo "VITE_API_URL=http://localhost:8787" > web/.env
# a local Postgres, e.g.:
docker run -d --name praja-pg -e POSTGRES_USER=praja -e POSTGRES_PASSWORD=praja -e POSTGRES_DB=praja -p 5433:5432 postgres:16-alpine
npm run db:migrate
npm run db:seed                         # WARNING: truncates all tables, then loads 13 demo cases
npm run dev:server                      # http://localhost:8787
npm run dev:web                         # http://localhost:5173
npm run typecheck && npm run build
node server/scripts/smoke.mjs           # end-to-end API test (run after a fresh seed)
```
After changing the schema: `npm run db:generate -w server`, then `npm run db:migrate`.

## 14. Demo logins
Password for every account: **`Demo@123`**. The login screen lists all users; click one to sign in.

| Username | Role |
|---|---|
| `field1`, `field2` | Field Officer |
| `mandal1` | Mandal Officer |
| `approver1` | Approving Officer |

Suggested walkthrough: `mandal1` registers a case and assigns it to `field1` → `field1` submits a report → `mandal1` forwards → `approver1` approves / rejects / returns. Seed data has cases in every status.

## 15. Deployment (AWS)
Single container (API + SPA) on **ECS Fargate** behind an **ALB**, with **RDS PostgreSQL**, image in **ECR**.
1. `docker build -t praja . && docker tag praja <acct>.dkr.ecr.<region>.amazonaws.com/praja-parishkaram:v1 && docker push …`
2. Create RDS Postgres 16 (private, `db.t4g.micro`) and a security group allowing 5432 only from the app security group.
3. Create an ECS Fargate service (port 8080) behind an ALB with health check `/health`.
4. Task environment: `DATABASE_URL`, `DATABASE_SSL=true`, `JWT_SECRET`, optional `ANTHROPIC_API_KEY`, and `AUTO_SEED=true` for the first start only (it seeds only an empty DB). The container runs migrations on every start.
5. Production hardening (not done in the demo): HTTPS on the ALB with ACM, secrets in AWS Secrets Manager instead of task env vars, attachments in S3, private subnets with NAT, backups and Multi-AZ RDS.

A Vercel (web) + Render (API) split also works: build `web` with `VITE_API_URL=<api url>` and set `CORS_ORIGIN` on the API.

## 16. How to measure impact (proposed pilot metrics – no results are claimed)
- Average time to process a grievance (registration → decision) and time per stage, from `grievance_history`.
- Number and share of overdue cases.
- % of cases returned for missing information.
- Officer adoption and task completion rate (active officers, cases handled per officer).
- Accuracy and usefulness of AI suggestions: record accept / edit / ignore per suggestion and collect officer feedback (not yet built).

## Completed features
Full four-stage workflow with server-enforced roles and transitions; audit timeline; dashboard, search, filters, sorting; Telugu/English UI; seven AI functions with demo fallback and output validation; attachments; migrations and seed; Docker image; AWS deployment.

## Known limitations
- Live AI path (with a real `ANTHROPIC_API_KEY`) was **not** exercised in testing; only demo mode was.
- Demo login with a shared password; no password reset, no production auth.
- Attachments stored in the database; no virus scanning.
- No automated unit tests (a smoke script covers the API workflow); no AI feedback capture yet.
- The deployed demo uses HTTP, and secrets are passed as task environment variables.
