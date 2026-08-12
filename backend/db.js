import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, "data", "mlis-l.sqlite"));

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    role TEXT,
    advisor TEXT,
    interests TEXT,           -- JSON array
    skills TEXT,               -- JSON array of {name, level}
    current_projects TEXT,     -- JSON array of {title, commitmentPercent}
    capacity_available INTEGER,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS assignments (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    student_id TEXT NOT NULL,
    notes TEXT,
    source TEXT,                -- 'manual' | 'agent'
    status TEXT DEFAULT 'active',
    assigned_at TEXT,
    reassigned_at TEXT,
    overridden_at TEXT,
    FOREIGN KEY (student_id) REFERENCES students(id)
  );

  CREATE TABLE IF NOT EXISTS papers (
    id TEXT PRIMARY KEY,        -- arXiv id
    title TEXT,
    summary TEXT,
    published TEXT,
    authors TEXT,                -- JSON array
    link TEXT,
    subfield TEXT,
    candidates TEXT,              -- JSON array of {title, rationale}
    has_future_work INTEGER,
    matched_candidate_indexes TEXT, -- JSON array of ints
    analyzed_at TEXT
  );
`);

export default db;
