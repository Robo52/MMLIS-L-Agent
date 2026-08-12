import { Router } from "express";
import { parseStringPromise } from "xml2js";

const router = Router();

const SUBFIELD_QUERIES = {
  "NLP / LLMs": "cat:cs.CL",
  "Computer Vision": "cat:cs.CV",
  "Reinforcement Learning": "cat:cs.LG AND abs:reinforcement",
  "Robotics": "cat:cs.RO",
  "Graph ML": "abs:graph AND cat:cs.LG",
  "ML Theory": "cat:stat.ML",
  "Systems / MLOps": "abs:machine learning systems",
  "Optimization": "abs:optimization AND cat:cs.LG",
  "Causal Inference": "abs:causal inference",
  "Time Series": "abs:time series AND cat:cs.LG",
  "Generative Models": "abs:generative model",
  "Fairness / Interpretability": "abs:fairness OR abs:interpretability",
};

function stripWs(str) {
  return (str || "").replace(/\s+/g, " ").trim();
}

// GET /api/arxiv?subfield=NLP%20%2F%20LLMs
router.get("/arxiv", async (req, res) => {
  try {
    const subfield = req.query.subfield || "NLP / LLMs";
    const searchQuery = SUBFIELD_QUERIES[subfield] || `abs:${subfield}`;
    const url = `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(searchQuery)}&sortBy=submittedDate&sortOrder=descending&max_results=6`;

    const arxivRes = await fetch(url);
    if (!arxivRes.ok) throw new Error(`arXiv responded ${arxivRes.status}`);
    const xml = await arxivRes.text();
    const parsed = await parseStringPromise(xml);
    const entries = parsed.feed.entry || [];

    const papers = entries.map((entry) => {
      const id = stripWs(entry.id?.[0]);
      const arxivId = id.split("/abs/")[1] || id;
      return {
        id: arxivId,
        title: stripWs(entry.title?.[0]),
        summary: stripWs(entry.summary?.[0]),
        published: stripWs(entry.published?.[0]).slice(0, 10),
        authors: (entry.author || []).map((a) => stripWs(a.name?.[0])).filter(Boolean),
        link: id,
        subfield,
      };
    });

    res.json(papers);
  } catch (err) {
    console.error("arXiv proxy error:", err);
    res.status(502).json({ error: "Failed to fetch from arXiv" });
  }
});

// Talks to a locally hosted Ollama.
// OLLAMA_URL defaults to Ollama's own default port.
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:14b-instruct";

async function callLocalModel(prompt, { retries = 1 } = {}) {
  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      format: "json",
      options: { temperature: 0.2 },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Ollama request failed (${response.status}): ${body}. Is 'ollama serve' running and is ${OLLAMA_MODEL} pulled? Run: ollama pull ${OLLAMA_MODEL}`
    );
  }

  const data = await response.json();
  const text = (data.response || "").trim();

  try {
    JSON.parse(text);
    return text;
  } catch (parseErr) {
    if (retries > 0) return callLocalModel(prompt, { retries: retries - 1 });
    throw new Error(`Model did not return valid JSON after retry: ${text.slice(0, 200)}`);
  }
}

router.post("/agent/analyze-paper", async (req, res) => {
  try {
    const { paper } = req.body;
    if (!paper?.title || !paper?.summary) return res.status(400).json({ error: "paper.title and paper.summary are required" });

    const prompt = `You are helping a machine learning research lab identify concrete future research directions from a paper abstract.

Paper title: ${paper.title}
Abstract: ${paper.summary}

Task: Read the abstract. If it explicitly or implicitly points to future work, open problems, or limitations that suggest follow-up research, extract 1-3 concrete candidate research topics a masters or PhD student could pursue. Each topic should be phrased as a specific, actionable research direction (not a vague restatement of the paper).

If the abstract contains no meaningful basis for future work, return an empty topics array.

Respond with ONLY valid JSON, no markdown fences, no preamble, in this exact shape:
{"hasFutureWork": true or false, "topics": [{"title": "short topic title", "rationale": "one sentence on why this follows from the paper"}]}`;

    const cleaned = await callLocalModel(prompt);
    res.json(JSON.parse(cleaned));
  } catch (err) {
    console.error("analyze-paper error:", err);
    res.status(502).json({ error: "Failed to analyze paper", detail: err.message });
  }
});

// POST /api/agent/match-topic  { topic, paper, students }
router.post("/agent/match-topic", async (req, res) => {
  try {
    const { topic, paper, students } = req.body;
    if (!topic?.title || !Array.isArray(students)) {
      return res.status(400).json({ error: "topic and students are required" });
    }

    const roster = students.map((s) => ({
      id: s.id,
      name: s.name,
      interests: s.interests || [],
      skills: (s.skills || []).map((sk) => `${sk.name} (${sk.level})`),
      capacityAvailable: s.capacityAvailable ?? 100,
    }));

    const prompt = `You are the topic-assignment agent for a machine learning research lab. Match this candidate research topic to the best-fit student on the roster.

Candidate topic: ${topic.title}
Why it's relevant: ${topic.rationale || ""}
Source paper: ${paper?.title || "unknown"}

Roster (JSON):
${JSON.stringify(roster, null, 2)}

Task: Rank ALL students by fit for this topic, considering (in rough priority order): overlap between the topic and their stated interests/skills, then remaining capacity. A student with great skill fit but near-zero capacity should rank below a decent-fit student with real capacity — do not recommend assigning work to someone with under 10% capacity available unless every other student is equally or more constrained.

Respond with ONLY valid JSON, no markdown fences, in this exact shape:
{"ranking": [{"studentId": "...", "score": 0-100, "reasoning": "one sentence"}], "recommendedStudentId": "the id of your top pick", "noViableMatch": false}

Set noViableMatch to true only if no student has any meaningful skill/interest overlap with this topic.`;

    const cleaned = await callLocalModel(prompt);
    res.json(JSON.parse(cleaned));
  } catch (err) {
    console.error("match-topic error:", err);
    res.status(502).json({ error: "Failed to match topic", detail: err.message });
  }
});

export default router;
