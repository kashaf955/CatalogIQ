# CatalogIQ

Tool for comparing your product catalog against competitor websites and updating your products based on the differences (pricing, titles, etc.).

## Stack

- **Backend**: Node.js + Express + TypeScript, MongoDB (via Mongoose), Cheerio/Axios for scraping competitor product pages.
- **Frontend**: React + Vite + TypeScript.

## Project structure

```
Backend/
  src/
    config/db.ts          MongoDB connection
    models/Product.ts     Product schema (own price + list of competitor listings)
    scrapers/              Competitor page scrapers (selectors are site-specific, fill in per competitor)
    controllers/           Route handlers
    routes/                Express routes
    index.ts               App entry point
  .env.example            Copy to .env and fill in MONGODB_URI

FrontEnd/                 React + Vite + TypeScript app (scaffolded, deps installed)
```

## Setup

### Backend

```
cd Backend
copy .env.example .env    # then edit MONGODB_URI if needed
npm install
npm run dev
```

Requires a running MongoDB instance (local or Atlas) matching `MONGODB_URI` in `.env`.

### Frontend

```
cd FrontEnd
npm run dev
```

## Status

- Frontend scaffolded and dependencies installed.
- Backend source files scaffolded (Express server, Product model, CRUD routes, scraper stub).
- **`npm install` in `Backend/` has not been run yet** — the machine's C: drive was full (0 GB free) at setup time, which blocks npm and other tooling. Free up space on C: and run `npm install` in `Backend/` to finish setup.
- Competitor scraping logic (`src/scrapers/genericScraper.ts`) is a stub — selectors need to be added once target competitor site(s) are known.
