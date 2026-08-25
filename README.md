# CatalogIQ

Product matching, manufacturer comparison and competitor intelligence platform. Collects product
data from your own catalog, manufacturer catalogs and competitor websites, compares it with rules
and AI, and produces an upload-ready CSV of verified changes.

This is the first implementation pass: CSV/Excel import for both our catalog and manufacturer
catalogs, brand-scoped manufacturer comparison with deterministic matching, a review queue, and
CSV export. Competitor scraping (Playwright) and Claude AI verification are fully wired but need
you to supply a target site config / API key respectively — see "What needs external setup" below.

## Stack

- **Backend**: Node.js + Express + TypeScript, MongoDB (via Mongoose), Zod validation, BullMQ +
  Redis for background jobs, Socket.IO for live progress, Playwright for competitor scraping,
  Claude API for ambiguous-match verification.
- **Frontend**: React + TypeScript + Vite, Tailwind CSS, hand-authored shadcn/ui-style components,
  React Router.

## Project structure

```
Backend/src/
  types/standardProduct.ts   Shared "Standard Product" shape every source is normalized into
  models/                    OurProduct, Manufacturer, ManufacturerProduct, CompetitorSite,
                              CompetitorProduct, ImportMapping, MatchResult, ProcessingRun
  services/
    fileParsingService.ts        CSV/XLSX parsing
    columnMappingService.ts      Header -> standard field mapping + suggestion
    ourCatalogImportService.ts   Our-catalog import
    manufacturerImportService.ts Manufacturer file import (status/replacement parsing)
    matchingEngine.ts            Deterministic matching (MPN/GTIN/SKU/brand+name signals)
    manufacturerStatusService.ts Active/discontinued/replacement conflict resolution
    claudeVerificationService.ts Claude API call for ambiguous matches only
    scraperService.ts            Playwright-driven competitor discovery + extraction
    competitorScrapeService.ts   Batch scrape runner shared by route + worker
    exportService.ts             Upload-ready CSV builder
  queue/                     BullMQ queues + standalone worker + Socket.IO progress emitter
  routes/                    REST API, one file per resource, mounted under /api
  middleware/                Multer upload config, async error wrapper

FrontEnd/src/
  api/                       Typed axios client + response types
  components/ui/             Small hand-authored shadcn-style primitives (Button, Card, Badge, ...)
  components/features/       UploadWizard, ComparisonRow (three-column side-by-side), StatusBadge
  components/layout/         Sidebar nav + page shell
  pages/                     Overview, OurCatalog, Manufacturers(+detail), Competitors,
                              Comparison, ReviewQueue, ProcessingRuns, Exports
```

## Setup

### Backend

```
cd Backend
copy .env.example .env
npm install
npm run dev
```

Requires a running MongoDB instance matching `MONGODB_URI` in `.env`. The app boots fine without
Redis or an Anthropic key — those just gate specific features (see below).

To run background jobs through BullMQ instead of inline (needed at real scale): start Redis, then
`npm run worker` in a separate terminal. The worker calls the exact same service functions as the
synchronous API routes.

### Frontend

```
cd FrontEnd
npm install
npm run dev
```

The Vite dev server proxies `/api` and `/socket.io` to `http://localhost:4000`.

## What needs external setup

- **Redis** (`REDIS_URL` in `Backend/.env`) — required only to run `npm run worker` for true
  background processing. Without it, imports/matching/scraping still work, just synchronously
  within the request.
- **`ANTHROPIC_API_KEY`** — required for Claude to weigh in on ambiguous matches. Without it,
  ambiguous matches are simply left as `needs_review` for a human.
- **A competitor site config** (Competitors page) — the scraper is generic/selector-driven; point
  it at a real competitor's search URL + CSS selectors before running a scrape.

## Try it end-to-end without any of the above

1. Our Catalog Sources → upload a CSV/Excel export of your products.
2. Manufacturer Catalogs → add a manufacturer → upload its file → map columns → pick the brand
   column.
3. Open the manufacturer → select brand(s) → "Compare selected brand(s)".
4. Manufacturer Comparison → review the side-by-side results, approve/reject/mark variant.
5. Exports → download the upload-ready CSV of approved changes.
