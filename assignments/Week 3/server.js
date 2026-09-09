const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./openapi.json');
const Database = require('better-sqlite3');
const db = new Database('tasks.db');

// Create table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    done INTEGER NOT NULL
  )
`);

// Seed data if empty
const count = db.prepare('SELECT COUNT(*) AS c FROM tasks').get().c;
if (count === 0) {
  const insert = db.prepare('INSERT INTO tasks (title, done) VALUES (?, ?)');
  insert.run('Learn JS', 1);
  insert.run('Learn Node', 0);
  insert.run('Learn Express', 0);
}

const app = express();
app.use(express.json());
const port = 3000;

app.get('/', (req, res) => {
  res.json({ "name": "Task API", "version": "1.0", "endpoints": ["/tasks", "/docs"] });
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/health', (req, res) => {
  res.json({ "status": "ok" });
});

app.get('/tasks', (req, res) => {
  const allTasks = db.prepare('SELECT * FROM tasks').all();
  const formattedTasks = allTasks.map(t => ({ ...t, done: t.done === 1 }));
  res.json(formattedTasks);
});

app.get('/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (task) {
    task.done = task.done === 1;
    res.json(task);
  } else {
    res.status(404).json({ "error": `Task ${id} not found` });
  }
});

app.post('/tasks', (req, res) => {
  const { title } = req.body;
  if (!title || title.trim() === '') {
    return res.status(400).json({ "error": "Bad Request: title is missing or empty" });
  }
  const info = db.prepare('INSERT INTO tasks (title, done) VALUES (?, ?)').run(title, 0);
  const newTask = {
    id: info.lastInsertRowid,
    title,
    done: false
  };
  res.status(201).json(newTask);
});

app.put('/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!task) {
    return res.status(404).json({ "error": `Task ${id} not found` });
  }

  const { title, done } = req.body;
  if (Object.keys(req.body).length === 0 || (title !== undefined && title.trim() === '')) {
    return res.status(400).json({ "error": "Bad Request: Invalid body or empty title" });
  }

  const newTitle = title !== undefined ? title : task.title;
  const newDone = done !== undefined ? (done ? 1 : 0) : task.done;

  db.prepare('UPDATE tasks SET title = ?, done = ? WHERE id = ?').run(newTitle, newDone, id);

  const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  updatedTask.done = updatedTask.done === 1;
  res.json(updatedTask);
});

app.delete('/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const info = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  if (info.changes === 0) {
    return res.status(404).json({ "error": `Task ${id} not found` });
  }
  res.status(204).send();
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
