# EVIDENCE

Fill this file with REAL command output after running the project. Do not invent evidence.

## 1. Widget CRUD + auth
Commands and output proving unauthenticated requests return 401 and authenticated CRUD works.

## 2. Tenant isolation
Show tenant A cannot access a widget/submission belonging to tenant B.

## 3. Cross-origin CORS + preflight
Paste:
- OPTIONS response
- successful submission from `test-site`

## 4. Validation
Show malformed JSON/body returns 400 and an oversized request returns a clean 4xx.

## 5. Rate limiting
Show a burst produces 429 while the service remains healthy.

## 6. Honeypot
Submit with a filled honeypot and show 204/no stored record.

## 7. Geo fallback
Use deterministic mocks in your test harness to prove A→B and A+B down→stored without geo.

## 8. Side-effect failure
Run with `SIDE_EFFECT_MODE=fail`; show submission returns 201 and appears in dashboard.

## 9. Cache headers
Paste headers for:
- `/api/widgets/:id/config`
- `/widget.v1.js`

## 10. Dashboard
Paste real output for submissions and stats.
