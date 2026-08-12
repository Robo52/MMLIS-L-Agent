import { Router } from "express";
import db from "../db.js";

const router = Router();

function rowToAssignment(row) {
  return {
    id: row.id,
    title: row.title,
    studentId: row.student_id,
    notes: row.notes,
    source: row.source,
    status: row.status,
    assignedAt: row.assigned_at,
    reassignedAt: row.reassigned_at,
    overriddenAt: row.overridden_at,
  };
}

// GET /api/assignments
router.get("/", (req, res) => {
  const rows = db.prepare("SELECT * FROM assignments ORDER BY assigned_at DESC").all();
  res.json(rows.map(rowToAssignment));
});

// POST /api/assignments
router.post("/", (req, res) => {
  const a = req.body;
  if (!a.id || !a.title || !a.studentId) {
    return res.status(400).json({ error: "id, title, and studentId are required" });
  }

  db.prepare(`
    INSERT INTO assignments (id, title, student_id, notes, source, status, assigned_at)
    VALUES (@id, @title, @studentId, @notes, @source, @status, @assignedAt)
  `).run({
    id: a.id,
    title: a.title,
    studentId: a.studentId,
    notes: a.notes || "",
    source: a.source || "manual",
    status: a.status || "active",
    assignedAt: a.assignedAt || new Date().toISOString(),
  });

  const row = db.prepare("SELECT * FROM assignments WHERE id = ?").get(a.id);
  res.status(201).json(rowToAssignment(row));
});

// PATCH /api/assignments/:id  (reassign, change status, mark overridden)
router.patch("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM assignments WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "not found" });

  const updates = req.body;
  const merged = {
    studentId: updates.studentId ?? existing.student_id,
    status: updates.status ?? existing.status,
    notes: updates.notes ?? existing.notes,
    reassignedAt: updates.reassignedAt ?? existing.reassigned_at,
    overriddenAt: updates.overriddenAt ?? existing.overridden_at,
  };

  db.prepare(`
    UPDATE assignments SET student_id=@studentId, status=@status, notes=@notes,
      reassigned_at=@reassignedAt, overridden_at=@overriddenAt
    WHERE id=@id
  `).run({ id: req.params.id, ...merged });

  const row = db.prepare("SELECT * FROM assignments WHERE id = ?").get(req.params.id);
  res.json(rowToAssignment(row));
});

// DELETE /api/assignments/:id
router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM assignments WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

export default router;
