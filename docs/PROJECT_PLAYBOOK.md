# Position Helper Project Playbook

Last Updated: 2026-02-06
Status: Source of Truth (SSOT)

## 1) Product Direction

Position Helper is an operations tool for weekly video-team role assignment.

Primary outcomes:
- Faster weekly assignment execution
- Fair role distribution across members
- Fewer operational mistakes through rule-based warnings
- Better decisions via assignment and attendance analytics

Primary users:
- Team leads and operators managing weekly services

## 2) System Scope

Runtime architecture:
- Frontend: Vue 3 + Vite + TypeScript
- State: Pinia
- Backend: Netlify Functions
- Database: Neon Postgres (`@neondatabase/serverless`)
- Validation: Zod
- Charts: ECharts (`vue-echarts`)

Critical boundary:
- Client calls `/.netlify/functions/*` via `src/api/db.ts`
- Serverless functions handle auth + DB I/O

## 3) Execution Model

Local development standard:
- Use `npm run dev:netlify` only
- Default URL: `http://localhost:8888`

Reason:
- Auth cookie flow and function proxying depend on Netlify Dev runtime.

## 4) Engineering Workflow

Standard change flow:
1. Define change scope (domain rule/UI/data contract)
2. Implement in feature/store layer
3. Validate serverless boundary (`src/api/db.ts` + `netlify/functions`)
4. Run quality gates
5. Update this playbook when architecture/process changes

Quality gates:
1. `npm run type-check`
2. `npm run build`
3. `npm audit --audit-level=high`

## 5) Security Baseline

- All state-changing functions must verify auth (`verifyAuth`)
- Dev auth bypass must never apply in production context
- Sensitive internals should not leak in API errors
- One-off migration endpoints should be removed or hard-gated after use

## 6) Data and Domain Rules

Core domain:
- Weekly assignment for `part1`, `part2`
- Roles: `SW`, `자막`, `고정`, `사이드[2]`, `스케치`
- Warning engine enforces rotation/fairness constraints

Current source files:
- Domain types: `src/shared/types/index.ts`
- Assignment store: `src/stores/assignment.ts`
- Warning rules: `src/shared/utils/rules.ts`

## 7) Source Layout

- `src/features/*`: domain feature modules
- `src/components/*`: app/common/ui components
- `src/shared/*`: shared domain/types/utils/components
- `src/stores/*`: global state and core business actions
- `netlify/functions/*`: backend endpoints

## 8) Documentation Policy

Policy:
- This file is the single canonical reference for direction, architecture, and workflow.
- Other docs should be either:
  - task-specific deep dives, or
  - short index pages linking back here.

Update rule:
- Any change to runtime architecture, workflow, or quality gates must update this file in the same PR.
