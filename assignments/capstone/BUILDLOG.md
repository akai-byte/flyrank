# BUILDLOG

## AI usage

AI assistance was used to accelerate scaffolding, review API boundaries, and generate initial documentation.

Human review/actions:
- Checked the capstone requirements against the implementation.
- Kept tenant IDs in every widget/submission query.
- Reviewed validation, CORS, rate limiting, geo fallback, and side-effect failure boundaries.
- Planned deterministic failure modes for evidence testing.
- Any code generated with AI must be understood before submission.

## Known limitation

The demo authentication is intentionally simple: the seeded user UUID is used as a bearer token. For a production system this should be replaced with real password hashing/session or JWT authentication.
