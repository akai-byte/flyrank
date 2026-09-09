const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./openapi.json');
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL
});
client.connect();

// Create table and seed
client.query(`
  CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    done BOOLEAN NOT NULL
  )
`).then(() => {
  client.query('SELECT COUNT(*) AS c FROM tasks').then(res => {
    if (parseInt(res.rows[0].c) === 0) {
      client.query('INSERT INTO tasks (title, done) VALUES ($1, $2), ($3, $4), ($5, $6)', ['Learn JS', true, 'Learn Node', false, 'Learn Express', false]);
    }
  });
});

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

app.get('/tasks', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM tasks');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/tasks/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const result = await client.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ "error": `Task ${id} not found` });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/tasks', async (req, res) => {
  const { title } = req.body;
  if (!title || title.trim() === '') {
    return res.status(400).json({ "error": "Bad Request: title is missing or empty" });
  }
  try {
    const result = await client.query('INSERT INTO tasks (title, done) VALUES ($1, $2) RETURNING *', [title, false]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/tasks/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const taskRes = await client.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (taskRes.rows.length === 0) {
      return res.status(404).json({ "error": `Task ${id} not found` });
    }
    
    const { title, done } = req.body;
    if (Object.keys(req.body).length === 0 || (title !== undefined && title.trim() === '')) {
      return res.status(400).json({ "error": "Bad Request: Invalid body or empty title" });
    }
    
    const newTitle = title !== undefined ? title : taskRes.rows[0].title;
    const newDone = done !== undefined ? done : taskRes.rows[0].done;
    
    const updateRes = await client.query('UPDATE tasks SET title = $1, done = $2 WHERE id = $3 RETURNING *', [newTitle, newDone, id]);
    res.json(updateRes.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/tasks/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const result = await client.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ "error": `Task ${id} not found` });
    }
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
