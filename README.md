# CatalogIQ

Multi-tenant SaaS for product matching, manufacturer comparison, and competitor intelligence. CatalogIQ ingests catalog, manufacturer, and competitor data into one standard product model, then matches, reviews, and exports upload-ready updates.

Backend folders are in place. Application code is intentionally empty so you can implement each layer.

---

## Project setup

```text
CatalogIQ/
├── Backend/
│   ├── src/
│   │   ├── config/              Env, MongoDB, Redis
│   │   ├── models/              Tenant, User, Membership, Product, sources
│   │   ├── middleware/          Auth, tenant, roles, validation, errors
│   │   ├── routes/              Express routers
│   │   └── utils/               JWT, errors, helpers
│   ├── server.js
│   └── package.json
└── README.md
```

---

## Multi-tenant SaaS model

Every paying customer is a **tenant** (a company workspace). Users belong to one or more tenants through **memberships**. All catalog data lives in a shared MongoDB cluster and is isolated by `tenantId` — the usual starting point for a B2B SaaS launch. High-volume customers can later move to a dedicated database without changing the product model.

```mermaid
flowchart TB
  subgraph clients [Clients]
    Web["Web app<br/>tenant.catalogiq.app"]
    APIClients["API / CSV upload"]
  end

  subgraph edge [API edge]
    Auth["JWT auth"]
    TenantMW["Tenant resolver<br/>token.tid + membership"]
  end

  subgraph api [CatalogIQ API]
    Catalogs["Our catalogs"]
    Mfr["Manufacturer catalogs"]
    Comp["Competitors"]
    Match["Matching + Claude"]
    Review["Review queue"]
    Export["CSV / Excel export"]
  end

  subgraph data [Shared data plane]
    Mongo[("MongoDB Atlas<br/>tenantId on every document")]
    Redis[("Redis<br/>BullMQ + job state")]
  end

  subgraph workers [Background workers]
    QMatch["matching"]
    QScrape["scrape"]
    QAI["ai-verify"]
  end

  Web --> Auth
  APIClients --> Auth
  Auth --> TenantMW
  TenantMW --> Catalogs
  TenantMW --> Mfr
  TenantMW --> Comp
  TenantMW --> Match
  TenantMW --> Review
  TenantMW --> Export
  Catalogs --> Mongo
  Mfr --> Mongo
  Comp --> Mongo
  Match --> Redis
  Review --> Mongo
  Export --> Mongo
  Redis --> QMatch
  Redis --> QScrape
  Redis --> QAI
```

### Isolation rules

```mermaid
erDiagram
  TENANT ||--o{ MEMBERSHIP : has
  USER ||--o{ MEMBERSHIP : has
  TENANT ||--o{ CATALOG_SOURCE : owns
  TENANT ||--o{ PRODUCT : owns
  TENANT ||--o{ PROCESSING_RUN : owns
  CATALOG_SOURCE ||--o{ PRODUCT : contains

  TENANT {
    ObjectId id
    string name
    string slug
    string plan
    string status
  }
  USER {
    ObjectId id
    string email
    string passwordHash
    string name
  }
  MEMBERSHIP {
    ObjectId tenantId
    ObjectId userId
    string role
  }
  CATALOG_SOURCE {
    ObjectId tenantId
    string type
    string name
  }
  PRODUCT {
    ObjectId tenantId
    ObjectId sourceId
    string sku
    string mpn
    string brand
  }
  PROCESSING_RUN {
    ObjectId tenantId
    string status
  }
```

| Layer | How a tenant is isolated |
| --- | --- |
| Auth | JWT carries `sub` (user) and `tid` (active tenant) |
| Membership | User can act on a tenant only with an active membership |
| Queries | Always filter by `tenantId` |
| Writes | Always stamp `tenantId` from the current workspace |
| Jobs | Queue payloads include `tenantId`; workers never cross tenants |
| Plans | `trial` / `starter` / `growth` / `scale` live on the tenant record |

Roles: `owner`, `admin`, `reviewer`, `member`.

---

## Request path

```mermaid
sequenceDiagram
  participant C as Client
  participant API as Express API
  participant Auth as Auth middleware
  participant T as Tenant middleware
  participant DB as MongoDB

  C->>API: Authorization Bearer JWT
  API->>Auth: Verify token
  Auth->>T: userId + tenantId
  T->>DB: Load tenant + membership
  alt Suspended or no membership
    T-->>C: 403
  else Active workspace
    T->>API: req.user, req.tenant, req.membership
    API->>DB: Query with tenantId
    DB-->>C: Tenant-scoped JSON
  end
```

---

## Product data flow

```mermaid
flowchart LR
  subgraph ingest [Ingest]
    API["Ecommerce API<br/>BigCommerce / Shopify / Woo"]
    File["CSV / Excel / feed"]
    Site["Competitor site<br/>Playwright / Apify"]
  end

  STD["Standard product record<br/>SKU, MPN, brand, GTIN, specs, images"]

  subgraph engine [Per-tenant engine]
    Det["Deterministic match<br/>MPN / GTIN / SKU / brand"]
    AI["Claude on ambiguous cases"]
    Human["Human review"]
  end

  Out["Upload-ready CSV"]

  API --> STD
  File --> STD
  Site --> STD
  STD --> Det
  Det --> AI
  AI --> Human
  Human --> Out
```

The matching engine should not depend on a single ecommerce platform. Every source maps into the same internal product shape, then filters by manufacturer and brand so a store with many brands does not compare the whole catalog at once.

---

## Stack

| Area | Choice |
| --- | --- |
| API | Node.js, Express, TypeScript |
| Database | MongoDB (shared cluster, `tenantId` isolation) |
| Cache / jobs | Redis + BullMQ |
| Live progress | Socket.IO |
| Validation | Zod |
| AI | Claude API |
| Browser automation | Playwright / Apify |
| Frontend (planned) | React, TypeScript, Vite, Tailwind, shadcn/ui |
| Deploy | Docker |

---

## Implementation phases

1. **Setup** — fill the folders: auth, tenant isolation, models
2. **Proof of concept** — 50 products, one manufacturer, one competitor
3. **Beta** — matching, scraping, review queue
4. **Scale** — background jobs, cost controls, 2,000+ products
5. **Launch** — billing plans, invites, more sources, scheduled runs
