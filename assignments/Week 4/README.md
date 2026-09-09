# Week 4 - Auth: Login & protect

This API uses **Supabase Auth** for secure JWT-based authentication.

## Setup
1. Copy `.env.example` to `.env`.
2. Fill in your `SUPABASE_URL` and `SUPABASE_KEY` from your Supabase Dashboard (Settings -> API).
3. Ensure Docker is running.
4. Run `docker compose up` to start the app and database.

## Auth Endpoints

| Purpose | Route | Auth Header |
|---|---|---|
| Sign up | `POST /auth/signup` | None |
| Log in | `POST /auth/login` | None |
| Log out | `POST /auth/logout` | `Authorization: Bearer <token>` |
| Public info | `GET /public/info` | None |
| Private profile| `GET /protected/profile`| `Authorization: Bearer <token>` |

## Swagger UI
You can use the interactive Swagger docs at `/docs`. Click the **Authorize** button (lock icon) and paste your JWT to test protected routes.

![Swagger UI screenshot](./swagger-screenshot.png)
