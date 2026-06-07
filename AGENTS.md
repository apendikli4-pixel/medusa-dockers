# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

PROJECT-AYNA-GENESIS is an AI-powered e-commerce platform built on **Medusa v2 (2.13.4)**. It is a pool-supply retail platform (Aqua Havuz) with a custom AI assistant called **Ayna** backed by Google Gemini. The codebase is split into two independent sub-projects:

- **Backend** (root): Medusa v2 server (`src/`) — runs on port 9000
- **Storefront** (`storefront/`): Next.js 15 frontend — runs on port 8000

Infrastructure is PostgreSQL 15 with pgvector, Redis, and Meilisearch, all managed via Docker Compose.

---

## Commands

### Full Stack (Docker — primary workflow)

```bash
# Start all services (postgres, redis, meilisearch, medusa-server, medusa-worker, storefront)
docker-compose up -d

# Rebuild after Dockerfile or dependency changes
docker-compose up -d --build

# View backend logs
docker logs -f medusa_server_core_v2

# View storefront logs
docker logs -f medusa_storefront
```

> **IMPORTANT:** Never run `npm install` on the host. Dependencies are managed inside containers. The `node_modules`, `.medusa`, and `dist` directories are anonymous Docker volumes and must never be bind-mounted from the host.

### Backend (Medusa) — run inside container or locally for type-checking only

```bash
npm run dev          # medusa develop --host 0.0.0.0 (local dev, not Docker)
npm run build        # medusa build (compiles admin UI + server)
npm run db:migrate   # run pending DB migrations
npm run db:create    # create the database
```

### Tests (Backend)

```bash
npm test                            # run all tests (jest)
npx jest path/to/file.spec.ts       # run a single test file
```

Tests live in `**/__tests__/**/*.spec.ts`. The jest config mocks `@medusajs/framework/utils` using `src/modules/ayna/__tests__/__mocks__/medusa-utils.ts`.

### TypeScript type-check (no emit)

```bash
npx tsc --noEmit
```

### Storefront

```bash
# From the storefront/ directory:
npm run dev     # next dev -p 8000
npm run build   # next build
npm run lint    # next lint
```

---

## Architecture

### Backend Layers

```
src/
├── api/                  # Route handlers
│   ├── admin/            # Admin-only routes (JWT required)
│   └── store/            # Public/customer routes (optional auth)
├── modules/              # Custom Medusa modules (isolated services + DB tables)
│   ├── ayna/             # AI chat agent (Gemini-powered)
│   ├── content_engine/   # Blog/CMS
│   ├── conscience/       # Ethical filter for AI decisions
│   └── wishlist/         # Customer wishlist + restock notifications
├── providers/            # External service integrations
│   ├── paytr/            # PayTR payment gateway
│   ├── iyzico/           # Iyzico payment gateway
│   ├── brevo/            # Brevo email notifications
│   ├── cloudinary/       # Cloudinary file storage
│   ├── yurtici/          # Yurtiçi Kargo fulfillment
│   └── manual/           # Manual payment (cash/wire)
├── workflows/            # Saga-pattern business logic (Workflow SDK)
├── links/                # Cross-module entity links (defineLink)
├── subscribers/          # Event-driven handlers
├── jobs/                 # Scheduled background jobs
└── middlewares/          # API middleware (auth guards)
```

All custom modules are registered in `medusa-config.ts`. Each module in `src/modules/` is a fully isolated service with its own DB tables (via Medusa DML) and optional migrations.

### Worker / Server Split

The Docker Compose setup runs two Medusa containers:

- `medusa-server`: `MEDUSA_WORKER_MODE=server` — handles HTTP requests
- `medusa-worker`: `MEDUSA_WORKER_MODE=worker` — processes background workflows

Both share the same source volume mount, so code changes appear in both without rebuild.

### Ayna Module — AI Agent Architecture

`src/modules/ayna/` is the core AI module. `AynaService` (`service.ts`) orchestrates AI logic via `HybridAIProviderService`.

**100% Open Source AI (Ollama)**: As of 2026-06, Gemini has been completely removed to ensure zero data-leakage and no quota limits. The system relies purely on a self-hosted Ollama backend (`OLLAMA_API_URL`):
- `qwen2.5:7b` (or similar) is used for standard text and function-calling (`OLLAMA_CHAT_MODEL`).
- `nomic-embed-text` is used for vector embeddings (`OLLAMA_EMBED_MODEL`).
- `llava` (or `llama3.2-vision`) is triggered automatically when the user uploads an image (`OLLAMA_VISION_MODEL`).

**Memory system (three layers):**
- `MemoryTruth` — immutable event log, never deleted
- `MemoryInsight` — learnable user profile facts; archived (not deleted) when summarized
- `MemoryConscience` — ethical decision audit trail

**Customer links** (`src/links/`): Medusa customers are linked to both `MemoryInsight` and `MemoryTruth` records via `defineLink`.

**Multi-Tenant Sector Agnostic Tools:** The agent dynamically routes tools based on `tenant.sector`.
- **Global Tools:** `search_products`, `check_inventory`, `conscience_check`.
- **Pool Sector Tools:** `calculatePoolChemicals`, `volumeCalculator`.
- **Vape Sector Tools:** `vapeCalculator` (Nic-Shot / Base liquid mixer).
- **Admin Tools (All Sectors):** `create_product`, `create_category`, `manage_inventory`, `create_campaign`, `create_blog_post`, `track_order`, `generate_storefront_data` (Auto-Store Generator), `system_audit`, `system_auto_fix`, `predict_stock_shortage`, `create_mission` (autonomous AI tasks), `analyze_traffic` (GA4 integration).

**Storefront Multi-Modal Chat:**
The frontend chat widget (`storefront/src/modules/chat/components/chat-widget.tsx`) supports image uploads. Images are sent as Base64 via the Next.js proxy to the backend, which dynamically routes them to the Vision model for physical product identification.

**Smart Analytics (GA4):**
The `GA4Service` (`src/lib/analytics/ga4-service.ts`) provides active user, session, and pageview data. If `.env` keys (`GA4_PROPERTY_ID`, `GA4_CLIENT_EMAIL`, `GA4_PRIVATE_KEY`) are missing, it falls back to Mock Simulation Mode. Ayna uses this data to proactively propose `create_mission` tasks (e.g., creating SEO blog posts for low-traffic pages).

**Dual endpoints:**
- `POST /store/ayna/chat` — customer-facing, optional auth (supports `image` payload)
- `POST /admin/ayna/chat` — admin mode, all tools unlocked, JWT required

### Workflow SDK (Saga Pattern)

Complex multi-step operations live in `src/workflows/` and use Medusa's `createStep` / `createWorkflow`. Each step must define a compensation function so the workflow auto-rolls back on failure. Example: `generate-content.ts` creates AI content then writes to the DB; if the DB write fails, the generated content is discarded.

### Wishlist Module (Store + Admin)

- Store endpoints:
	- `GET /store/wishlist`
	- `POST /store/wishlist`
	- `DELETE /store/wishlist/:itemId`
- Admin endpoint:
	- `POST /admin/wishlist/restock` (manual restock notification trigger)
- Restock automation:
	- `src/subscribers/product-restock.ts` listens `product.updated` and sends notifications to customers who enabled `notify_on_restock`.

### Storefront Structure

```
storefront/src/
├── app/                  # Next.js App Router pages
│   ├── [countryCode]/    # Locale-aware routes
│   └── api/              # Next.js API routes (server actions)
├── modules/              # Feature-based UI components
│   └── chat/             # Ayna chat widget
├── lib/
│   ├── data/             # Medusa JS SDK calls (server-only)
│   ├── ai/               # Client-side AI helpers
│   └── hybrid-search.ts  # Meilisearch integration
└── middleware.ts         # Locale detection + publishable key injection
```

---

## Key Rules from GENESIS_PROTOCOL (docs/GENESIS_PROTOCOL/)

- **Only Medusa v2 patterns** — never use TypeORM `@Entity`, `@Service`, or any Medusa v1 construct. Use `model.define()` for all DB models.
- **Explicit Link Definitions** — When defining cross-module links in `src/links/`, NEVER pass the module object directly (e.g., `AynaModule.linkable.memoryTruth`). Always use explicit object configuration: `{ serviceName: "ayna", field: "memory_truth", entity: "MemoryTruth", linkable: "memoryTruth", primaryKey: "id" }`. Direct module imports cause fatal `Service undefined` cyclic dependency errors during `db:migrate` operations!
- **Strict API Security (Zod)** — All custom API routes MUST use `zod` for request body validation. Never use `req.body as any`. For `/store` routes, user identity (`customerId` and `customerGroup`) MUST be strictly retrieved and validated from Medusa's secure session (`req.auth_context?.actor_id`), NEVER directly from the client request body to prevent Prompt Injection vulnerabilities.
- **TypeScript Purity** — The repository must remain strictly TypeScript. Transient/debugging `.js` or `.mjs` scripts in the root or `src/scripts` directories are strictly prohibited. **Backend `tsconfig.json` is now `strict: true`** (updated 2026-03-24).
- **DML field types** — always use `model.number()`. Using `model.bigint()` or `model.double()` causes runtime errors in Medusa v2.
- **No `(container as any)`** — inter-module calls must use `remoteQuery` or explicit dependency injection.
- **Financial math** — use Medusa's `BigNumber` utilities for all price, tax, and stock arithmetic; never raw JS floats.
- **Mock providers** — set `USE_MOCK_PROVIDERS=true` in `.env` to activate test stubs for Yurtiçi and other external services.
- **Client IP** — payment providers (PayTR, Iyzico) must receive the real user IP via `src/utils/get-client-ip.ts`, which resolves `x-forwarded-for` → `x-real-ip` → `cf-connecting-ip` → `127.0.0.1`.
- **Sealed modules** — files marked with `@sealed` in their header must not be modified without documenting intent and re-testing. Check `docs/GENESIS_PROTOCOL/08_ARCHITECTURE_SEAL.md` (if present) before editing sealed files.
- **Research first** — before implementing any feature, check official Medusa v2 docs and community plugins. Do not re-implement what already exists.
- **Zod on ALL custom routes** — Every custom API route (both `/admin/*` and `/store/*`) MUST validate request body with a Zod schema. `req.body as any` is prohibited. Invalid requests must return `400` with Zod error details. (enforced 2026-03-24)
- **No error internals in responses** — `error.stack`, file paths, and internal class names must NEVER appear in JSON responses. Log with `logger.error()` server-side only. (enforced 2026-03-24)
- **Rate limit AI endpoints** — Any route that triggers a Gemini/LLM call MUST apply `createRateLimiter` from `src/lib/rate-limiter.ts`. Store: 20 req/min, Admin: 10 req/min. (enforced 2026-03-24)
- **HTTP method semantics** — Routes that mutate state (create, update, delete) must use `POST`/`PUT`/`DELETE`. Never use `GET` for write operations. (enforced 2026-03-24)


## Medusa V2.15 Upgrade Path (COMPLETED)

**Status: COMPLETED.** The backend has been fully upgraded to **v2.15.3**.
- Zod v3 → v4 migration is complete (`@medusajs/framework/zod`).
- All strict type-checking and HTTP alignments have been verified.
- The DB schema migrations for v2.15 have been fully applied.

*Legacy upgrade notes below for historical reference:*
Why we jumped directly to v2.15.2+:
- v2.13.6 introduced a MikroORM regression where `medusa db:migrate` then `medusa db:generate` would generate "drop all tables" migrations for custom modules. v2.15.2+ is the official fix.

Legacy Upgrade procedure (Faz 1 - DONE):
```bash
# This was already executed:
npm install @medusajs/framework@2.15.3 ...
npm install zod@^4.2.0
npx medusa codemod replace-zod-imports
npx medusa db:migrate       # apply v2.15 schema updates
```

## Financial Math Helpers (src/lib/money.ts)

Medusa V2 entity money fields (`order.total`, `line_item.unit_price`, `tax_total`, etc.) are `BigNumber` / `BigNumberInput`. Raw JS arithmetic (`Number(x)`, `x / 100`, `Math.floor(x * rate)`) loses precision on large values and violates the "BigNumber for finance" rule.

Always use the helpers in `src/lib/money.ts`:
- `toBig(input)` → BigNumber instance, defensive (null/undefined → BigNumber(0))
- `toNumber(input)` → safe JS number (BigNumber-aware coercion)
- `minorToMajorFloor(input, divisor=100)` → kuruş → TL integer (used by loyalty subscriber)
- `roundToMinor(input)` → for payment gateways needing integer kuruş (PayTR, İyzico)
- `isValidAmount(input)` → positive finite check, returns boolean (no throw)

Forbidden patterns:
- ❌ `Number(order.total)` — use `toNumber(order.total)`
- ❌ `(order.total || 0) / 100` — use `minorToMajorFloor(order.total)`
- ❌ `Math.round(amount)` on a BigNumber — use `roundToMinor(amount)`
- ❌ Inline BigNumber.js imports — go through `lib/money.ts` so all money math has one audit point


## Auth

- All `/admin/*` routes require `authenticate("admin", ["bearer", "session"])`.
- `/store/ayna*` uses `authenticate("customer", ["bearer", "session"], { allowUnauthorized: true })` — `customerId` is optional; if present, memory is persisted per customer.
- `/store/wishlist*` uses `authenticate("customer", ["bearer", "session"])` — customer auth is mandatory.
- `/admin/wishlist*` requires `authenticate("admin", ["bearer", "session"])`.
- Store API calls require `x-publishable-api-key` header.
- **`GET /admin/setup` is now `POST /admin/setup`** (updated 2026-03-24). If you call this endpoint from scripts or Postman, update to POST.

## AI Tool Access Control

- Store chat (`isAdmin: false`) tools: `search_products`, `check_inventory`, `calculatePoolChemicals`, `conscience_check`.
- Admin chat (`isAdmin: true`) additionally unlocks: `system_audit`, `system_auto_fix`, `predict_stock_shortage`, `create_product`, `create_category`, `manage_inventory`, `create_campaign`, `create_blog_post`.
- `AynaToolService.handleToolCall()` enforces `isAdmin` check for admin-only tools at the service level — not just at the prompt level. Adding new admin-only tools MUST include an `if (!services?.isAdmin)` guard.

## Storefront Chat Architecture

- `ChatWidget` in `storefront/src/app/layout.tsx` receives `customer` and `customerGroup` via server-side `retrieveCustomer()`. **Never render `<ChatWidget />` without props** — this breaks per-customer AI memory.
- The widget POSTs to `/api/chat` (Next.js proxy route) — NOT directly to the backend. This keeps backend URL and publishable key off the client bundle.
- The proxy at `storefront/src/app/api/chat/route.ts` uses `MEDUSA_BACKEND_URL` (server-side env) to reach the backend via the internal Docker network.

## Required Environment Variables

See `.env` at the root (backend) and `storefront/.env`. The minimum required to run Ayna:

```
GEMINI_API_KEY=          # Google Gemini API key
DATABASE_URL=            # postgres connection string
REDIS_URL=               # redis connection string
STORE_CORS=              # allowed storefront origins
ADMIN_CORS=              # allowed admin origins
AUTH_CORS=               # allowed auth origins
```
