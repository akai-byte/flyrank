require('dotenv').config();
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./openapi.json');
const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

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

app.post('/auth/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Bad Request" });
  }
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  res.status(201).json(data.user);
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Bad Request" });
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return res.status(401).json({ error: "Invalid login credentials" });
  }
  res.status(200).json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
});

app.get('/public/info', (req, res) => {
  res.status(200).json({ "message": "Welcome stranger! This info is public." });
});

const authGuard = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ "error": "Access token required" });
  }
  const token = authHeader.split(' ')[1];
  
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ "error": "Invalid or expired token" });
  }
  req.user = data.user;
  req.token = token;
  next();
};

app.post('/auth/logout', authGuard, async (req, res) => {
  await supabase.auth.signOut();
  res.status(204).send();
});

app.get('/protected/profile', authGuard, (req, res) => {
  res.status(200).json({
    id: req.user.id,
    email: req.user.email,
    created_at: req.user.created_at
  });
});

app.get('/protected/dashboard', authGuard, (req, res) => {
  res.status(200).json({ "message": "Welcome to the secure dashboard!" });
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

app.listen(process.env.PORT || port, () => {
  console.log(`Server listening on port ${process.env.PORT || port}`);
  console.log('Server running and connected to Supabase');
});
