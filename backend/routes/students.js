import { Router } from "express";
import db from "../db.js";

const router = Router();

function rowToStudent(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    advisor: row.advisor,
    interests: JSON.parse(row.interests || "[]"),
    skills: JSON.parse(row.skills || "[]"),
    currentProjects: JSON.parse(row.current_projects || "[]"),
    capacityAvailable: row.capacity_available,
    updatedAt: row.updated_at,
  };
}

// GET /api/students
router.get("/", (req, res) => {
  const rows = db.prepare("SELECT * FROM students ORDER BY name").all();
  res.json(rows.map(rowToStudent));
});

// POST /api/students  (upsert by id)
router.post("/", (req, res) => {
  const s = req.body;
  if (!s.id || !s.name) return res.status(400).json({ error: "id and name are required" });

  db.prepare(`
    INSERT INTO students (id, name, email, role, advisor, interests, skills, current_projects, capacity_available, updated_at)
    VALUES (@id, @name, @email, @role, @advisor, @interests, @skills, @currentProjects, @capacityAvailable, @updatedAt)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name, email=excluded.email, role=excluded.role, advisor=excluded.advisor,
      interests=excluded.interests, skills=excluded.skills, current_projects=excluded.current_projects,
      capacity_available=excluded.capacity_available, updated_at=excluded.updated_at
  `).run({
    id: s.id,
    name: s.name,
    email: s.email || "",
    role: s.role || "",
    advisor: s.advisor || "",
    interests: JSON.stringify(s.interests || []),
    skills: JSON.stringify(s.skills || []),
    currentProjects: JSON.stringify(s.currentProjects || []),
    capacityAvailable: s.capacityAvailable ?? 100,
    updatedAt: s.updatedAt || new Date().toISOString(),
  });

  const row = db.prepare("SELECT * FROM students WHERE id = ?").get(s.id);
  res.json(rowToStudent(row));
});

export default router;
