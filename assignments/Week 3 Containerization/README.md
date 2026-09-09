# Week 4 - Containerize your stack

This is a RESTful CRUD API managed entirely by Docker Compose, running Node.js and a PostgreSQL database in containers.

## How to run
```bash
docker compose up
```

## Environment
Ensure you have a `.env` file created based on the `.env.example`.

## Endpoints

| CRUD operation | HTTP method | Example endpoint | Meaning |
|---|---|---|---|
| Create | `POST` | `POST /tasks` | Add a new task |
| Read | `GET` | `GET /tasks` <br> `GET /tasks/:id` | List all tasks / get a single task by ID |
| Update | `PUT` | `PUT /tasks/:id` | Change a task (title/done) |
| Delete | `DELETE`| `DELETE /tasks/:id` | Remove a task |

## Example `curl -i` Output
```http
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 15
ETag: W/"f-v/Y1JusChTxrQUzPtNAKycooAQI"
Date: Wed, 29 Jul 2026 12:00:00 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"status":"ok"}
```

## Database Screenshot
![Database UI screenshot](./db-screenshot.png)
