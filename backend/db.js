// db.js — SQLite & PostgreSQL Database Adapter + AES-256 Encryption
// ═════════════════════════════════════════════════════════════════

const Database = require("better-sqlite3")
const { Pool } = require("pg")
const crypto   = require("crypto")
const path     = require("path")

const isPostgres = !!process.env.DATABASE_URL
let db = null
let pool = null

if (isPostgres) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for hosting platforms like Neon, Supabase, Render
  })
} else {
  const dbPath = process.env.DB_PATH || path.join(__dirname, "meetingai.db")
  db = new Database(dbPath)
  db.pragma("journal_mode = WAL")  // faster writes
}

// ── Bootstrap/Initialize tables ──
async function initDb() {
  if (isPostgres) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id              SERIAL PRIMARY KEY,
        email           VARCHAR(255) UNIQUE NOT NULL,
        password_hash   VARCHAR(255) NOT NULL,
        groq_key_enc    TEXT,
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS summaries (
        id              SERIAL PRIMARY KEY,
        user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title           VARCHAR(255),
        transcript_preview TEXT,
        summary         TEXT NOT NULL,
        style           VARCHAR(50),
        source_type     VARCHAR(50),
        mode            VARCHAR(100),
        total_time      VARCHAR(50),
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
    console.log("   📦 PostgreSQL Database tables verified/created")
  } else {
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
    console.log("   📦 SQLite Database tables verified/created (meetingai.db)")
  }
}

// ══════════════════════════════════════════════════
// AES-256-CBC Encryption for API keys
// ══════════════════════════════════════════════════
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
// Async DB query adapters
// ══════════════════════════════════════════════════

async function createUser(email, passwordHash) {
  if (isPostgres) {
    const res = await pool.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id",
      [email, passwordHash]
    )
    return { lastInsertRowid: res.rows[0].id }
  } else {
    const stmt = db.prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)")
    const res = stmt.run(email, passwordHash)
    return { lastInsertRowid: res.lastInsertRowid }
  }
}

async function findUserByEmail(email) {
  if (isPostgres) {
    const res = await pool.query("SELECT * FROM users WHERE email = $1", [email])
    return res.rows[0] || null
  } else {
    const stmt = db.prepare("SELECT * FROM users WHERE email = ?")
    return stmt.get(email) || null
  }
}

async function findUserById(id) {
  if (isPostgres) {
    const res = await pool.query("SELECT id, email, groq_key_enc, created_at FROM users WHERE id = $1", [id])
    return res.rows[0] || null
  } else {
    const stmt = db.prepare("SELECT id, email, groq_key_enc, created_at FROM users WHERE id = ?")
    return stmt.get(id) || null
  }
}

async function saveApiKey(groqKeyEnc, userId) {
  if (isPostgres) {
    await pool.query("UPDATE users SET groq_key_enc = $1 WHERE id = $2", [groqKeyEnc, userId])
  } else {
    const stmt = db.prepare("UPDATE users SET groq_key_enc = ? WHERE id = ?")
    stmt.run(groqKeyEnc, userId)
  }
}

async function deleteApiKey(userId) {
  if (isPostgres) {
    await pool.query("UPDATE users SET groq_key_enc = NULL WHERE id = $1", [userId])
  } else {
    const stmt = db.prepare("UPDATE users SET groq_key_enc = NULL WHERE id = ?")
    stmt.run(userId)
  }
}

async function insertSummary(userId, title, transcriptPreview, summary, style, sourceType, mode, totalTime) {
  if (isPostgres) {
    await pool.query(
      `INSERT INTO summaries (user_id, title, transcript_preview, summary, style, source_type, mode, total_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, title, transcriptPreview, summary, style, sourceType, mode, totalTime]
    )
  } else {
    const stmt = db.prepare(`
      INSERT INTO summaries (user_id, title, transcript_preview, summary, style, source_type, mode, total_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    stmt.run(userId, title, transcriptPreview, summary, style, sourceType, mode, totalTime)
  }
}

async function getUserSummaries(userId) {
  if (isPostgres) {
    const res = await pool.query(
      `SELECT id, title, style, source_type, mode, total_time, created_at
       FROM summaries WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [userId]
    )
    return res.rows
  } else {
    const stmt = db.prepare(`
      SELECT id, title, style, source_type, mode, total_time, created_at
      FROM summaries WHERE user_id = ? ORDER BY created_at DESC LIMIT 50
    `)
    return stmt.all(userId)
  }
}

async function getSummaryById(id, userId) {
  if (isPostgres) {
    const res = await pool.query("SELECT * FROM summaries WHERE id = $1 AND user_id = $2", [id, userId])
    return res.rows[0] || null
  } else {
    const stmt = db.prepare("SELECT * FROM summaries WHERE id = ? AND user_id = ?")
    return stmt.get(id, userId) || null
  }
}

async function deleteSummary(id, userId) {
  if (isPostgres) {
    await pool.query("DELETE FROM summaries WHERE id = $1 AND user_id = $2", [id, userId])
  } else {
    const stmt = db.prepare("DELETE FROM summaries WHERE id = ? AND user_id = ?")
    stmt.run(id, userId)
  }
}

module.exports = {
  initDb,
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
