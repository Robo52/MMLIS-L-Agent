import React, { useState, useEffect } from "react";
import { FONTS, BLUE, BLUE_LIGHT, BORDER, TEXT, TEXT_MUTED, RED, RED_LIGHT, GREEN, GREEN_LIGHT, AMBER, AMBER_LIGHT, uid } from "../tokens";
import { getStudents, getPapers, rankStudentsForTopic, createAssignment, updateAssignment, savePaper } from "../api";

const MIN_CAPACITY_DEFAULT = 10;

export default function MatchingEngine() {
  const [students, setStudents] = useState([]);
  const [pending, setPending] = useState([]);
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [minCapacity, setMinCapacity] = useState(MIN_CAPACITY_DEFAULT);
  const [loading, setLoading] = useState(true);
  const [overridePicks, setOverridePicks] = useState({});

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [studentRecords, paperRecords] = await Promise.all([getStudents(), getPapers()]);
      const pendingList = [];
      paperRecords.forEach((paper) => {
        (paper.candidates || []).forEach((topic, index) => {
          const matchedIdxs = paper.matchedCandidateIndexes || [];
          if (!matchedIdxs.includes(index)) pendingList.push({ paper, topic, index });
        });
      });
      setStudents(studentRecords);
      setPending(pendingList);
    } catch (e) {}
    setLoading(false);
  }

  async function runMatching() {
    if (pending.length === 0 || students.length === 0) return;
    setRunning(true);
    setProgress({ done: 0, total: pending.length });
    const newResults = [];

    for (const item of pending) {
      try {
        const matchData = await rankStudentsForTopic(item.topic, item.paper, students);
        const ranking = (matchData.ranking || []).sort((a, b) => b.score - a.score);

        let chosen = null;
        if (!matchData.noViableMatch) {
          chosen = ranking.find((r) => {
            const student = students.find((s) => s.id === r.studentId);
            return student && (student.capacityAvailable ?? 100) >= minCapacity;
          }) || ranking[0] || null;
        }

        let assignmentRecord = null;
        if (chosen) {
          assignmentRecord = {
            id: uid("assignment"), title: item.topic.title, studentId: chosen.studentId,
            notes: `Auto-matched by agent from "${item.paper.title}" (${item.paper.link}). ${chosen.reasoning}`,
            source: "agent", status: "active", assignedAt: new Date().toISOString(),
          };
          await createAssignment(assignmentRecord);
          await savePaper({ ...item.paper, matchedCandidateIndexes: [...(item.paper.matchedCandidateIndexes || []), item.index] });
        }

        newResults.push({ key: `${item.paper.id}:${item.index}`, paper: item.paper, topic: item.topic, ranking, chosen, assignmentRecord, noViableMatch: matchData.noViableMatch });
      } catch (e) {
        newResults.push({ key: `${item.paper.id}:${item.index}`, paper: item.paper, topic: item.topic, error: true });
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }

    setResults((prev) => [...newResults, ...prev]);
    setPending([]);
    setRunning(false);
    loadAll();
  }

  async function overrideAssignment(result, newStudentId) {
    if (!result.assignmentRecord || !newStudentId) return;
    try {
      await updateAssignment(result.assignmentRecord.id, { studentId: newStudentId, overriddenAt: new Date().toISOString() });
      setResults((prev) => prev.map((r) => (r.key === result.key ? { ...r, assignmentRecord: { ...r.assignmentRecord, studentId: newStudentId }, overridden: true } : r)));
    } catch (e) {}
  }

  const studentName = (id) => students.find((s) => s.id === id)?.name || "Unknown";
  const studentCapacity = (id) => students.find((s) => s.id === id)?.capacityAvailable ?? "—";

  return (
    <div style={{ background: "#FFFFFF", minHeight: "100%", padding: "36px 20px", fontFamily: FONTS.body }}>
      <div style={{ maxWidth: 840, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: BLUE, letterSpacing: "0.14em", marginBottom: 8 }}>MLIS-L · MATCHING AGENT</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: TEXT, margin: 0 }}>Auto-Assign Candidate Topics</h1>
          <p style={{ color: TEXT_MUTED, fontSize: 14, marginTop: 8, lineHeight: 1.6, maxWidth: 580 }}>
            Scores every pending candidate topic against each student's skills, interests, and remaining
            capacity, then assigns the best match automatically. Every decision is logged with its
            reasoning and can be overridden below.
          </p>
        </div>

        {loading && <div style={{ color: TEXT_MUTED, fontSize: 14 }}>Loading roster and candidate topics…</div>}

        {!loading && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "16px 20px", marginBottom: 24, flexWrap: "wrap", gap: 14 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{pending.length} candidate topic{pending.length !== 1 ? "s" : ""} awaiting match</div>
                <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>Sourced from Paper Scout runs · {students.length} students on roster</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <label style={{ fontSize: 12, color: TEXT_MUTED, whiteSpace: "nowrap" }}>Min. capacity to assign</label>
                <input type="number" min={0} max={100} value={minCapacity} onChange={(e) => setMinCapacity(Number(e.target.value))} style={{ width: 60, border: `1px solid ${BORDER}`, borderRadius: 6, padding: "6px 8px", fontFamily: FONTS.mono, fontSize: 12 }} />
                <span style={{ fontSize: 12, color: TEXT_MUTED }}>%</span>
                <button onClick={runMatching} disabled={running || pending.length === 0} style={{ padding: "10px 18px", borderRadius: 6, border: "none", background: pending.length === 0 ? BORDER : BLUE, color: "#FFFFFF", fontWeight: 700, fontSize: 13, cursor: pending.length === 0 ? "not-allowed" : "pointer" }}>
                  {running ? `Matching ${progress.done}/${progress.total}…` : "Run matching agent"}
                </button>
              </div>
            </div>

            {pending.length === 0 && results.length === 0 && (
              <div style={{ border: `1px dashed ${BORDER}`, borderRadius: 10, padding: 28, textAlign: "center", color: TEXT_MUTED, fontSize: 14 }}>
                No pending candidates. Run Paper Scout first.
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {results.map((result) => {
                const box = result.error ? { bg: RED_LIGHT, border: "#FCA5A5" } : (result.noViableMatch || !result.chosen) ? { bg: AMBER_LIGHT, border: "#FCD34D" } : { bg: GREEN_LIGHT, border: "#86EFAC" };
                return (
                  <div key={result.key} style={{ border: `1px solid ${box.border}`, background: box.bg, borderRadius: 10, padding: 20 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: TEXT, marginBottom: 2 }}>{result.topic.title}</div>
                    <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 12 }}>From <em>{result.paper.title}</em></div>

                    {result.error && <div style={{ fontSize: 13, color: RED }}>Matching failed for this topic — try running again.</div>}
                    {result.noViableMatch && <div style={{ fontSize: 13, color: AMBER }}>No student has a meaningful skill/interest overlap with this topic. Needs director review.</div>}
                    {!result.error && !result.noViableMatch && !result.chosen && <div style={{ fontSize: 13, color: AMBER }}>No student meets the {minCapacity}% capacity threshold. Needs director review.</div>}

                    {result.chosen && (
                      <>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: GREEN }}>Assigned → {studentName(result.assignmentRecord.studentId)}</span>
                          <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: TEXT_MUTED }}>score {result.chosen.score}/100 · {studentCapacity(result.assignmentRecord.studentId)}% capacity</span>
                          {result.overridden && <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: BLUE }}>OVERRIDDEN</span>}
                        </div>
                        <div style={{ fontSize: 13, color: TEXT, marginBottom: 12, lineHeight: 1.5 }}>{result.chosen.reasoning}</div>
                        <details style={{ marginBottom: 12 }}>
                          <summary style={{ fontSize: 12, color: TEXT_MUTED, cursor: "pointer" }}>Full ranking ({result.ranking.length} students)</summary>
                          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                            {result.ranking.map((r) => (
                              <div key={r.studentId} style={{ fontSize: 12, color: TEXT_MUTED, display: "flex", gap: 8 }}>
                                <span style={{ fontFamily: FONTS.mono, minWidth: 30 }}>{r.score}</span>
                                <span style={{ fontWeight: 600, color: TEXT, minWidth: 100 }}>{studentName(r.studentId)}</span>
                                <span>{r.reasoning}</span>
                              </div>
                            ))}
                          </div>
                        </details>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ fontSize: 12, color: TEXT_MUTED }}>Override:</span>
                          <select style={{ border: `1px solid ${BORDER}`, borderRadius: 6, padding: "6px 8px", fontSize: 12 }} value={overridePicks[result.key] || ""} onChange={(e) => { setOverridePicks((prev) => ({ ...prev, [result.key]: e.target.value })); overrideAssignment(result, e.target.value); }}>
                            <option value="">Reassign to…</option>
                            {students.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.capacityAvailable ?? 100}% open)</option>)}
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
