import React, { useState, useEffect, useRef } from "react";
import { FONTS, BLUE, BLUE_DARK, BLUE_LIGHT, BORDER, TEXT, TEXT_MUTED, RED, GREEN, inputStyle, uid } from "../tokens";
import { getStudents, saveStudent } from "../api";

const SUBFIELDS = [
  "NLP / LLMs", "Computer Vision", "Reinforcement Learning", "Robotics",
  "Graph ML", "ML Theory", "Systems / MLOps", "Optimization",
  "Causal Inference", "Time Series", "Generative Models", "Fairness / Interpretability",
];

const ROLES = ["MS Student", "PhD Student"];

function ProgressBar({ percent }) {
  const segments = 20;
  const filled = Math.round((percent / 100) * segments);
  const warn = percent < 15;
  return (
    <div>
      <div style={{ display: "flex", gap: 3 }}>
        {Array.from({ length: segments }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 14, borderRadius: 2, background: i < filled ? BLUE : "#FFFFFF", border: `1px solid ${i < filled ? BLUE : BORDER}` }} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: TEXT_MUTED, letterSpacing: "0.04em" }}>COMMITTED</span>
        <span style={{ fontFamily: FONTS.mono, fontSize: 12, fontWeight: 600, color: warn ? RED : BLUE_DARK }}>{percent}% OPEN</span>
      </div>
    </div>
  );
}

function Chip({ label, active, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{ fontFamily: FONTS.body, fontSize: 13, padding: "7px 12px", borderRadius: 6, border: `1px solid ${BLUE}`, background: active ? BLUE : "#FFFFFF", color: active ? "#FFFFFF" : BLUE, cursor: "pointer" }}>
      {label}
    </button>
  );
}

function Field({ label, children, hint }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <label style={{ display: "block", fontFamily: FONTS.body, fontSize: 13, fontWeight: 700, color: BLUE_DARK, marginBottom: 8 }}>{label}</label>
      {children}
      {hint && <div style={{ fontFamily: FONTS.body, fontSize: 12, color: TEXT_MUTED, marginTop: 6, lineHeight: 1.5 }}>{hint}</div>}
    </div>
  );
}

export default function IntakeForm() {
  const [studentId, setStudentId] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("MS Student");
  const [advisor, setAdvisor] = useState("");
  const [interests, setInterests] = useState([]);
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState([]);
  const [projects, setProjects] = useState([{ title: "", commitmentPercent: 20 }]);
  const [status, setStatus] = useState("idle");
  const [existingStudents, setExistingStudents] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const errorTimeout = useRef(null);

  const totalCommitment = projects.reduce((sum, p) => sum + (Number(p.commitmentPercent) || 0), 0);
  const capacityAvailable = Math.max(0, 100 - totalCommitment);

  useEffect(() => { loadStudentList(); }, []);

  async function loadStudentList() {
    setLoadingList(true);
    try {
      const records = await getStudents();
      records.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
      setExistingStudents(records);
    } catch (e) {
      setExistingStudents([]);
    }
    setLoadingList(false);
  }

  function toggleInterest(subfield) {
    setInterests((prev) => (prev.includes(subfield) ? prev.filter((s) => s !== subfield) : [...prev, subfield]));
  }

  function addSkill() {
    const trimmed = skillInput.trim();
    if (!trimmed) return;
    if (skills.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) { setSkillInput(""); return; }
    setSkills((prev) => [...prev, { name: trimmed, level: "Proficient" }]);
    setSkillInput("");
  }

  const setSkillLevel = (name, level) => setSkills((prev) => prev.map((s) => (s.name === name ? { ...s, level } : s)));
  const removeSkill = (name) => setSkills((prev) => prev.filter((s) => s.name !== name));
  const updateProject = (index, field, value) => setProjects((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  const addProjectRow = () => setProjects((prev) => [...prev, { title: "", commitmentPercent: 10 }]);
  const removeProjectRow = (index) => setProjects((prev) => prev.filter((_, i) => i !== index));

  function loadExisting(record) {
    setStudentId(record.id);
    setName(record.name || "");
    setEmail(record.email || "");
    setRole(record.role || "MS Student");
    setAdvisor(record.advisor || "");
    setInterests(record.interests || []);
    setSkills(record.skills || []);
    setProjects(record.currentProjects?.length ? record.currentProjects : [{ title: "", commitmentPercent: 20 }]);
    setStatus("idle");
  }

  function resetForm() {
    setStudentId(null); setName(""); setEmail(""); setRole("MS Student"); setAdvisor("");
    setInterests([]); setSkills([]); setProjects([{ title: "", commitmentPercent: 20 }]); setStatus("idle");
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!name.trim()) {
      setStatus("error");
      if (errorTimeout.current) clearTimeout(errorTimeout.current);
      errorTimeout.current = setTimeout(() => setStatus("idle"), 2500);
      return;
    }
    setStatus("saving");
    const id = studentId || uid("s");
    const record = {
      id, name: name.trim(), email: email.trim(), role, advisor: advisor.trim(),
      interests, skills, currentProjects: projects.filter((p) => p.title.trim()),
      capacityAvailable, updatedAt: new Date().toISOString(),
    };
    try {
      await saveStudent(record);
      setStudentId(id);
      setStatus("saved");
      await loadStudentList();
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      setStatus("error");
    }
  }

  return (
    <div style={{ background: "#FFFFFF", minHeight: "100%", padding: "36px 20px", fontFamily: FONTS.body }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: BLUE, letterSpacing: "0.14em", marginBottom: 8 }}>MLIS-L · RESEARCHER PROFILE</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: TEXT, margin: 0 }}>Machine Learning &amp; Intelligent Systems Lab</h1>
          <p style={{ color: TEXT_MUTED, fontSize: 14, marginTop: 8, lineHeight: 1.6, maxWidth: 540 }}>
            Register or update your skills, interests, and current workload. This record feeds the lab's
            topic-assignment agent and is visible on the director's dashboard.
          </p>
        </div>

        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: BLUE_DARK, marginBottom: 10 }}>
            {loadingList ? "Loading roster…" : `Roster (${existingStudents.length})`}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {existingStudents.map((s) => (
              <button key={s.id} type="button" onClick={() => loadExisting(s)} style={{ fontSize: 13, padding: "8px 12px", borderRadius: 6, border: `1px solid ${studentId === s.id ? BLUE : BORDER}`, background: studentId === s.id ? BLUE_LIGHT : "#FFFFFF", color: TEXT, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                {s.name || "Unnamed"}
                <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: TEXT_MUTED }}>{s.capacityAvailable}% open</span>
              </button>
            ))}
            {!loadingList && existingStudents.length === 0 && <span style={{ fontSize: 13, color: TEXT_MUTED }}>No students registered yet — be the first.</span>}
          </div>
        </div>

        <form onSubmit={handleSave} style={{ background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 10, padding: 28 }}>
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ flex: 1 }}><Field label="Full Name"><input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Reyes" /></Field></div>
            <div style={{ flex: 1 }}><Field label="Email"><input style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jreyes@university.edu" /></Field></div>
          </div>

          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <Field label="Program">
                <select style={{ ...inputStyle, cursor: "pointer" }} value={role} onChange={(e) => setRole(e.target.value)}>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
            </div>
            <div style={{ flex: 1 }}><Field label="Advisor"><input style={inputStyle} value={advisor} onChange={(e) => setAdvisor(e.target.value)} placeholder="Prof. Nakamura" /></Field></div>
          </div>

          <Field label="Research Interests" hint="Select all subfields you'd want new work assigned in.">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SUBFIELDS.map((sf) => <Chip key={sf} label={sf} active={interests.includes(sf)} onClick={() => toggleInterest(sf)} />)}
            </div>
          </Field>

          <Field label="Self-Defined Skills" hint="Add a skill, then set your proficiency.">
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <input style={inputStyle} value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }} placeholder="e.g. PyTorch, causal inference, distributed training" />
              <button type="button" onClick={addSkill} style={{ padding: "0 18px", borderRadius: 6, border: `1px solid ${BLUE}`, background: BLUE, color: "#FFFFFF", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Add</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {skills.map((s) => (
                <div key={s.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "8px 12px" }}>
                  <span style={{ fontSize: 14, color: TEXT }}>{s.name}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <select value={s.level} onChange={(e) => setSkillLevel(s.name, e.target.value)} style={{ background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 4, color: BLUE_DARK, fontSize: 12, padding: "4px 6px" }}>
                      <option>Familiar</option><option>Proficient</option><option>Expert</option>
                    </select>
                    <button type="button" onClick={() => removeSkill(s.name)} style={{ background: "none", border: "none", color: TEXT_MUTED, cursor: "pointer", fontSize: 16 }}>×</button>
                  </div>
                </div>
              ))}
              {skills.length === 0 && <span style={{ fontSize: 13, color: TEXT_MUTED }}>No skills added yet.</span>}
            </div>
          </Field>

          <Field label="Current Projects & Workload" hint="Estimate the % of your research time each active project takes.">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {projects.map((p, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input style={{ ...inputStyle, flex: 1 }} value={p.title} onChange={(e) => updateProject(i, "title", e.target.value)} placeholder="Project title" />
                  <input type="number" min={0} max={100} style={{ ...inputStyle, width: 80 }} value={p.commitmentPercent} onChange={(e) => updateProject(i, "commitmentPercent", Number(e.target.value))} />
                  <span style={{ fontFamily: FONTS.mono, fontSize: 12, color: TEXT_MUTED }}>%</span>
                  {projects.length > 1 && <button type="button" onClick={() => removeProjectRow(i)} style={{ background: "none", border: "none", color: TEXT_MUTED, cursor: "pointer", fontSize: 16 }}>×</button>}
                </div>
              ))}
            </div>
            <button type="button" onClick={addProjectRow} style={{ marginTop: 10, background: "none", border: `1px dashed ${BORDER}`, borderRadius: 6, color: BLUE_DARK, padding: "8px 12px", fontSize: 13, cursor: "pointer", width: "100%" }}>+ Add another project</button>
          </Field>

          <div style={{ background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "16px 18px", marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: BLUE_DARK, marginBottom: 10 }}>Capacity for New Work</div>
            <ProgressBar percent={capacityAvailable} />
          </div>

          <button type="submit" style={{ width: "100%", padding: "13px", borderRadius: 6, border: "none", background: status === "saved" ? GREEN : status === "error" ? RED : BLUE, color: "#FFFFFF", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            {status === "saving" && "Saving…"}
            {status === "saved" && "Saved ✓"}
            {status === "error" && "Name is required"}
            {status === "idle" && (studentId ? "Update profile" : "Save profile")}
          </button>

          {studentId && (
            <button type="button" onClick={resetForm} style={{ width: "100%", marginTop: 10, padding: "10px", borderRadius: 6, border: `1px solid ${BORDER}`, background: "none", color: TEXT_MUTED, fontSize: 13, cursor: "pointer" }}>
              Register a different student instead
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
