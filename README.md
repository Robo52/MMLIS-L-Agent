# MLIS-L — Machine Learning & Intelligent Systems Lab

An internal tool for assigning research topics to MS/PhD students based on
their self-reported skills and current workload, and on future-work
directions extracted from recent arXiv papers.

## File structure

```
mlis-l/
├── .github/
│   └── workflows/
│       └── deploy.yml          # builds frontend & deploys to GitHub Pages on push
├── frontend/                    # React app (Vite) → GitHub Pages
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js           # base path must match your repo name
│   ├── .env.example              # copy to .env for local dev
│   └── src/
│       ├── main.jsx
│       ├── App.jsx               # tab navigation between the 5 views
│       ├── api.js                # fetch wrapper — talks to the backend only
│       ├── tokens.js             # shared colors/fonts/style constants
│       └── components/
│           ├── IntakeForm.jsx    # student registration (skills, workload)
│           ├── Dashboard.jsx     # director + student views, manual assign/reassign
│           ├── PaperScout.jsx    # fetches arXiv papers, extracts candidate topics
│           ├── MatchingEngine.jsx# auto-matches candidates to students
│           └── AuditTrail.jsx    # history of every assignment
├── backend/                      # Express + SQLite API → runs on lab hardware, alongside Ollama
│   ├── package.json
│   ├── server.js                 # entry point, wires up routes + CORS
│   ├── db.js                     # SQLite schema (students, assignments, papers)
│   ├── .env.example               # copy to .env — points at your local Ollama instance
│   ├── data/                      # SQLite file lives here (gitignored)
│   └── routes/
│       ├── students.js
│       ├── assignments.js
│       ├── papers.js
│       └── agent.js               # arXiv proxy + local Ollama calls (topic extraction, matching)
├── .gitignore
└── README.md
```

**Why a backend at all, instead of calling arXiv/the model straight from
the browser?** Two reasons: (1) arXiv's API doesn't reliably allow
cross-origin requests from arbitrary browser origins, so proxying avoids
CORS failures; (2) since the AI model is Ollama running on a specific lab
machine, the browser can't reach it directly anyway — everything has to go
through a backend that lives on (or can reach) that same machine.

**This version runs entirely for free.** Instead of a paid API, the
backend calls a locally-hosted open-weight model via
[Ollama](https://ollama.com) — no API key, no per-token cost, and none of
your students' data ever leaves lab hardware.

## One-time setup

### 1. Install Ollama and pull a model, on your lab GPU machine
```bash
# macOS / Linux
curl -fsSL https://ollama.com/install.sh | sh
# Windows: download the installer from https://ollama.com/download

ollama pull qwen2.5:14b-instruct
```
Qwen2.5 was chosen over Llama here specifically because it's noticeably
more reliable at returning clean, well-formed JSON on the first try —
which matters a lot for this project, since every agent call needs
structured output the backend can parse. If your GPU doesn't have enough
VRAM for the 14b model (needs roughly 10GB+), drop down:
```bash
ollama pull qwen2.5:7b-instruct    # ~5GB VRAM, still solid at JSON
```
and set `OLLAMA_MODEL=qwen2.5:7b-instruct` in the backend `.env` (see step
5). Expect the 7b model to occasionally need the automatic retry built
into `agent.js` — that's normal and handled for you, just watch the
backend logs the first few times to make sure it's not failing repeatedly.

Test it's working:
```bash
ollama run qwen2.5:14b-instruct "Say hello in JSON: {\"message\": \"...\"}"
```

### 2. Push this project to GitHub
```bash
cd mlis-l
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/mlis-l.git
git push -u origin main
```

### 3. Update the Vite base path
Open `frontend/vite.config.js` and make sure `base` matches your actual
repo name exactly, e.g. if your repo is `github.com/yourname/mlis-l`:
```js
base: "/mlis-l/"
```
(If you ever rename the repo, update this and redeploy.)

## Running the backend (on the lab machine, alongside Ollama)

There's no Render/cloud step here anymore — since the AI model lives on
lab hardware, the backend needs to live there too (or somewhere on the
same network that can reach Ollama).

### 1. Set up and start the backend
```bash
cd backend
cp .env.example .env
npm install
```
Edit `.env` if needed — defaults assume Ollama is running on the same
machine, which is the simplest setup.

Run it so it survives terminal closes / reboots. Easiest option is
[pm2](https://pmpm2.keymetrics.io):
```bash
npm install -g pm2
pm2 start server.js --name mlis-l-backend
pm2 save
pm2 startup   # follow the printed instructions to survive reboots
```

### 2. Expose it to the internet for free, without port-forwarding
Your GitHub Pages frontend runs in students'/the director's browsers
anywhere — it needs a real HTTPS URL to reach this backend, not just
`localhost`. [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
does this for free, without exposing the lab machine directly to the
internet or configuring router port-forwarding:

```bash
# macOS
brew install cloudflared
# Linux / Windows: see https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

cloudflared tunnel --url http://localhost:4000
```
This prints a public URL like `https://random-words-1234.trycloudflare.com`
that forwards to your local backend. For a stable, memorable URL instead
of a random one each time you restart it, set up a named tunnel with a
free Cloudflare account (the same page above covers this) — worth doing
once you're past initial testing.

Copy whichever URL you get — you need it next. Update `ALLOWED_ORIGINS`
in `backend/.env` to include your future GitHub Pages URL, and restart the
backend (`pm2 restart mlis-l-backend`) for that change to take effect.

**Reality check on this setup:** it only works while the lab machine is
on, Ollama is running, and the tunnel is active. That's fine for a small
lab tool used during work hours, but if the machine reboots or sleeps,
the site will show connection errors until someone restarts things. If
that's a real problem for your lab, the honest fix is either a machine
that's reliably always-on, or accepting a small paid host for just the
backend later — the free/self-hosted and paid/always-up tradeoff is
real, not a bug in this setup.

## Deploying the frontend (GitHub Pages)

1. In your GitHub repo: **Settings → Pages → Source → GitHub Actions**.
   (You don't need to pick a branch — the workflow in
   `.github/workflows/deploy.yml` handles the build and publish.)
2. **Settings → Secrets and variables → Actions → New repository secret**:
   - Name: `VITE_API_URL`
   - Value: your Cloudflare Tunnel URL from above, e.g.
     `https://random-words-1234.trycloudflare.com`
3. Push to `main` (or re-run the workflow manually from the Actions tab).
   The workflow builds the frontend with that backend URL baked in and
   publishes it.
4. Your site will be live at `https://YOUR-USERNAME.github.io/mlis-l/`.
5. If you ever change the tunnel URL (e.g. moved to a named tunnel),
   update the `VITE_API_URL` secret and re-run the workflow — the old URL
   is baked into the built files, it won't update itself.

## Local development

Backend:
```bash
cd backend
cp .env.example .env       # defaults assume Ollama running locally, no key needed
npm install
npm run dev                 # http://localhost:4000
# in a separate terminal, make sure Ollama is actually running:
ollama serve
```

Frontend (separate terminal):
```bash
cd frontend
cp .env.example .env        # defaults to localhost:4000, fine for local dev
npm install
npm run dev                  # http://localhost:5173
```

## Known limitations to be aware of

- **No authentication** — "Director view" vs "Student view" is just a UI
  toggle, not a real permission boundary. Anyone with the link can act as
  director. Fine for an internal tool on a private link within a trusted
  lab; not fine if this URL is ever made public. A simple next step would
  be a shared lab password gate, or your university's SSO if supported.
- **Uptime depends on the lab machine** — since the model and backend both
  run locally instead of on a managed cloud host, the tool only works
  while that machine is on, Ollama is running, and the tunnel is active.
  See the "reality check" note in the deployment section above.
- **Open models are less reliable than Claude at structured output** —
  `agent.js` retries once on malformed JSON, but expect an occasional
  failed match or a lower-quality candidate topic compared to what a
  frontier model would produce. Worth spot-checking agent output more
  often than you would with a paid model, especially early on.
- **Paper Scout reads only arXiv abstracts**, not full paper text, so
  "future work" extraction is limited to what's inferable from the
  abstract. A future upgrade could fetch full PDF text for a smaller,
  curated set of papers.
- **Audit trail keeps the latest change only**, not a full multi-step
  history, per assignment. If your lab wants a complete paper trail across
  repeated reassignments, add an append-only `assignment_history` table
  that inserts a row on every change instead of overwriting fields.
- **SQLite is a single file** — back it up periodically (it lives at
  `backend/data/mlis-l.sqlite` on the lab machine). For under 10 students
  this is genuinely fine; if the lab grows significantly, a managed
  Postgres instance would be the natural next step.
