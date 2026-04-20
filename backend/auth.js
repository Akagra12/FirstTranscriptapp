// auth.js — Authentication Routes + API Key Management + Summary History
// ════════════════════════════════════════════════════════════════════════
// POST /auth/signup        — Create account
// POST /auth/login         — Login → JWT token
// POST /user/api-key       — Save Groq API key (encrypted)
// GET  /user/api-key/status— Check if key exists
// DELETE /user/api-key     — Remove saved key
// GET  /user/summaries     — List saved summaries
// GET  /user/summaries/:id — Get full summary
// DELETE /user/summaries/:id — Delete a summary

const express  = require("express")
const bcrypt   = require("bcryptjs")
const jwt      = require("jsonwebtoken")
const router   = express.Router()

const {
  encrypt, decrypt,
  createUser, findUserByEmail, findUserById,
  saveApiKey, deleteApiKey,
  getUserSummaries, getSummaryById, deleteSummary,
} = require("./db")

// In production: use process.env.JWT_SECRET
const JWT_SECRET = "meetingai_jwt_secret_2026_v1"
const JWT_EXPIRES = "7d"  // token valid for 7 days


// ── Helper: generate JWT ──
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  )
}


// ── Middleware: verify JWT ──
function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"]
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" })
  }

  const token = authHeader.split(" ")[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded  // { id, email }
    next()
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" })
  }
}


// ── Middleware: optional auth (supports both JWT and x-groq-key) ──
function optionalAuth(req, res, next) {
  const authHeader = req.headers["authorization"]

  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1]
      const decoded = jwt.verify(token, JWT_SECRET)
      req.user = decoded

      // Load user's encrypted API key from DB
      const user = findUserById.get(decoded.id)
      if (user && user.groq_key_enc) {
        req.groqKey = decrypt(user.groq_key_enc)
      }
    } catch (_) {
      // Token invalid — fall through to header check
    }
  }

  // Fallback: check x-groq-key header (backward compatible)
  if (!req.groqKey) {
    req.groqKey = req.headers["x-groq-key"] || ""
  }

  next()
}


// ══════════════════════════════════════════════════
// AUTH ROUTES
// ══════════════════════════════════════════════════

// POST /auth/signup
router.post("/auth/signup", async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" })
  }

  // Check if email already exists
  const existing = findUserByEmail.get(email.toLowerCase().trim())
  if (existing) {
    return res.status(409).json({ error: "Email already registered" })
  }

  try {
    const hash = await bcrypt.hash(password, 10)
    const result = createUser.run(email.toLowerCase().trim(), hash)

    const user = { id: result.lastInsertRowid, email: email.toLowerCase().trim() }
    const token = generateToken(user)

    console.log(`   ✅ New user: ${user.email} (ID: ${user.id})`)

    return res.json({
      token,
      user: { id: user.id, email: user.email, hasApiKey: false }
    })
  } catch (err) {
    console.error(`   ❌ Signup error: ${err.message}`)
    return res.status(500).json({ error: "Failed to create account" })
  }
})


// POST /auth/login
router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" })
  }

  const user = findUserByEmail.get(email.toLowerCase().trim())
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" })
  }

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password" })
  }

  const token = generateToken(user)
  console.log(`   🔑 Login: ${user.email}`)

  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      hasApiKey: !!user.groq_key_enc
    }
  })
})


// ══════════════════════════════════════════════════
// API KEY MANAGEMENT
// ══════════════════════════════════════════════════

// POST /user/api-key — save groq key (encrypted)
router.post("/user/api-key", verifyToken, (req, res) => {
  const { groqKey } = req.body
  if (!groqKey || !groqKey.trim()) {
    return res.status(400).json({ error: "API key required" })
  }

  try {
    const encrypted = encrypt(groqKey.trim())
    saveApiKey.run(encrypted, req.user.id)
    console.log(`   🔐 API key saved for user ${req.user.email}`)
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: "Failed to save API key" })
  }
})

// GET /user/api-key/status — check if key exists
router.get("/user/api-key/status", verifyToken, (req, res) => {
  const user = findUserById.get(req.user.id)
  return res.json({ hasApiKey: !!(user && user.groq_key_enc) })
})

// DELETE /user/api-key — remove saved key
router.delete("/user/api-key", verifyToken, (req, res) => {
  deleteApiKey.run(req.user.id)
  return res.json({ success: true })
})


// ══════════════════════════════════════════════════
// SUMMARY HISTORY
// ══════════════════════════════════════════════════

// GET /user/summaries — list recent summaries
router.get("/user/summaries", verifyToken, (req, res) => {
  const summaries = getUserSummaries.all(req.user.id)
  return res.json({ summaries })
})

// GET /user/summaries/:id — get full summary
router.get("/user/summaries/:id", verifyToken, (req, res) => {
  const summary = getSummaryById.get(req.params.id, req.user.id)
  if (!summary) return res.status(404).json({ error: "Summary not found" })
  return res.json({ summary })
})

// DELETE /user/summaries/:id — delete a summary
router.delete("/user/summaries/:id", verifyToken, (req, res) => {
  deleteSummary.run(req.params.id, req.user.id)
  return res.json({ success: true })
})


module.exports = { router, verifyToken, optionalAuth, JWT_SECRET }
