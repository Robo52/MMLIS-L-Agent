import React, { useState, useEffect } from "react";
import { FONTS, BLUE, BLUE_DARK, BLUE_LIGHT, BORDER, TEXT, TEXT_MUTED, RED, RED_LIGHT, GREEN, AMBER, inputStyle, uid } from "../tokens";
import { getStudents, getAssignments, createAssignment, updateAssignment, deleteAssignment } from "../api";

function capacityColor(pct) {
  if (pct < 15) return RED;
  if (pct < 35) return AMBER;
  return GREEN;
}

function MiniBar({ percent }) {
  const segments = 12;
  const filled = Math.round((percent / 100) * segments);
  const color = capacityColor(percent);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ display: "flex", gap: 2 }}>
        {Array.from({ length: segments }).map((_, i) => (
          <div key={i} style={{ width: 8, height: 12, borderRadius: 1, background: i < filled ? color : "#FFFFFF", border: `1px solid ${i < filled ? color : BORDER}` }} />
        ))}
      </div>
      <span style={{ fontFamily: FONTS.mono, fontSize: 11, fontWeight: 600, color }}>{percent}%</span>
    </div>
  );
}

export default function Dashboard() {
  const [view, setView] = useState("director");
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [newStudentId, setNewStudentId] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [studentRecords, assignmentRecords] = await Promise.all([getStudents(), getAssignments()]);
      studentRecords.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      assignmentRecords.sort((a, b) => (b.assignedAt || "").localeCompare(a.assignedAt || ""));
      setStudents(studentRecords);
      setAssignments(assignmentRecords);
      if (studentRecords.length > 0 && !selectedStudentId) setSelectedStudentId(studentRecords[0].id);
    } catch (e) {}
    setLoading(false);
  }

  const assignmentsFor = (studentId) => assignments.filter((a) => a.studentId === studentId);

  async function addAssignment() {
    if (!newTitle.trim() || !newStudentId) return;
    setSaving(true);
    const record = {
      id: uid("assignment"), title: newTitle.trim(), studentId: newStudentId, notes: newNotes.trim(),
      source: "manual", status: "active", assignedAt: new Date().toISOString(),
    };
    try {
      await createAssignment(record);
      setNewTitle(""); setNewNotes("");
      await loadAll();
    } catch (e) {}
    setSaving(false);
  }

  async function reassign(assignmentId, toStudentId) {
    try {
      await updateAssignment(assignmentId, { studentId: toStudentId, reassignedAt: new Date().toISOString() });
      await loadAll();
    } catch (e) {}
  }

  async function toggleStatus(assignmentId, current) {
    try {
      await updateAssignment(assignmentId, { status: current === "active" ? "completed" : "active" });
      await loadAll();
    } catch (e) {}
  }

  async function removeAssignment(assignmentId) {
    try {
      await deleteAssignment(assignmentId);
      await loadAll();
    } catch (e) {}
  }

  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const overloaded = students.filter((s) => (s.capacityAvailable ?? 100) < 15);

  return (
    <div style={{ background: "#FFFFFF", minHeight: "100%", padding: "36px 20px", fontFamily: FONTS.body }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: BLUE, letterSpacing: "0.14em", marginBottom: 8 }}>MLIS-L · LAB DASHBOARD</div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: TEXT, margin: 0 }}>Assignments &amp; Workload</h1>
          </div>
          <div style={{ display: "flex", border: `1px solid ${BORDER}`, borderRadius: 8, overflow: "hidden" }}>
            {["director", "student"].map((v) => (
              <button key={v} onClick={() => setView(v)} style={{ padding: "9px 16px", border: "none", background: view === v ? BLUE : "#FFFFFF", color: view === v ? "#FFFFFF" : TEXT_MUTED, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                {v === "director" ? "Director view" : "Student view"}
              </button>
            ))}
          </div>
        </div>

        {loading && <div style={{ color: TEXT_MUTED, fontSize: 14 }}>Loading lab records…</div>}

        {!loading && students.length === 0 && (
          <div style={{ border: `1px dashed ${BORDER}`, borderRadius: 10, padding: 28, textAlign: "center", color: TEXT_MUTED, fontSize: 14 }}>
            No students on the roster yet. Have students fill out the intake form first.
          </div>
        )}

        {!loading && students.length > 0 && view === "director" && (
          <>
            {overloaded.length > 0 && (
              <div style={{ background: RED_LIGHT, border: "1px solid #FCA5A5", borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#991B1B" }}>
                <strong>{overloaded.length} student{overloaded.length > 1 ? "s" : ""}</strong> at or near capacity: {overloaded.map((s) => s.name).join(", ")}. Consider before assigning new work.
              </div>
            )}

            <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden", marginBottom: 28 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1.6fr 2fr", background: BLUE_LIGHT, padding: "10px 16px", fontSize: 11, fontWeight: 700, color: BLUE_DARK, textTransform: "uppercase" }}>
                <div>Student</div><div>Capacity</div><div>Interests</div><div>Assigned Topics</div>
              </div>
              {students.map((s) => {
                const studentAssignments = assignmentsFor(s.id).filter((a) => a.status !== "removed");
                return (
                  <div key={s.id} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1.6fr 2fr", padding: "14px 16px", borderTop: `1px solid ${BORDER}`, fontSize: 13, alignItems: "start" }}>
                    <div>
                      <div style={{ fontWeight: 600, color: TEXT }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>{s.role}</div>
                      {s.advisor && <div style={{ fontSize: 11, color: TEXT_MUTED }}>Advisor: {s.advisor}</div>}
                    </div>
                    <div><MiniBar percent={s.capacityAvailable ?? 100} /></div>
                    <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.6 }}>
                      {(s.interests || []).slice(0, 3).join(", ") || "—"}
                      {(s.interests || []).length > 3 && ` +${s.interests.length - 3}`}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {studentAssignments.length === 0 && <span style={{ color: TEXT_MUTED, fontSize: 12 }}>None assigned</span>}
                      {studentAssignments.map((a) => (
                        <div key={a.id} style={{ border: `1px solid ${BORDER}`, borderRadius: 6, padding: "6px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                            <span style={{ fontWeight: 500, color: TEXT }}>{a.title}</span>
                            <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: a.status === "active" ? GREEN : TEXT_MUTED }}>{a.status.toUpperCase()}</span>
                          </div>
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <select value={a.studentId} onChange={(e) => reassign(a.id, e.target.value)} style={{ ...inputStyle, padding: "3px 6px", fontSize: 11, flex: 1 }}>
                              {students.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
                            </select>
                            <button onClick={() => toggleStatus(a.id, a.status)} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 4, color: TEXT_MUTED, fontSize: 10, padding: "3px 6px", cursor: "pointer" }}>
                              {a.status === "active" ? "Mark done" : "Reopen"}
                            </button>
                            <button onClick={() => removeAssignment(a.id)} style={{ background: "none", border: "none", color: RED, fontSize: 14, cursor: "pointer" }}>×</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: 22 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: BLUE_DARK, marginBottom: 4 }}>Assign a topic manually</div>
              <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 16 }}>Suggestions from the matching agent appear here too.</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div style={{ flex: "2 1 220px" }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: BLUE_DARK, marginBottom: 6 }}>Topic title</label>
                  <input style={inputStyle} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Sparse attention for long-context retrieval" />
                </div>
                <div style={{ flex: "1 1 160px" }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: BLUE_DARK, marginBottom: 6 }}>Assign to</label>
                  <select style={inputStyle} value={newStudentId} onChange={(e) => setNewStudentId(e.target.value)}>
                    <option value="">Select student…</option>
                    {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div style={{ flex: "2 1 220px" }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: BLUE_DARK, marginBottom: 6 }}>Notes (optional)</label>
                  <input style={inputStyle} value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Source paper, rationale, etc." />
                </div>
                <button onClick={addAssignment} disabled={saving || !newTitle.trim() || !newStudentId} style={{ padding: "10px 18px", borderRadius: 6, border: "none", background: !newTitle.trim() || !newStudentId ? BORDER : BLUE, color: "#FFFFFF", fontWeight: 700, fontSize: 13, cursor: !newTitle.trim() || !newStudentId ? "not-allowed" : "pointer", height: 38 }}>
                  {saving ? "Assigning…" : "Assign"}
                </button>
              </div>
            </div>
          </>
        )}

        {!loading && students.length > 0 && view === "student" && (
          <>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: BLUE_DARK, marginBottom: 8 }}>Viewing as</label>
              <select style={{ ...inputStyle, maxWidth: 280 }} value={selectedStudentId || ""} onChange={(e) => setSelectedStudentId(e.target.value)}>
                {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            {selectedStudent && (
              <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: TEXT }}>{selectedStudent.name}</div>
                    <div style={{ fontSize: 13, color: TEXT_MUTED, marginTop: 2 }}>{selectedStudent.role} {selectedStudent.advisor ? `· Advisor: ${selectedStudent.advisor}` : ""}</div>
                  </div>
                  <MiniBar percent={selectedStudent.capacityAvailable ?? 100} />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: BLUE_DARK, textTransform: "uppercase", marginBottom: 8 }}>Assigned Topics</div>
                  {assignmentsFor(selectedStudent.id).length === 0 && <div style={{ fontSize: 13, color: TEXT_MUTED }}>No topics assigned yet.</div>}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {assignmentsFor(selectedStudent.id).map((a) => (
                      <div key={a.id} style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                          <span style={{ fontWeight: 600, fontSize: 14, color: TEXT }}>{a.title}</span>
                          <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: a.status === "active" ? GREEN : TEXT_MUTED }}>{a.status.toUpperCase()}</span>
                        </div>
                        {a.notes && <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 4 }}>{a.notes}</div>}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: BLUE_DARK, textTransform: "uppercase", marginBottom: 8 }}>Current Projects</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {(selectedStudent.currentProjects || []).length === 0 && <div style={{ fontSize: 13, color: TEXT_MUTED }}>No active projects on file.</div>}
                    {(selectedStudent.currentProjects || []).map((p, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: i < selectedStudent.currentProjects.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                        <span style={{ color: TEXT }}>{p.title}</span>
                        <span style={{ fontFamily: FONTS.mono, color: TEXT_MUTED }}>{p.commitmentPercent}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
