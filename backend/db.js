// db.js — SQLite Database + AES-256 Encryption
// ═══════════════════════════════════════════════
// Tables: users, summaries
// API keys encrypted with AES-256-CBC before storage

const Database = require("better-sqlite3")
const crypto   = require("crypto")
const path     = require("path")

// ── Database setup ──
const db = new Database(path.join(__dirname, "meetingai.db"))
db.pragma("journal_mode = WAL")  // faster writes

// ── Create tables ──
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    email           TEXT UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    groq_key_enc    TEXT,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS summaries (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL,
    title           TEXT,
    transcript_preview TEXT,
    summary         TEXT NOT NULL,
    style           TEXT,
    source_type     TEXT,
    mode            TEXT,
    total_time      TEXT,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`)

console.log("   📦 Database ready (meetingai.db)")


// ══════════════════════════════════════════════════
// AES-256-CBC Encryption for API keys
// ══════════════════════════════════════════════════

// In production: use process.env.ENCRYPTION_KEY
const ENC_KEY = Buffer.from("meetingai_secret_key_2026_v1!!!!", "utf8") // exactly 32 bytes
const IV_LEN  = 16

function encrypt(text) {
  const iv     = crypto.randomBytes(IV_LEN)
  const cipher = crypto.createCipheriv("aes-256-cbc", ENC_KEY, iv)
  let enc      = cipher.update(text, "utf8", "hex")
  enc         += cipher.final("hex")
  return iv.toString("hex") + ":" + enc
}

function decrypt(text) {
  const [ivHex, encHex] = text.split(":")
  const iv       = Buffer.from(ivHex, "hex")
  const decipher = crypto.createDecipheriv("aes-256-cbc", ENC_KEY, iv)
  let dec        = decipher.update(encHex, "hex", "utf8")
  dec           += decipher.final("utf8")
  return dec
}


// ══════════════════════════════════════════════════
// Database helper functions
// ══════════════════════════════════════════════════

// ── Users ──
const createUser = db.prepare(`
  INSERT INTO users (email, password_hash) VALUES (?, ?)
`)

const findUserByEmail = db.prepare(`
  SELECT * FROM users WHERE email = ?
`)

const findUserById = db.prepare(`
  SELECT id, email, groq_key_enc, created_at FROM users WHERE id = ?
`)

const saveApiKey = db.prepare(`
  UPDATE users SET groq_key_enc = ? WHERE id = ?
`)

const deleteApiKey = db.prepare(`
  UPDATE users SET groq_key_enc = NULL WHERE id = ?
`)

// ── Summaries ──
const insertSummary = db.prepare(`
  INSERT INTO summaries (user_id, title, transcript_preview, summary, style, source_type, mode, total_time)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`)

const getUserSummaries = db.prepare(`
  SELECT id, title, style, source_type, mode, total_time, created_at
  FROM summaries WHERE user_id = ? ORDER BY created_at DESC LIMIT 50
`)

const getSummaryById = db.prepare(`
  SELECT * FROM summaries WHERE id = ? AND user_id = ?
`)

const deleteSummary = db.prepare(`
  DELETE FROM summaries WHERE id = ? AND user_id = ?
`)


module.exports = {
  db,
  encrypt,
  decrypt,
  createUser,
  findUserByEmail,
  findUserById,
  saveApiKey,
  deleteApiKey,
  insertSummary,
  getUserSummaries,
  getSummaryById,
  deleteSummary,
}
