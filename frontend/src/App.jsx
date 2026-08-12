import React, { useState } from "react";
import { FONTS, BLUE, BORDER, TEXT_MUTED } from "./tokens";
import IntakeForm from "./components/IntakeForm";
import Dashboard from "./components/Dashboard";
import PaperScout from "./components/PaperScout";
import MatchingEngine from "./components/MatchingEngine";
import AuditTrail from "./components/AuditTrail";

const TABS = [
  { id: "intake", label: "Register", component: IntakeForm },
  { id: "dashboard", label: "Dashboard", component: Dashboard },
  { id: "scout", label: "Paper Scout", component: PaperScout },
  { id: "matching", label: "Matching Agent", component: MatchingEngine },
  { id: "audit", label: "Audit Trail", component: AuditTrail },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const ActiveComponent = TABS.find((t) => t.id === activeTab).component;

  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF" }}>
      <nav style={{ borderBottom: `1px solid ${BORDER}`, position: "sticky", top: 0, background: "#FFFFFF", zIndex: 10 }}>
        <div style={{ maxWidth: 920, margin: "0 auto", display: "flex", gap: 4, padding: "0 20px", overflowX: "auto" }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "16px 14px",
                border: "none",
                background: "none",
                fontFamily: FONTS.body,
                fontSize: 14,
                fontWeight: 600,
                color: activeTab === tab.id ? BLUE : TEXT_MUTED,
                borderBottom: activeTab === tab.id ? `2px solid ${BLUE}` : "2px solid transparent",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>
      <ActiveComponent />
    </div>
  );
}
