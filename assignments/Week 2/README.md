# Week 2 - Build your first CRUD API

This is a simple RESTful CRUD API that manages a to-do list, built with Node.js and Express.

## How to install and run

```bash
# Install dependencies
npm install

# Start the server
npm start
```

## Endpoints

| CRUD operation | HTTP method | Example endpoint | Meaning |
|---|---|---|---|
| Create | `POST` | `POST /tasks` | Add a new task |
| Read | `GET` | `GET /tasks` <br> `GET /tasks/:id` | List all tasks / get a single task by ID |
| Update | `PUT` | `PUT /tasks/:id` | Change a task (title/done) |
| Delete | `DELETE`| `DELETE /tasks/:id` | Remove a task |

*Also available:*
* `GET /` - Root endpoint showing API description.
* `GET /health` - Health check.
* `GET /docs` - Interactive Swagger UI for testing endpoints.

## Example `curl -i` Output

Testing the `GET /health` endpoint:

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

## Swagger UI Screenshot


