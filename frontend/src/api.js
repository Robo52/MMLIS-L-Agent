// All requests go through our own backend. The backend holds the Anthropic
// API key server-side and proxies arXiv, so no secrets ever ship to the browser.

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${options.method || "GET"} ${path} failed: ${res.status} ${body}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// --- Students ---
export const getStudents = () => request("/api/students");
export const saveStudent = (student) =>
  request("/api/students", { method: "POST", body: JSON.stringify(student) });

// --- Assignments ---
export const getAssignments = () => request("/api/assignments");
export const createAssignment = (assignment) =>
  request("/api/assignments", { method: "POST", body: JSON.stringify(assignment) });
export const updateAssignment = (id, fields) =>
  request(`/api/assignments/${id}`, { method: "PATCH", body: JSON.stringify(fields) });
export const deleteAssignment = (id) =>
  request(`/api/assignments/${id}`, { method: "DELETE" });

// --- Papers ---
export const getPapers = () => request("/api/papers");
export const savePaper = (paper) =>
  request("/api/papers", { method: "POST", body: JSON.stringify(paper) });
export const fetchArxivPapers = (subfield) =>
  request(`/api/arxiv?subfield=${encodeURIComponent(subfield)}`);

// --- Agent (proxied Claude calls) ---
export const analyzePaperForTopics = (paper) =>
  request("/api/agent/analyze-paper", { method: "POST", body: JSON.stringify({ paper }) });
export const rankStudentsForTopic = (topic, paper, students) =>
  request("/api/agent/match-topic", {
    method: "POST",
    body: JSON.stringify({ topic, paper, students }),
  });
