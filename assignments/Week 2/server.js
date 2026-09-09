const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./openapi.json');
const app = express();
app.use(express.json());
const port = 3000;

let tasks = [
  { id: 1, title: 'Learn JS', done: true },
  { id: 2, title: 'Learn Node', done: false },
  { id: 3, title: 'Learn Express', done: false }
];

app.get('/', (req, res) => {
  res.json({ "name": "Task API", "version": "1.0", "endpoints": ["/tasks", "/docs"] });
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/health', (req, res) => {
  res.json({ "status": "ok" });
});

app.get('/tasks', (req, res) => {
  res.json(tasks);
});

app.get('/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const task = tasks.find(t => t.id === id);
  if (task) {
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
  const newId = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
  const newTask = {
    id: newId,
    title,
    done: false
  };
  tasks.push(newTask);
  res.status(201).json(newTask);
});

app.put('/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const taskIndex = tasks.findIndex(t => t.id === id);
  if (taskIndex === -1) {
    return res.status(404).json({ "error": `Task ${id} not found` });
  }
  
  const { title, done } = req.body;
  if (Object.keys(req.body).length === 0 || (title !== undefined && title.trim() === '')) {
    return res.status(400).json({ "error": "Bad Request: Invalid body or empty title" });
  }
  
  if (title !== undefined) tasks[taskIndex].title = title;
  if (done !== undefined) tasks[taskIndex].done = done;
  
  res.json(tasks[taskIndex]);
});

app.delete('/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const taskIndex = tasks.findIndex(t => t.id === id);
  if (taskIndex === -1) {
    return res.status(404).json({ "error": `Task ${id} not found` });
  }
  
  tasks.splice(taskIndex, 1);
  res.status(204).send();
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
