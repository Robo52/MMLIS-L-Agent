import React, { useState, useEffect } from "react";
import { FONTS, BLUE, BLUE_DARK, BLUE_LIGHT, BORDER, TEXT, TEXT_MUTED, GREEN, AMBER, PURPLE } from "../tokens";
import { getStudents, getAssignments } from "../api";

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) + " " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function sourceBadge(source) {
  if (source === "agent") return { label: "AGENT", color: PURPLE };
  return { label: "MANUAL", color: BLUE_DARK };
}

export default function AuditTrail() {
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [studentRecords, assignmentRecords] = await Promise.all([getStudents(), getAssignments()]);
      assignmentRecords.sort((a, b) => (b.overriddenAt || b.reassignedAt || b.assignedAt || "").localeCompare(a.overriddenAt || a.reassignedAt || a.assignedAt || ""));
      setStudents(studentRecords);
      setAssignments(assignmentRecords);
    } catch (e) {}
    setLoading(false);
  }

  const studentName = (id) => students.find((s) => s.id === id)?.name || "Unknown";

  const filtered = assignments.filter((a) => {
    if (filter === "agent") return a.source === "agent";
    if (filter === "manual") return a.source === "manual";
    if (filter === "overridden") return !!(a.overriddenAt || a.reassignedAt);
    if (filter === "completed") return a.status === "completed";
    return true;
  });

  const stats = {
    total: assignments.length,
    agent: assignments.filter((a) => a.source === "agent").length,
    manual: assignments.filter((a) => a.source === "manual").length,
    overridden: assignments.filter((a) => a.overriddenAt || a.reassignedAt).length,
    active: assignments.filter((a) => a.status === "active").length,
    completed: assignments.filter((a) => a.status === "completed").length,
  };

  return (
    <div style={{ background: "#FFFFFF", minHeight: "100%", padding: "36px 20px", fontFamily: FONTS.body }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: BLUE, letterSpacing: "0.14em", marginBottom: 8 }}>MLIS-L · AUDIT TRAIL</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: TEXT, margin: 0 }}>Assignment History</h1>
          <p style={{ color: TEXT_MUTED, fontSize: 14, marginTop: 8, lineHeight: 1.6, maxWidth: 580 }}>
            Every topic ever assigned in the lab, who or what assigned it, and whether the director
            stepped in to change it.
          </p>
        </div>

        {loading && <div style={{ color: TEXT_MUTED, fontSize: 14 }}>Loading history…</div>}

        {!loading && (
          <>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
              {[
                { label: "Total assignments", value: stats.total },
                { label: "Agent-sourced", value: stats.agent, color: PURPLE },
                { label: "Manual", value: stats.manual, color: BLUE_DARK },
                { label: "Director-overridden", value: stats.overridden, color: AMBER },
                { label: "Active", value: stats.active, color: GREEN },
                { label: "Completed", value: stats.completed },
              ].map((s) => (
                <div key={s.label} style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", flex: "1 1 130px" }}>
                  <div style={{ fontFamily: FONTS.mono, fontSize: 20, fontWeight: 700, color: s.color || TEXT }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 18 }}>
              <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ border: `1px solid ${BORDER}`, borderRadius: 6, padding: "8px 12px", fontSize: 13, color: TEXT }}>
                <option value="all">All assignments</option>
                <option value="agent">Agent-sourced only</option>
                <option value="manual">Manual only</option>
                <option value="overridden">Director-overridden only</option>
                <option value="completed">Completed only</option>
              </select>
            </div>

            {filtered.length === 0 && (
              <div style={{ border: `1px dashed ${BORDER}`, borderRadius: 10, padding: 28, textAlign: "center", color: TEXT_MUTED, fontSize: 14 }}>
                Nothing matches this filter yet.
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column" }}>
              {filtered.map((a, i) => {
                const badge = sourceBadge(a.source);
                const wasChanged = a.overriddenAt || a.reassignedAt;
                return (
                  <div key={a.id} style={{ display: "flex", gap: 16, padding: "16px 4px", borderTop: i > 0 ? `1px solid ${BORDER}` : "none" }}>
                    <div style={{ width: 130, flexShrink: 0, fontFamily: FONTS.mono, fontSize: 11, color: TEXT_MUTED, paddingTop: 2 }}>
                      {formatDate(a.overriddenAt || a.reassignedAt || a.assignedAt)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{a.title}</span>
                        <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: badge.color, border: `1px solid ${badge.color}`, borderRadius: 4, padding: "1px 6px" }}>{badge.label}</span>
                        <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: a.status === "active" ? GREEN : TEXT_MUTED }}>{a.status.toUpperCase()}</span>
                      </div>
                      <div style={{ fontSize: 13, color: TEXT_MUTED, marginBottom: wasChanged ? 4 : 0 }}>
                        Currently assigned to <strong style={{ color: TEXT }}>{studentName(a.studentId)}</strong>
                      </div>
                      {wasChanged && <div style={{ fontSize: 12, color: AMBER }}>Director changed this assignment on {formatDate(a.overriddenAt || a.reassignedAt)}</div>}
                      {a.notes && <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 6, lineHeight: 1.5 }}>{a.notes}</div>}
                    </div>
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
