# W5 A9 — The Polite Scraper

A small Node.js 20+ scraping pipeline for the Books to Scrape practice sandbox.

## What it does

The pipeline follows:

**classify → fetch → cache → discover → extract → normalize → validate → store → report**

It processes exactly the first three catalogue pages and discovers the 60 book URLs from the catalogue's own `next` links.

## Target classification

- **Target:** Books to Scrape — `https://books.toscrape.com/`
- **Why:** The assignment identifies it as a public practice sandbox intended for scraping practice.
- **Scope:** First 3 catalogue pages only.
- **Data:** title, product URL, price text, availability text, rating text, description, source page, fetch timestamp, and normalized `price_gbp`.
- **Appropriateness:** This project uses the designated public practice sandbox rather than applying the scraper to an unrelated website.

I will not reuse this code on another site without checking its rules and terms first.

## Robots check

Run the project once and record the `robots.txt` status printed by the program. The assignment specifically requires checking `https://books.toscrape.com/robots.txt` once.

## Requirements

- Node.js 20+
- npm

Install:

```bash
npm install
```

Run:

```bash
npm start
```

## Politeness rules

- Identifying User-Agent: `FlyRankInternship-A9/1.0 (+repo-link)`
- Timeout: 8 seconds
- Minimum delay between real requests: 600 ms
- Status checked before parsing
- Development uses cached HTML after the first request
- One retry is used for timeouts / 5xx responses
- 404 and 403 responses are not retried
- Cache is excluded from Git

## Output

- `output/books.json` — validated records
- `output/errors.json` — invalid/failed pages with reasons
- `output/run-report.json` — honest run statistics
- `cache/` — local development cache, ignored by Git

## Record schema

```json
{
  "title": "A Light in the Attic",
  "product_url": "https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html",
  "price_text": "£51.77",
  "availability_text": "In stock (22 available)",
  "rating_text": "Three",
  "description": "...",
  "source_page": "https://books.toscrape.com/catalogue/page-1.html",
  "fetched_at": "2026-08-06T10:00:00.000Z",
  "price_gbp": 51.77
}
```

`description` may be `null` when the page has no description.

## Failure test

The assignment requires proving that one bad page does not kill the run.

After a normal successful run, execute:

```bash
npm start -- --inject-failure
```

The program intentionally requests a fake 404 page. The good records should still be written and the report should show one failed page.

## Idempotency

Run:

```bash
npm start
npm start
```

The second run should mainly use cache and `books.json` should still contain exactly 60 unique records, not 120.

## Ethics

Use an official API when one exists. Never bypass logins, paywalls, blocks, or access controls. Collect only the data needed for the task.

The core assignment needs no paid proxy, cloud account, or credit card.

## Browser note

The core Books to Scrape assignment does not need a browser because the required data is already present in the HTML returned by the server. A browser would add unnecessary cost and complexity.

For the optional browser comparison, use the assignment's `quotes.toscrape.com/js` task and record plain HTTP vs Playwright time/memory separately.

## Suggested 7 commits

```text
Stage 0: classify scraping target
Stage 1: fetch and cache HTML
Stage 2: discover three catalogue pages
Stage 3: extract book details
Stage 4: validate normalized records
Stage 5: survive failures, report the run
Stage 6: publish scraper evidence
```

## Important

Replace the placeholder GitHub repository URL in `src/index.js`:

```text
https://github.com/YOUR_USERNAME/YOUR_REPO
```

with your actual public repository URL before submitting.
