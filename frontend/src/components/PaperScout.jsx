import React, { useState, useEffect } from "react";
import { FONTS, BLUE, BLUE_DARK, BLUE_LIGHT, BORDER, TEXT, TEXT_MUTED, RED, GREEN, inputStyle, uid } from "../tokens";
import { getStudents, fetchArxivPapers, analyzePaperForTopics, savePaper, createAssignment } from "../api";

const SUBFIELDS = [
  "NLP / LLMs", "Computer Vision", "Reinforcement Learning", "Robotics",
  "Graph ML", "ML Theory", "Systems / MLOps", "Optimization",
  "Causal Inference", "Time Series", "Generative Models", "Fairness / Interpretability",
];

export default function PaperScout() {
  const [subfield, setSubfield] = useState("NLP / LLMs");
  const [papers, setPapers] = useState([]);
  const [fetchStatus, setFetchStatus] = useState("idle");
  const [analyzing, setAnalyzing] = useState({});
  const [students, setStudents] = useState([]);
  const [assignPicks, setAssignPicks] = useState({});
  const [assignedKeys, setAssignedKeys] = useState({});

  useEffect(() => { loadStudents(); }, []);

  async function loadStudents() {
    try {
      const records = await getStudents();
      records.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setStudents(records);
    } catch (e) {}
  }

  async function handleFetch() {
    setFetchStatus("loading");
    setPapers([]);
    try {
      const results = await fetchArxivPapers(subfield);
      setPapers(results.map((p) => ({ ...p, candidates: null, hasFutureWork: null })));
      setFetchStatus("idle");
    } catch (e) {
      setFetchStatus("error");
    }
  }

  async function handleAnalyze(paper) {
    setAnalyzing((prev) => ({ ...prev, [paper.id]: true }));
    try {
      const result = await analyzePaperForTopics(paper);
      setPapers((prev) => prev.map((p) => (p.id === paper.id ? { ...p, candidates: result.topics || [], hasFutureWork: result.hasFutureWork } : p)));
      await savePaper({ ...paper, candidates: result.topics || [], hasFutureWork: result.hasFutureWork, analyzedAt: new Date().toISOString() });
    } catch (e) {
      setPapers((prev) => prev.map((p) => (p.id === paper.id ? { ...p, candidates: [], hasFutureWork: false, analyzeError: true } : p)));
    }
    setAnalyzing((prev) => ({ ...prev, [paper.id]: false }));
  }

  async function handleAssign(paper, topic, topicKey) {
    const studentId = assignPicks[topicKey];
    if (!studentId) return;
    const record = {
      id: uid("assignment"), title: topic.title, studentId,
      notes: `From arXiv paper "${paper.title}" (${paper.link}). ${topic.rationale}`,
      source: "agent", status: "active", assignedAt: new Date().toISOString(),
    };
    try {
      await createAssignment(record);
      setAssignedKeys((prev) => ({ ...prev, [topicKey]: true }));
    } catch (e) {}
  }

  return (
    <div style={{ background: "#FFFFFF", minHeight: "100%", padding: "36px 20px", fontFamily: FONTS.body }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: BLUE, letterSpacing: "0.14em", marginBottom: 8 }}>MLIS-L · PAPER SCOUT</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: TEXT, margin: 0 }}>Future-Work Topic Finder</h1>
          <p style={{ color: TEXT_MUTED, fontSize: 14, marginTop: 8, lineHeight: 1.6, maxWidth: 560 }}>
            Pulls recent arXiv papers for a subfield, then asks the matching agent to identify candidate
            research topics from each abstract.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 240px" }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: BLUE_DARK, marginBottom: 6 }}>Subfield</label>
            <select style={inputStyle} value={subfield} onChange={(e) => setSubfield(e.target.value)}>
              {SUBFIELDS.map((sf) => <option key={sf} value={sf}>{sf}</option>)}
            </select>
          </div>
          <button onClick={handleFetch} disabled={fetchStatus === "loading"} style={{ padding: "10px 18px", borderRadius: 6, border: "none", background: BLUE, color: "#FFFFFF", fontWeight: 700, fontSize: 13, cursor: "pointer", height: 38 }}>
            {fetchStatus === "loading" ? "Fetching…" : "Fetch recent papers"}
          </button>
        </div>

        {fetchStatus === "error" && <div style={{ color: RED, fontSize: 13, marginBottom: 20 }}>Couldn't reach the backend's arXiv endpoint. Check the API is running.</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {papers.map((paper) => (
            <div key={paper.id} style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: TEXT, marginBottom: 4 }}>{paper.title}</div>
              <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 10 }}>
                {paper.authors.slice(0, 3).join(", ")}{paper.authors.length > 3 ? " et al." : ""} · {paper.published}
                {" · "}<a href={paper.link} target="_blank" rel="noreferrer" style={{ color: BLUE }}>arXiv</a>
              </div>
              <div style={{ fontSize: 13, color: TEXT, lineHeight: 1.6, marginBottom: 14 }}>
                {paper.summary.length > 320 ? paper.summary.slice(0, 320) + "…" : paper.summary}
              </div>

              {paper.candidates === null && (
                <button onClick={() => handleAnalyze(paper)} disabled={analyzing[paper.id]} style={{ padding: "8px 14px", borderRadius: 6, border: `1px solid ${BLUE}`, background: "#FFFFFF", color: BLUE, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                  {analyzing[paper.id] ? "Analyzing…" : "Extract candidate topics"}
                </button>
              )}

              {paper.candidates !== null && paper.candidates.length === 0 && (
                <div style={{ fontSize: 12, color: TEXT_MUTED, fontStyle: "italic" }}>No clear future-work signal found in this abstract.</div>
              )}

              {paper.candidates !== null && paper.candidates.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {paper.candidates.map((topic, i) => {
                    const topicKey = `${paper.id}:${i}`;
                    const assigned = assignedKeys[topicKey];
                    return (
                      <div key={topicKey} style={{ background: BLUE_LIGHT, borderRadius: 8, padding: "12px 14px" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{topic.title}</div>
                        <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 4, marginBottom: 10 }}>{topic.rationale}</div>
                        {assigned ? (
                          <div style={{ fontSize: 12, color: GREEN, fontWeight: 600 }}>Assigned ✓</div>
                        ) : (
                          <div style={{ display: "flex", gap: 8 }}>
                            <select style={{ ...inputStyle, flex: 1, background: "#FFFFFF" }} value={assignPicks[topicKey] || ""} onChange={(e) => setAssignPicks((prev) => ({ ...prev, [topicKey]: e.target.value }))}>
                              <option value="">Assign to…</option>
                              {students.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.capacityAvailable ?? 100}% open)</option>)}
                            </select>
                            <button onClick={() => handleAssign(paper, topic, topicKey)} disabled={!assignPicks[topicKey]} style={{ padding: "0 14px", borderRadius: 6, border: "none", background: assignPicks[topicKey] ? BLUE : BORDER, color: "#FFFFFF", fontWeight: 700, fontSize: 12, cursor: assignPicks[topicKey] ? "pointer" : "not-allowed" }}>
                              Assign
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {papers.length === 0 && fetchStatus === "idle" && (
          <div style={{ border: `1px dashed ${BORDER}`, borderRadius: 10, padding: 28, textAlign: "center", color: TEXT_MUTED, fontSize: 14 }}>
            Choose a subfield and fetch recent papers to get started.
          </div>
        )}
      </div>
    </div>
  );
}
