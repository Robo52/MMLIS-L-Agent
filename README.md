# MLIS-L Agent

An agent for assigning research topics to students based on
their self-reported skills and current workload; and on future work from recent arXiv papers.

## File structure

```
mmlis-l/
├── .github/
│   └── workflows/
│       └── deploy.yml          # builds frontend & deploys to GitHub Pages on push
├── frontend/                    # React app -> GitHub Pages
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js           # base path must match your repo name
│   ├── .env.example              # copy to .env for local dev
│   └── src/
│       ├── main.jsx
│       ├── App.jsx               # tab nav
│       ├── api.js                # fetch wrapper
│       ├── tokens.js            
│       └── components/
│           ├── IntakeForm.jsx    # student reg
│           ├── Dashboard.jsx     # director & student views, manual assign/reassign
│           ├── PaperScout.jsx    # fetches arXiv papers, extracts  topics
│           ├── MatchingEngine.jsx # matches candidates to students
│           └── AuditTrail.jsx    # history of every assignment
├── backend/                     
│   ├── package.json
│   ├── server.js                 # entry point, wires up routes + CORS
│   ├── db.js                     # SQLite schema (students, assignments, papers)
│   ├── .env.example               # copy to .env — points at your local Ollama instance
│   ├── data/                      # SQLite file lives here (gitignored)
│   └── routes/
│       ├── students.js
│       ├── assignments.js
│       ├── papers.js
│       └── agent.js               
├── .gitignore
└── README.md
```
## Setup

### 1. Install Ollama and pull a model
```bash
curl -fsSL https://ollama.com/install.sh | sh

```
```bash
ollama pull qwen2.5:7b-instruct
```
and set `OLLAMA_MODEL=qwen2.5:7b-instruct` in the backend `.env` (see step
Expect the 7b model to occasionally need the automatic retry built
into `agent.js`

Test:
```bash
ollama run qwen2.5:14b-instruct "Say hello in JSON: {\"message\": \"...\"}"
```

### 1. Set up and start the backend
```bash
cd backend
cp .env.example .env
npm install
```
Edit `.env` if needed, default assumes Ollama is running on the same
machine.

Set up:
[pm2](https://pmpm2.keymetrics.io):
```bash
npm install -g pm2
pm2 start server.js --name mlis-l-backend
pm2 save
pm2 startup   # follow the printed instructions to survive reboots
```

### 2. Pages
Your GitHub Pages frontend runs in students'/the director's browsers
anywhere — it needs a real HTTPS URL to reach this backend, not just
`localhost`. [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
does this for free, without exposing the lab machine directly to the
internet or configuring router port-forwarding:

```bash
# see https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

cloudflared tunnel --url http://localhost:4000
```
This prints a public URL like `https://random-words-1234.trycloudflare.com`
that forwards to your local backend. Need to set up a named tunnel with a Cloudflare account so it does not change the url every time it launches.

Copy new URL and Update `ALLOWED_ORIGINS`
in `backend/.env` to include it, restart the
backend (`pm2 restart mlis-l-backend`).

**Setup note:** it only works while the lab puter is
on, Ollama is running, and the tunnel is active.

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
5. If you ever change the tunnel URL,
   update the `VITE_API_URL` secret and re-run the workflow.

## Local computer dev

Backend:
```bash
cd backend
cp .env.example .env
npm install
npm run dev                 # http://localhost:4000
# Make sure ollama running. Sepearate terminal:
ollama serve
```

Frontend:
```bash
cd frontend
cp .env.example .env        # defaults to localhost:4000. fine.
npm install
npm run dev                  # http://localhost:5173
```
