/**
 * app.js — Energy API with multi-layered Express.js middleware
 *
 * Middleware stack (in order):
 *  1. IP Filtering     — Allow only localhost (127.0.0.1 / ::1)
 *  2. CORS             — Restrict to local dev origin
 *  3. Rate Limiting    — 10 requests per minute
 *  4. Auth (per-route) — Bearer Token  → /api/oil-prices
 *                        Basic Auth    → /dashboard
 */

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = 3000;

// ─── Constants ───────────────────────────────────────────────────────────────

const BEARER_TOKEN = "super-secret-energy-token-2026";
const BASIC_AUTH_USER = "admin";
const BASIC_AUTH_PASS = "energy123";
const LOCAL_ORIGIN = `http://localhost:${PORT}`;

// ─── Static Data ─────────────────────────────────────────────────────────────

const OIL_PRICES = {
  market: "Global Energy Exchange",
  last_updated: "2026-03-15T12:55:00Z",
  currency: "USD",
  data: [
    { symbol: "WTI",     name: "West Texas Intermediate", price: 78.45, change:  0.12 },
    { symbol: "BRENT",   name: "Brent Crude",             price: 82.30, change: -0.05 },
    { symbol: "NAT_GAS", name: "Natural Gas",             price:  2.15, change:  0.02 },
  ],
};

// ─── Middleware 1: IP Filtering ───────────────────────────────────────────────

/**
 * Allows only requests originating from localhost (IPv4 or IPv6 loopback).
 * All other IPs receive a 403 Forbidden response.
 */
app.use((req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress;
  const allowed = ["127.0.0.1", "::1", "::ffff:127.0.0.1"];

  if (!allowed.includes(ip)) {
    return res.status(403).json({ error: "Forbidden: your IP is not allowed." });
  }

  next();
});

// ─── Middleware 2: CORS ───────────────────────────────────────────────────────

/**
 * Restricts cross-origin requests to the local development origin only.
 */
app.use(
  cors({
    origin: LOCAL_ORIGIN,
    methods: ["GET"],
    optionsSuccessStatus: 200,
  })
);

// ─── Middleware 3: Rate Limiting ──────────────────────────────────────────────

/**
 * Limits each IP to 10 requests per 1-minute window.
 */
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Limit: 10 per minute. Please try again later." },
});

app.use(limiter);

// ─── Auth Helpers ─────────────────────────────────────────────────────────────

/**
 * Bearer Token middleware — protects /api/oil-prices.
 * Expects: Authorization: Bearer <token>
 */
function requireBearerToken(req, res, next) {
  const authHeader = req.headers["authorization"] || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || token !== BEARER_TOKEN) {
    return res
      .status(401)
      .json({ error: "Unauthorized: invalid or missing Bearer token." });
  }

  next();
}

/**
 * HTTP Basic Auth middleware — protects /dashboard.
 * Sends WWW-Authenticate challenge if credentials are absent or wrong.
 */
function requireBasicAuth(req, res, next) {
  const authHeader = req.headers["authorization"] || "";

  if (!authHeader.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Energy Dashboard"');
    return res.status(401).send("Authentication required.");
  }

  const base64 = authHeader.slice("Basic ".length);
  const [user, pass] = Buffer.from(base64, "base64").toString().split(":");

  if (user !== BASIC_AUTH_USER || pass !== BASIC_AUTH_PASS) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Energy Dashboard"');
    return res.status(401).send("Invalid credentials.");
  }

  next();
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET /api/oil-prices — Protected by Bearer Token
app.get("/api/oil-prices", requireBearerToken, (req, res) => {
  res.json(OIL_PRICES);
});

// GET /dashboard — Protected by Basic Auth
app.get("/dashboard", requireBasicAuth, (req, res) => {
  const rows = OIL_PRICES.data
    .map((c) => {
      const sign   = c.change >= 0 ? "+" : "";
      const cls    = c.change >= 0 ? "up" : "down";
      const arrow  = c.change >= 0 ? "▲" : "▼";
      return `
        <tr>
          <td class="symbol">${c.symbol}</td>
          <td>${c.name}</td>
          <td class="price">$${c.price.toFixed(2)}</td>
          <td class="change ${cls}">${arrow} ${sign}${c.change.toFixed(2)}</td>
        </tr>`;
    })
    .join("");

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Energy Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Syne:wght@400;700;800&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg:       #080c10;
      --surface:  #0d1520;
      --border:   #1a2d45;
      --accent:   #00d4ff;
      --accent2:  #ff6b35;
      --up:       #00e676;
      --down:     #ff1744;
      --text:     #c8d8e8;
      --muted:    #4a6278;
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'Syne', sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 3rem 1.5rem;
      background-image:
        radial-gradient(ellipse 60% 40% at 70% 10%, rgba(0,212,255,.07) 0%, transparent 70%),
        radial-gradient(ellipse 50% 30% at 10% 90%, rgba(255,107,53,.05) 0%, transparent 60%);
    }

    header {
      text-align: center;
      margin-bottom: 2.5rem;
    }

    .eyebrow {
      font-family: 'Share Tech Mono', monospace;
      font-size: .75rem;
      letter-spacing: .25em;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: .6rem;
    }

    h1 {
      font-size: clamp(1.8rem, 5vw, 3rem);
      font-weight: 800;
      color: #fff;
      letter-spacing: -.02em;
      line-height: 1.1;
    }

    h1 span { color: var(--accent); }

    .meta {
      font-family: 'Share Tech Mono', monospace;
      font-size: .72rem;
      color: var(--muted);
      margin-top: .8rem;
      letter-spacing: .08em;
    }

    .card {
      width: 100%;
      max-width: 760px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 0 60px rgba(0,212,255,.06), 0 20px 60px rgba(0,0,0,.5);
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    thead th {
      font-family: 'Share Tech Mono', monospace;
      font-size: .65rem;
      letter-spacing: .2em;
      text-transform: uppercase;
      color: var(--muted);
      padding: 1rem 1.4rem;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }

    tbody tr {
      border-bottom: 1px solid var(--border);
      transition: background .15s;
    }

    tbody tr:last-child { border-bottom: none; }
    tbody tr:hover { background: rgba(0,212,255,.04); }

    td {
      padding: 1.1rem 1.4rem;
      font-size: .95rem;
    }

    .symbol {
      font-family: 'Share Tech Mono', monospace;
      font-size: .9rem;
      color: var(--accent);
      letter-spacing: .06em;
    }

    .price {
      font-family: 'Share Tech Mono', monospace;
      font-size: 1.05rem;
      font-weight: 700;
      color: #fff;
    }

    .change {
      font-family: 'Share Tech Mono', monospace;
      font-size: .88rem;
      font-weight: 700;
    }

    .up   { color: var(--up); }
    .down { color: var(--down); }

    .footer-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: .9rem 1.4rem;
      background: rgba(255,255,255,.025);
      border-top: 1px solid var(--border);
      font-family: 'Share Tech Mono', monospace;
      font-size: .68rem;
      color: var(--muted);
      letter-spacing: .08em;
    }

    .live-dot {
      display: inline-block;
      width: 7px; height: 7px;
      border-radius: 50%;
      background: var(--up);
      margin-right: .5rem;
      animation: pulse 1.8s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: .2; }
    }

    .logout-btn {
      display: inline-block;
      margin-top: 2rem;
      padding: .55rem 1.4rem;
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--muted);
      font-family: 'Share Tech Mono', monospace;
      font-size: .72rem;
      letter-spacing: .12em;
      text-transform: uppercase;
      text-decoration: none;
      transition: border-color .2s, color .2s;
    }

    .logout-btn:hover {
      border-color: var(--accent2);
      color: var(--accent2);
    }
  </style>
</head>
<body>
  <header>
    <p class="eyebrow">Global Energy Exchange</p>
    <h1>Commodity <span>Prices</span></h1>
    <p class="meta">CURRENCY: USD &nbsp;|&nbsp; LAST UPDATED: ${OIL_PRICES.last_updated}</p>
  </header>

  <div class="card">
    <table>
      <thead>
        <tr>
          <th>Symbol</th>
          <th>Instrument</th>
          <th>Price</th>
          <th>Change</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="footer-bar">
      <span><span class="live-dot"></span>LIVE FEED ACTIVE</span>
      <span>${OIL_PRICES.market}</span>
    </div>
  </div>

  <a class="logout-btn" href="/logout">⏻ &nbsp;Logout</a>
</body>
</html>`);
});

app.get("/logout", (req, res) => {
  res.status(401).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Logged Out</title>
      <style>
        body { font-family: sans-serif; text-align: center; padding: 4rem; background: #080c10; color: #c8d8e8; }
        h2   { color: #ff6b35; }
        a    { color: #00d4ff; text-decoration: none; }
        a:hover { text-decoration: underline; }
        p    { color: #4a6278; font-size: 0.9rem; margin-top: 1rem; }
      </style>
    </head>
    <body>
      <h2>You have been logged out.</h2>
      <a href="/dashboard">&#8594; Log in again</a>
      <p>Click the link above to re-enter your credentials.</p>
    </body>
    </html>
  `);
});

// ─── Start Server ─────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n⚡  Energy API running → http://localhost:${PORT}`);
  console.log(`   Dashboard  → http://localhost:${PORT}/dashboard`);
  console.log(`   API        → http://localhost:${PORT}/api/oil-prices\n`);
});