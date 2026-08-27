# CatalogIQ Backend

Node.js + Express + TypeScript API for CatalogIQ. Handles catalog/manufacturer imports,
deterministic + AI-assisted product matching, competitor scraping, and CSV export.

See the [root README](../README.md) for the full product overview and project structure.

## Stack

- **Express** (TypeScript, `ts-node-dev` in dev) — REST API
- **MongoDB / Mongoose** — data store
- **BullMQ + Redis** — optional background job queue (imports/matching/scraping can also run
  synchronously in-request without Redis)
- **Socket.IO** — live progress updates for long-running jobs
- **Playwright** — competitor site scraping
- **Anthropic SDK (`claude-sonnet-5`)** — verifies matches the deterministic engine can't
  resolve on its own
- **Multer / PapaParse / ExcelJS** — CSV/XLSX upload + parsing
- **Zod** — request validation

## Setup

```
copy .env.example .env
npm install
npm run dev
```

The server listens on `PORT` (default `4000`) and requires a reachable `MONGODB_URI`. It will
exit on startup if it can't connect to MongoDB.

## Scripts

| Command        | Description                                                  |
| -------------- | -------------------------------------------------------------- |
| `npm run dev`    | Start the API with hot reload (`src/index.ts`)                |
| `npm run worker` | Start the BullMQ worker (`src/queue/worker.ts`) — needs Redis |
| `npm run build`  | Type-check and compile to `dist/`                              |
| `npm start`      | Run the compiled server from `dist/`                            |

## Environment variables

| Variable              | Required | Purpose                                                                 |
| ---------------------- | -------- | ------------------------------------------------------------------------ |
| `PORT`                  | no       | API port, defaults to `4000`                                            |
| `MONGODB_URI`           | yes      | MongoDB connection string                                              |
| `REDIS_URL`             | no       | Enables `npm run worker` for true background processing                |
| `ANTHROPIC_API_KEY`     | no       | Enables Claude verification of ambiguous matches; safely no-ops without it |
| `DATAFORSEO_LOGIN` / `DATAFORSEO_PASSWORD` / `SERPAPI_API_KEY` / `APIFY_API_TOKEN` | no | Reserved for future search-assisted discovery — not currently wired into any code |

## API routes

All mounted under `/api`, plus `GET /health`.

| Base path                | Resource                                    |
| -------------------------- | -------------------------------------------- |
| `/overview`                 | Dashboard summary stats                     |
| `/our-catalog`              | Our-catalog product import/listing          |
| `/manufacturers`            | Manufacturer CRUD                           |
| `/manufacturer-products`    | Manufacturer catalog import/listing         |
| `/competitors`              | Competitor site config (base URL + selectors) |
| `/matching`                 | Deterministic matching engine triggers      |
| `/comparison`               | Manufacturer vs. our-catalog comparison results |
| `/review-queue`             | Ambiguous/needs-review matches              |
| `/processing-runs`          | Background job status/progress              |
| `/exports`                  | Upload-ready CSV export                     |

## Background jobs

`npm run worker` runs a separate process consuming BullMQ queues (`src/queue/`) and calls the
exact same service functions (`src/services/`) as the synchronous route handlers, emitting
progress over Socket.IO. Without Redis running, imports/matching/scraping still work — they just
execute inline within the HTTP request instead of being queued.

## Competitor scraping

Competitor discovery (`src/services/scraperService.ts`) requires each `CompetitorSite` to be
configured with a `searchUrlTemplate` and CSS selectors (via the frontend's Competitors page or
`POST /api/competitors`) — there is no automatic product discovery. Review each target site's
Terms of Service and `robots.txt` before scraping.
