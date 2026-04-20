// server.js — 3-Model Parallel Architecture
// ═══════════════════════════════════════════
// 3 models run SIMULTANEOUSLY (separate TPM budgets = 0 wait!)
//
// Model A: llama-4-scout-17b  (30K TPM) — primary
// Model B: llama-3.1-8b       (6K TPM)  — fast
// Model C: llama-3.3-70b      (12K TPM) — quality
//
// MEDIUM (<35K): All 3 get full transcript → compare → merge
// LONG   (35K+): A=full, B=first half, C=second half → merge

const express      = require("express")
const cors         = require("cors")
const multer       = require("multer")
const path         = require("path")
const fs           = require("fs")
const { execSync } = require("child_process")
const { SOURCE, STYLE_PROMPTS, buildCaptureAllPrompt, buildMergePrompt } = require("./prompts")
const { router: authRouter, optionalAuth } = require("./auth")
const { insertSummary } = require("./db")

const app  = express()
const PORT = 3001

app.use(cors())
app.use(express.json({ limit: "50mb" }))

// ── Auth routes ──
app.use(authRouter)

// Upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "uploads")
    if (!fs.existsSync(dir)) fs.mkdirSync(dir)
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    cb(null, `audio_${Date.now()}${path.extname(file.originalname)}`)
  }
})
const upload = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } })

// ── 3 Models ──
const WHISPER = "whisper-large-v3-turbo"
const MODEL_A = "meta-llama/llama-4-scout-17b-16e-instruct"  // 30K TPM ⭐
const MODEL_B = "llama-3.1-8b-instant"                       // 6K TPM (fast)
const MODEL_C = "llama-3.3-70b-versatile"                    // 12K TPM (quality)

function tag(model) {
  if (model.includes("scout")) return "Scout-17B"
  if (model.includes("8b"))    return "8B-Fast"
  if (model.includes("70b"))   return "70B-Quality"
  return model.split("/").pop()
}



// ══════════════════════════════════════════════════════════════
// Call any Groq model with retry
// ══════════════════════════════════════════════════════════════
async function callModel(groqKey, model, prompt, maxTokens = 1024, attempt = 1) {
  const t = tag(model)
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${groqKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: maxTokens
    })
  })

  const data = await res.json()
  const err = data.error?.message || ""

  if (res.status === 429 && attempt <= 3) {
    const m = err.match(/try again in ([\d.]+)s/)
    const wait = m ? parseFloat(m[1]) : 30
    console.log(`   ⏳ [${t}] Rate limited. Waiting ${Math.ceil(wait)}s...`)
    await new Promise(r => setTimeout(r, wait * 1000 + 1000))
    return callModel(groqKey, model, prompt, maxTokens, attempt + 1)
  }

  if (err.includes("please reduce your message size") && attempt <= 3) {
    const reduced = Math.max(256, Math.floor(maxTokens / 2))
    console.log(`   ⚠️  [${t}] Too large! Reducing: ${maxTokens} → ${reduced}`)
    await new Promise(r => setTimeout(r, 2000))
    return callModel(groqKey, model, prompt, reduced, attempt + 1)
  }

  if (!res.ok) throw new Error(`[${t}] ${err}`)
  return data.choices[0].message.content
}

// Multer handler
function handleUpload(req, res, next) {
  upload.single("audio")(req, res, (err) => {
    if (err) return res.status(413).json({ error: err.message })
    next()
  })
}


// ══════════════════════════════════════════════════════════════
// ROUTE 1: /groq/transcribe — Whisper with auto-compress
// ══════════════════════════════════════════════════════════════
app.post("/groq/transcribe", optionalAuth, handleUpload, async (req, res) => {
  const groqKey = req.groqKey
  if (!groqKey) return res.status(400).json({ error: "Missing Groq API key. Save your key in Settings or pass x-groq-key header." })
  if (!req.file) return res.status(400).json({ error: "No audio file" })

  let audioPath = req.file.path
  const sizeMB = (req.file.size / 1024 / 1024).toFixed(2)
  let compressed = false

  console.log(`\n🎵 Audio: ${req.file.originalname} (${sizeMB} MB)`)
  const start = Date.now()

  try {
    if (req.file.size > 25 * 1024 * 1024) {
      const compPath = audioPath.replace(/\.[^.]+$/, '_c.mp3')
      console.log(`   🔧 Compressing → mono 16kHz 64kbps...`)
      execSync(`ffmpeg -i "${audioPath}" -ac 1 -ar 16000 -b:a 64k -y "${compPath}"`, { stdio: 'pipe' })
      fs.unlinkSync(audioPath)
      audioPath = compPath
      compressed = true
      console.log(`   ✅ → ${(fs.statSync(audioPath).size / 1024 / 1024).toFixed(2)}MB`)
    }

    const buf = fs.readFileSync(audioPath)
    const blob = new Blob([buf], { type: "audio/mpeg" })
    const form = new FormData()
    form.append("file", blob, compressed ? "compressed.mp3" : req.file.originalname)
    form.append("model", WHISPER)
    form.append("response_format", "verbose_json")

    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${groqKey}` },
      body: form
    })

    fs.unlink(audioPath, () => {})
    const data = await response.json()
    if (!response.ok) throw new Error(data.error?.message || "Whisper failed")

    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    console.log(`✅ Transcribed in ${elapsed}s (${data.language}, ${data.duration?.toFixed(0)}s)`)
    console.log(`   "${(data.text || "").substring(0, 120)}..."`)

    return res.json({
      transcript: data.text, duration: data.duration,
      language: data.language, elapsed: elapsed + "s", compressed
    })
  } catch (err) {
    fs.unlink(audioPath, () => {})
    console.error(`❌ ${err.message}`)
    return res.status(500).json({ error: err.message })
  }
})


// ══════════════════════════════════════════════════════════════
// ROUTE 2: /groq/analyze — 3-MODEL PARALLEL ANALYSIS
//
// Step 1: 3 models summarize in PARALLEL (0 wait!)
// Step 2: Compare all 3 summaries → merge → FINAL
//
// MEDIUM (<35K): All 3 get full transcript
//   Model A: user's style | Model B: user's style | Model C: "capture all"
//
// LONG (35K+): Split strategy
//   Model A: full text | Model B: first half | Model C: second half
//
// No multi-pass! No 62s waits! Just 2 fast steps!
// ══════════════════════════════════════════════════════════════
app.post("/groq/analyze", optionalAuth, async (req, res) => {
  const groqKey = req.groqKey
  if (!groqKey) return res.status(400).json({ error: "Missing Groq API key. Save your key in Settings or pass x-groq-key header." })

  const { transcript, style, sourceType } = req.body
  if (!transcript) return res.status(400).json({ error: "No transcript" })

  const totalStart = Date.now()
  const tLen = transcript.length
  const src = SOURCE[sourceType] || SOURCE.other
  const isLong = tLen > 30000

  // Get style prompt builder (falls back to detailed)
  const styleKey = style === "professional" ? "professional"
    : style === "action-items" ? "action" : style === "smart-notes" ? "notes"
    : style === "email-draft" ? "email" : style === "q-and-a" ? "qa"
    : style === "mind-map" ? "mindmap" : style === "quotes" ? "quote"
    : (STYLE_PROMPTS[style] ? style : "detailed")
  const stylePrompt = STYLE_PROMPTS[styleKey](src)

  console.log("\n" + "═".repeat(60))
  console.log("🧠 3-MODEL PARALLEL ANALYSIS")
  console.log("═".repeat(60))
  console.log(`   Transcript: ${tLen} chars (~${Math.round(tLen / 4)} tokens)`)
  console.log(`   Mode:       ${isLong ? "LONG (split)" : "MEDIUM (full)"}`)
  console.log(`   Style:      ${style} (${sourceType})`)
  console.log(`   Model A:    ${tag(MODEL_A)} (30K TPM)`)
  console.log(`   Model B:    ${tag(MODEL_B)} (6K TPM)`)
  console.log(`   Model C:    ${tag(MODEL_C)} (12K TPM)`)

  try {
    let summaryA, summaryB, summaryC

    // ────────────────────────────────────────────────
    // STEP 1: 3 models summarize in PARALLEL
    // ────────────────────────────────────────────────
    console.log("\n" + "─".repeat(60))
    console.log("📝 STEP 1: 3 models summarizing in parallel...")
    const s1Start = Date.now()

    // Each model's max transcript chars (based on TPM limits)
    // Formula: (TPM - prompt_overhead - max_tokens) * 4
    const MODEL_B_MAX = 12000   // (6000 - 200 - 800) * 4 = ~12K chars
    const MODEL_C_MAX = 32000   // (12000 - 200 - 1024) * 4 = ~32K chars
    // Model A = 30K TPM → handles ~100K chars, basically unlimited

    // Split point for when models need half
    const mid = Math.floor(tLen / 2)
    const splitAt = transcript.indexOf(". ", mid) + 2 || mid
    const firstHalf  = transcript.substring(0, splitAt)
    const secondHalf = transcript.substring(splitAt)

    if (!isLong) {
      // ── MEDIUM MODE ──
      // Model A: always full | Model B: full or half | Model C: full or half
      const bNeedsSplit = tLen > MODEL_B_MAX
      const cNeedsSplit = tLen > MODEL_C_MAX

      console.log(`   ├─ [A] ${tag(MODEL_A)}: full text (${tLen} chars)`)
      console.log(`   ├─ [B] ${tag(MODEL_B)}: ${bNeedsSplit ? `first half (${firstHalf.length} chars)` : `full text`}`)
      console.log(`   └─ [C] ${tag(MODEL_C)}: ${cNeedsSplit ? `full text capture-all` : `full text capture-all`}`)

      // Model A+B: user's style prompt
      const promptA = `${stylePrompt}\n\nTRANSCRIPT:\n"""\n${transcript}\n"""\n\nInclude all names, numbers, decisions, action items. Use clean markdown.`

      const textForB = bNeedsSplit ? firstHalf : transcript
      const promptB = bNeedsSplit
        ? `Summarize this FIRST PART of a ${src}. ${stylePrompt}\n\nTRANSCRIPT (Part 1):\n"""\n${textForB}\n"""\n\nCapture every detail.`
        : promptA

      // Model C: capture-everything
      const promptC = `${buildCaptureAllPrompt(src)}\n\nTRANSCRIPT:\n"""\n${cNeedsSplit ? secondHalf : transcript}\n"""`

      ;[summaryA, summaryB, summaryC] = await Promise.all([
        callModel(groqKey, MODEL_A, promptA, 1024),
        callModel(groqKey, MODEL_B, promptB, bNeedsSplit ? 768 : 1024),
        callModel(groqKey, MODEL_C, promptC, 1024)
      ])

    } else {
      // ── LONG: Split strategy ──
      console.log(`   ├─ [A] ${tag(MODEL_A)}: FULL text (${tLen} chars)`)
      console.log(`   ├─ [B] ${tag(MODEL_B)}: FIRST half (${firstHalf.length} chars)`)
      console.log(`   └─ [C] ${tag(MODEL_C)}: SECOND half (${secondHalf.length} chars)`)

      const promptA = `${stylePrompt}\n\nTRANSCRIPT:\n"""\n${transcript}\n"""\n\nInclude all names, numbers, decisions, action items.`

      const promptB = `Summarize this FIRST PART of a ${src}. Capture every detail — names, numbers, decisions, action items.\n\n"""\n${firstHalf}\n"""`

      const promptC = `Summarize this SECOND PART of a ${src}. Capture every detail — names, numbers, decisions, action items.\n\n"""\n${secondHalf}\n"""`

      ;[summaryA, summaryB, summaryC] = await Promise.all([
        callModel(groqKey, MODEL_A, promptA, 1024),
        callModel(groqKey, MODEL_B, promptB, 768),
        callModel(groqKey, MODEL_C, promptC, 1024)
      ])
    }

    const s1Time = ((Date.now() - s1Start) / 1000).toFixed(1)

    console.log(`\n✅ All 3 done in ${s1Time}s (parallel!)`)
    console.log(`   [A] ${tag(MODEL_A)}: ${summaryA.length} chars`)
    console.log(`   [B] ${tag(MODEL_B)}: ${summaryB.length} chars`)
    console.log(`   [C] ${tag(MODEL_C)}: ${summaryC.length} chars`)

    // Log each summary preview
    console.log(`\n   ── Summary A (${tag(MODEL_A)}) ──`)
    console.log(`   "${summaryA.substring(0, 200)}..."`)
    console.log(`   ── Summary B (${tag(MODEL_B)}) ──`)
    console.log(`   "${summaryB.substring(0, 200)}..."`)
    console.log(`   ── Summary C (${tag(MODEL_C)}) ──`)
    console.log(`   "${summaryC.substring(0, 200)}..."`)


    // ────────────────────────────────────────────────
    // STEP 2: Compare all 3 → merge → FINAL
    // (only sends summaries, NOT full transcript = fits easily!)
    // ────────────────────────────────────────────────
    console.log("\n" + "─".repeat(60))
    console.log("🔗 STEP 2: Comparing & merging 3 summaries...")
    const s2Start = Date.now()

    const mergePrompt = buildMergePrompt(
      summaryA, summaryB, summaryC,
      tag(MODEL_A), tag(MODEL_B), tag(MODEL_C),
      src, styleKey, isLong
    )

    const finalSummary = await callModel(groqKey, MODEL_A, mergePrompt, 1024)
    const s2Time = ((Date.now() - s2Start) / 1000).toFixed(1)
    const totalTime = ((Date.now() - totalStart) / 1000).toFixed(1)

    console.log(`✅ Merged in ${s2Time}s`)
    console.log(`   Final: ${finalSummary.length} chars`)

    // ── Final report ──
    console.log("\n" + "═".repeat(60))
    console.log("📊 ANALYSIS COMPLETE")
    console.log("═".repeat(60))
    console.log(`   Mode:       ${isLong ? "LONG (split)" : "MEDIUM (full)"}`)
    console.log(`   Step 1:     ${s1Time}s (3 models parallel)`)
    console.log(`   Step 2:     ${s2Time}s (compare & merge)`)
    console.log(`   Total:      ${totalTime}s`)
    console.log(`   Models:     ${tag(MODEL_A)} + ${tag(MODEL_B)} + ${tag(MODEL_C)}`)
    console.log("═".repeat(60) + "\n")

    const modeStr = isLong
      ? `3-model split (A:full + B:half1 + C:half2)`
      : `3-model parallel (A+B:style + C:capture-all)`

    // Save to history if user is authenticated
    if (req.user) {
      try {
        const title = finalSummary.split("\n").find(l => l.trim()) || "Untitled"
        const preview = transcript.substring(0, 200)
        insertSummary.run(
          req.user.id, title.replace(/^#+\s*/, "").substring(0, 100),
          preview, finalSummary, style || "detailed",
          sourceType || "meeting", modeStr, totalTime + "s"
        )
        console.log(`   💾 Summary saved to history (user: ${req.user.email})`)
      } catch (e) {
        console.log(`   ⚠️ Failed to save history: ${e.message}`)
      }
    }

    return res.json({
      summary: finalSummary,
      mode: modeStr,
      models: `${tag(MODEL_A)} + ${tag(MODEL_B)} + ${tag(MODEL_C)}`,
      step1Time: s1Time + "s",
      step2Time: s2Time + "s",
      totalTime: totalTime + "s"
    })

  } catch (err) {
    console.error(`\n❌ ${err.message}`)
    return res.status(500).json({ error: err.message })
  }
})


// ══════════════════════════════════════════════════════════════
// HEALTH CHECK
// ══════════════════════════════════════════════════════════════
app.get("/health", (req, res) => {
  res.json({
    status: "running",
    models: { A: MODEL_A, B: MODEL_B, C: MODEL_C },
    whisper: WHISPER
  })
})


// ══════════════════════════════════════════════════════════════
// SERVE FRONTEND (production only)
// In production, the backend serves the built React app
// ══════════════════════════════════════════════════════════════
const distPath = path.join(__dirname, "..", "dist")
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  // SPA fallback: any non-API route → serve index.html
  app.get("/{*path}", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"))
  })
  console.log("   🌐 Serving frontend from /dist")
}


// ══════════════════════════════════════════════════════════════
// START SERVER
// ══════════════════════════════════════════════════════════════
const LISTEN_PORT = process.env.PORT || PORT
app.listen(LISTEN_PORT, "0.0.0.0", () => {
  console.log(`\n╔═══════════════════════════════════════════════════════╗`)
  console.log(`║  ✅ MeetingAI · 3-Model Parallel · Port ${LISTEN_PORT}          ║`)
  console.log(`╠═══════════════════════════════════════════════════════╣`)
  console.log(`║  /groq/transcribe → Whisper 🎤                       ║`)
  console.log(`║  /groq/analyze    → 3-Model Analysis 🧠              ║`)
  console.log(`╠═══════════════════════════════════════════════════════╣`)
  console.log(`║  Model A: ${tag(MODEL_A).padEnd(12)} (30K TPM) ⭐ primary     ║`)
  console.log(`║  Model B: ${tag(MODEL_B).padEnd(12)} (6K TPM)  🚀 fast        ║`)
  console.log(`║  Model C: ${tag(MODEL_C).padEnd(12)} (12K TPM) 💎 quality     ║`)
  console.log(`╠═══════════════════════════════════════════════════════╣`)
  console.log(`║  MEDIUM: A+B+C get full text → merge best of 3      ║`)
  console.log(`║  LONG:   A=full, B=half1, C=half2 → merge           ║`)
  console.log(`║  Just 2 steps! No waiting! Pure parallel!            ║`)
  console.log(`╚═══════════════════════════════════════════════════════╝\n`)
})