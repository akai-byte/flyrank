# Week 3 - Connecting your CRUD to the database

This project upgrades the Week 2 CRUD API to use a **SQLite database** instead of an in-memory list.

## Why SQLite?
SQLite was chosen because it's a serverless, zero-config database that lives in a single file (`tasks.db`). This makes it incredibly easy to set up and ensures our data survives server restarts without needing complex database infrastructure.

## How to install and run

```bash
# Install dependencies
npm install

# Start the server (this will automatically create the tasks.db file and seed it with 3 tasks)
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

## Database Exploration (Stage 4)

Example SQL Query I ran in DB Browser for SQLite:
```sql
SELECT * FROM tasks WHERE done = 1;
```
*What it returned:* It returned 1 row for the 'Learn JS' task which was seeded as completed (`done = 1`).

## Swagger UI & DB Browser Screenshots

![DB Browser screenshot](./db-browser-screenshot.png)
*(Note: Please replace the dummy screenshot link with an actual image of the DB Browser).*
