# ThreadLightly

ThreadLightly analyses clothing labels to rate their sustainability. Point your phone at a garment's composition label, and the app uses OCR + the MADE-BY Environmental Benchmark to return a score and per-material breakdown.

---

## Prerequisites

- **Node.js** v18 or later
- **npm** v9 or later
- A **Google Cloud** project with the OAuth 2.0 API enabled (for login)

---

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/manesharamesh98/ThreadLightly.git
cd ThreadLightly

# 2. Install dependencies
npm install
```

---

## Configuration

```bash
# Copy the example env file
cp .env.example .env
```

Open `.env` and fill in the values:

```env
GOOGLE_CLIENT_ID=       # From Google Cloud Console → Credentials
GOOGLE_CLIENT_SECRET=   # From Google Cloud Console → Credentials
JWT_SECRET=             # Any long random string, e.g. openssl rand -hex 32
SESSION_SECRET=         # Any long random string, e.g. openssl rand -hex 32
PORT=3000               # Port the server listens on
NODE_ENV=development
```

### Setting up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client ID**
3. Set application type to **Web application**
4. Add `http://localhost:3000/api/auth/google/callback` as an **Authorised redirect URI**
5. Copy the **Client ID** and **Client Secret** into your `.env`

---

## Running the app

```bash
# Production mode
npm start

# Development mode (auto-restarts on file changes)
npm run dev
```

The server starts at `http://localhost:3000`.

---

## Usage

1. Open `http://localhost:3000` in your browser
2. Sign in with Google
3. Tap **Snap** and either take a photo or upload an image of a clothing composition label
4. Tap **Analyse** — results appear within a few seconds

> **Preview mode** (no Google account needed): on the login screen, click the preview link. Scans are not saved to the database in preview mode.

---

## Project structure

```
src/
  server.js          # Express entry point
  db/                # SQLite schema and connection
  middleware/        # JWT auth middleware
  pipeline/          # OCR + material matching + scoring
  routes/            # API route handlers

public/              # Frontend SPA (HTML, CSS, JS)
Context/             # Product docs, design assets, technical documentation
uploads/             # Temporary upload directory (auto-cleared after each scan)
```

For a detailed breakdown of the analysis pipeline, see [`Context/technical-documentation.md`](Context/technical-documentation.md).

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start the server |
| `npm run dev` | Start with file-watch auto-restart |
