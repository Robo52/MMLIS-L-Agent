import "dotenv/config";
import express from "express";
import cors from "cors";

import studentsRouter from "./routes/students.js";
import assignmentsRouter from "./routes/assignments.js";
import papersRouter from "./routes/papers.js";
import agentRouter from "./routes/agent.js";

const app = express();
const PORT = process.env.PORT || 4000;

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // allow no-origin requests (curl, server-to-server health checks)
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
  })
);
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/students", studentsRouter);
app.use("/api/assignments", assignmentsRouter);
app.use("/api/papers", papersRouter);
app.use("/api", agentRouter); // exposes /api/arxiv, /api/agent/analyze-paper, /api/agent/match-topic

app.listen(PORT, () => {
  console.log(`MLIS-L backend running on port ${PORT}`);
});
