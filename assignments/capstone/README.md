# FlyRank Capstone — Embeddable Widget & Lead-Capture Platform

## Mission

A small multi-tenant lead-capture platform. An owner manages a widget through an authenticated API, receives a one-line embed snippet, and visitors can submit from a different-origin website.

The backend validates, rate-limits, spam-checks, enriches IP data with a provider fallback, stores the submission, and performs a non-critical notification side effect.

## Architecture

```text
Widget Owner
    |
    v
Authenticated Widget API
    |
    +----> PostgreSQL (tenant-isolated)
    |
    +----> embed snippet
             |
             v
      Customer Website (port 5500)
             |
       widget.v1.js
             |
       GET /api/widgets/:id/config
             |
             v
          render
             |
       POST /api/submissions
             |
     +-------+-------+--------+
     |               |        |
 validation      rate/spam   geo
     |               |        |
     +---------------+--------+
                     |
                  PostgreSQL
                     |
              notification
              (failure safe)
                     |
                     v
              Dashboard API
```

## Explicit non-goal

This is a local portfolio capstone. It does not attempt to provide production-grade authentication, CDN hosting, visual form-builder features, or a full email delivery service.

## Stack

- Node.js + Express
- PostgreSQL
- Docker Compose
- Zod
- CORS
- express-rate-limit
- Plain HTML customer site

The brief specifies a free stack using Node/Express, PostgreSQL via Docker, ip-api.com + ipapi.co, and a local/console email side effect. 

## Setup

1. Copy `.env.example` to `.env`.
2. Start PostgreSQL:

```bash
docker compose up -d
```

3. Install:

```bash
npm install
```

4. Seed:

```bash
psql "postgres://postgres:postgres@localhost:5432/widget_platform" -f db/schema.sql
```

If `psql` is unavailable, run `db/schema.sql` using any PostgreSQL client.

5. Start API:

```bash
npm start
```

6. Start the second-origin customer page:

```bash
python -m http.server 5500 --directory test-site
```

7. Open:

```text
http://localhost:5500
```

## Demo authentication

For local evaluation only:

```text
Authorization: Bearer 00000000-0000-0000-0000-000000000011
```

Do not use this authentication design in production.

## Main endpoints

### Authenticated owner API

```text
GET    /api/widgets
POST   /api/widgets
GET    /api/widgets/:id
PUT    /api/widgets/:id
DELETE /api/widgets/:id
```

### Public delivery

```text
GET /api/widgets/:id/config
GET /widget.v1.js?id=:id
```

### Public submission

```text
OPTIONS /api/submissions
POST    /api/submissions
```

### Dashboard

```text
GET /api/dashboard/submissions
GET /api/dashboard/stats
```

## Embed snippet

For the seeded demo widget:

```html
<script src="http://localhost:3000/widget.v1.js?id=00000000-0000-0000-0000-000000000101"></script>
```

In a deployed system the domain would be replaced by the platform's domain.

## Security / resilience

- Boundary validation with Zod
- JSON body limit
- CORS with explicit allowed origins
- OPTIONS preflight support
- Rate limiting keyed by IP + widget
- Honeypot spam field
- Tenant ID included in owner queries
- Public config does not expose tenant information
- Geo provider A → B → no-geo fallback
- Notification failure does not fail the submission
- Correct 4xx responses for malformed input
- Long cache for versioned widget bundle
- Short cache for widget config

## Acceptance test plan

The evaluator probes in the brief are:

1. Valid second-origin submission → stored, 2xx, visible in dashboard.
2. Malformed/oversized payload → clean 4xx, never 500.
3. Burst → 429 responses, normal traffic remains possible.
4. Geo A down → B enriches; both down → stored without geo.
5. Notification failure → submission still succeeds and is stored.
6. Honeypot filled → rejected/dropped.

## Required submission files

- `README.md`
- `capstone.yaml`
- `EVIDENCE.md`
- `BUILDLOG.md`
- `.env.example`

## Limitations

- Demo bearer-token authentication is intentionally simple.
- Geo APIs depend on network availability during manual development.
- The widget is intentionally minimal.
- Notification is represented by a console side effect.
- Local Docker is used instead of production hosting.

## GitHub

Create a dedicated public repository named:

```text
flyrank-capstone-widget-platform
```

Build with small meaningful commits. Never commit `.env`, API keys, passwords, or tokens.

The capstone brief explicitly says not to submit a ZIP through the portal; submit the public GitHub repository URL instead.
