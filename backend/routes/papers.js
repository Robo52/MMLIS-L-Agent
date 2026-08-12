import { Router } from "express";
import db from "../db.js";

const router = Router();

function rowToPaper(row) {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    published: row.published,
    authors: JSON.parse(row.authors || "[]"),
    link: row.link,
    subfield: row.subfield,
    candidates: JSON.parse(row.candidates || "[]"),
    hasFutureWork: !!row.has_future_work,
    matchedCandidateIndexes: JSON.parse(row.matched_candidate_indexes || "[]"),
    analyzedAt: row.analyzed_at,
  };
}

// GET /api/papers
router.get("/", (req, res) => {
  const rows = db.prepare("SELECT * FROM papers ORDER BY published DESC").all();
  res.json(rows.map(rowToPaper));
});

// POST /api/papers  (upsert by id — used both after analysis and after matching updates matchedCandidateIndexes)
router.post("/", (req, res) => {
  const p = req.body;
  if (!p.id || !p.title) return res.status(400).json({ error: "id and title are required" });

  db.prepare(`
    INSERT INTO papers (id, title, summary, published, authors, link, subfield, candidates, has_future_work, matched_candidate_indexes, analyzed_at)
    VALUES (@id, @title, @summary, @published, @authors, @link, @subfield, @candidates, @hasFutureWork, @matchedCandidateIndexes, @analyzedAt)
    ON CONFLICT(id) DO UPDATE SET
      title=excluded.title, summary=excluded.summary, published=excluded.published, authors=excluded.authors,
      link=excluded.link, subfield=excluded.subfield, candidates=excluded.candidates,
      has_future_work=excluded.has_future_work, matched_candidate_indexes=excluded.matched_candidate_indexes,
      analyzed_at=excluded.analyzed_at
  `).run({
    id: p.id,
    title: p.title,
    summary: p.summary || "",
    published: p.published || "",
    authors: JSON.stringify(p.authors || []),
    link: p.link || "",
    subfield: p.subfield || "",
    candidates: JSON.stringify(p.candidates || []),
    hasFutureWork: p.hasFutureWork ? 1 : 0,
    matchedCandidateIndexes: JSON.stringify(p.matchedCandidateIndexes || []),
    analyzedAt: p.analyzedAt || null,
  });

  const row = db.prepare("SELECT * FROM papers WHERE id = ?").get(p.id);
  res.json(rowToPaper(row));
});

export default router;
