import { randomUUID } from "node:crypto";
import { query } from "./db.js";

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  const token = header.slice(7);
  // Demo authentication: token is the seeded user ID.
  const result = await query(
    "SELECT id, tenant_id, email FROM users WHERE id = $1",
    [token]
  );

  if (!result.rowCount) {
    return res.status(401).json({ error: "Invalid auth token" });
  }

  req.user = result.rows[0];
  next();
}

export function demoToken() {
  return "00000000-0000-0000-0000-000000000011";
}

export { randomUUID };
