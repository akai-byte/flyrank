import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { randomUUID } from "node:crypto";
import { query } from "./db.js";
import { requireAuth, demoToken } from "./auth.js";
import { widgetSchema, submissionSchema } from "./validation.js";
import { enrichIp } from "./geo.js";
import { notifySubmission } from "./side-effect.js";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5500")
  .split(",").map(s => s.trim()).filter(Boolean);

app.use(express.json({ limit: "16kb" }));

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin not allowed"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));

const publicLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
  limit: Number(process.env.RATE_LIMIT_MAX || 20),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}:${req.body?.widget_id || "no-widget"}`,
  message: { error: "Too many requests; try again later." }
});

app.get("/health", (_, res) => res.json({ ok: true }));
app.get("/demo-token", (_, res) => res.json({ token: demoToken() }));

// Widget CRUD: authenticated + tenant isolated.
app.get("/api/widgets", requireAuth, async (req, res) => {
  const result = await query(
    "SELECT * FROM widgets WHERE tenant_id = $1 ORDER BY created_at DESC",
    [req.user.tenant_id]
  );
  res.json({ widgets: result.rows });
});

app.post("/api/widgets", requireAuth, async (req, res) => {
  const parsed = widgetSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid widget", details: parsed.error.flatten() });

  const id = randomUUID();
  const w = parsed.data;
  await query(
    `INSERT INTO widgets (id, tenant_id, type, title, description, fields, button_text, display_options)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [id, req.user.tenant_id, w.type, w.title, w.description, JSON.stringify(w.fields), w.button_text, JSON.stringify(w.display_options)]
  );
  res.status(201).json({ id, embed_snippet: `<script src="http://localhost:${PORT}/widget.v1.js?id=${id}"></script>` });
});

app.get("/api/widgets/:id", requireAuth, async (req, res) => {
  const result = await query("SELECT * FROM widgets WHERE id=$1 AND tenant_id=$2", [req.params.id, req.user.tenant_id]);
  if (!result.rowCount) return res.status(404).json({ error: "Widget not found" });
  res.json(result.rows[0]);
});

app.put("/api/widgets/:id", requireAuth, async (req, res) => {
  const parsed = widgetSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid widget", details: parsed.error.flatten() });
  const w = parsed.data;
  const result = await query(
    `UPDATE widgets SET type=$1,title=$2,description=$3,fields=$4,button_text=$5,
     display_options=$6,version=version+1,updated_at=now()
     WHERE id=$7 AND tenant_id=$8 RETURNING *`,
    [w.type,w.title,w.description,JSON.stringify(w.fields),w.button_text,JSON.stringify(w.display_options),req.params.id,req.user.tenant_id]
  );
  if (!result.rowCount) return res.status(404).json({ error: "Widget not found" });
  res.json(result.rows[0]);
});

app.delete("/api/widgets/:id", requireAuth, async (req, res) => {
  const result = await query("DELETE FROM widgets WHERE id=$1 AND tenant_id=$2 RETURNING id", [req.params.id, req.user.tenant_id]);
  if (!result.rowCount) return res.status(404).json({ error: "Widget not found" });
  res.status(204).end();
});

// Public, cached configuration.
app.get("/api/widgets/:id/config", async (req, res) => {
  const result = await query(
    "SELECT id,type,title,description,fields,button_text,display_options,version FROM widgets WHERE id=$1",
    [req.params.id]
  );
  if (!result.rowCount) return res.status(404).json({ error: "Widget not found" });

  res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  res.set("Access-Control-Allow-Origin", "*");
  res.json(result.rows[0]);
});

// Versioned bundle.
app.get("/widget.v1.js", (req, res) => {
  res.set("Cache-Control", "public, max-age=31536000, immutable");
  res.type("application/javascript").sendFile("widget.v1.js", { root: "public" });
});

// Public submission path.
app.options("/api/submissions", cors(corsOptions));

app.post("/api/submissions", publicLimiter, async (req, res) => {
  const parsed = submissionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid submission", details: parsed.error.flatten() });

  const { widget_id, data, honeypot } = parsed.data;
  if (honeypot) return res.status(204).end();

  const widget = await query("SELECT id, tenant_id, fields FROM widgets WHERE id=$1", [widget_id]);
  if (!widget.rowCount) return res.status(404).json({ error: "Widget not found" });

  const fields = widget.rows[0].fields || [];
  for (const field of fields) {
    if (field.required && (data[field.name] === undefined || data[field.name] === "")) {
      return res.status(400).json({ error: `Missing required field: ${field.name}` });
    }
  }

  const ip = req.ip;
  const geo = await enrichIp(ip);

  const id = randomUUID();
  await query(
    `INSERT INTO submissions (id,widget_id,tenant_id,payload,ip,country,city)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [id,widget_id,widget.rows[0].tenant_id,JSON.stringify(data),ip,geo.country,geo.city]
  );

  // Non-critical side effect: failure is logged, not returned as API failure.
  try {
    await notifySubmission({ id, widget_id });
  } catch (error) {
    console.error("[SIDE_EFFECT_FAILED]", error.message);
  }

  res.status(201).json({ ok: true, id, geo: { provider: geo.provider, country: geo.country, city: geo.city } });
});

// Dashboard.
app.get("/api/dashboard/submissions", requireAuth, async (req, res) => {
  const result = await query(
    `SELECT id,widget_id,payload,country,city,created_at
     FROM submissions WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 100`,
    [req.user.tenant_id]
  );
  res.json({ submissions: result.rows });
});

app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
  const total = await query("SELECT count(*)::int AS count FROM submissions WHERE tenant_id=$1", [req.user.tenant_id]);
  const byWidget = await query(
    `SELECT widget_id,count(*)::int AS count FROM submissions
     WHERE tenant_id=$1 GROUP BY widget_id ORDER BY count DESC`,
    [req.user.tenant_id]
  );
  const byGeo = await query(
    `SELECT country,count(*)::int AS count FROM submissions
     WHERE tenant_id=$1 GROUP BY country ORDER BY count DESC`,
    [req.user.tenant_id]
  );
  res.json({ total: total.rows[0].count, by_widget: byWidget.rows, by_country: byGeo.rows });
});

app.use((err, req, res, next) => {
  if (err.message === "Origin not allowed") return res.status(403).json({ error: "CORS origin not allowed" });
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Widget platform API running on http://localhost:${PORT}`);
  console.log(`Demo owner token: ${demoToken()}`);
});
