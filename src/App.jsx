// App.jsx — MeetingAI with Authentication
// ──────────────────────────────────────────────────────────
// Auth Flow:
//   1. Check localStorage for JWT token
//   2. No token → show AuthPage (login/signup)
//   3. Has token → check if API key is saved
//   4. No API key → show key setup banner
//   5. Has API key → full app ready (key auto-loaded from DB)
// ──────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from "react"
import "./App.css"

import Header       from "./components/Header"
import UploadBox    from "./components/UploadBox"
import StylePicker  from "./components/StylePicker"
import ResultCard   from "./components/ResultCard"
import HistoryPanel from "./components/HistoryPanel"
import AuthPage     from "./pages/AuthPage"
import { BACKEND_URL } from "./config"


function App() {
  const fileRef = useRef()

  // ── Auth state ──
  const [token, setToken]       = useState(null)
  const [user, setUser]         = useState(null)
  const [hasApiKey, setHasApiKey] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)

  // ── App state ──
  const [file, setFile]                   = useState(null)
  const [selectedStyle, setSelectedStyle] = useState("detailed")
  const [transcript, setTranscript]       = useState("")
  const [loading, setLoading]             = useState(false)
  const [loadingType, setLoadingType]     = useState("")
  const [result, setResult]               = useState("")
  const [error, setError]                 = useState("")
  const [sourceType, setSourceType]       = useState("meeting")
  const [timing, setTiming]              = useState("")
  const [toast, setToast]                 = useState("")

  // ── API key setup ──
  const [keyInput, setKeyInput]           = useState("")
  const [savingKey, setSavingKey]         = useState(false)
  const [historyKey, setHistoryKey]       = useState(0) // increment to refresh history


  // ══════════════════════════════════════════════
  // AUTH: Check token on load
  // ══════════════════════════════════════════════
  useEffect(() => {
    const savedToken = localStorage.getItem("meetingai-token")
    if (savedToken) {
      setToken(savedToken)
      // Decode email from JWT (base64 payload)
      try {
        const payload = JSON.parse(atob(savedToken.split(".")[1]))
        setUser({ id: payload.id, email: payload.email })
      } catch (_) {}
      checkApiKeyStatus(savedToken)
    } else {
      setAuthLoading(false)
    }
  }, [])

  async function checkApiKeyStatus(t) {
    try {
      const res = await fetch(`${BACKEND_URL}/user/api-key/status`, {
        headers: { "Authorization": `Bearer ${t}` }
      })
      if (res.ok) {
        const data = await res.json()
        setHasApiKey(data.hasApiKey)
      } else if (res.status === 401) {
        // Token expired — force re-login
        handleLogout()
        return
      }
    } catch (_) {
      // Server unreachable — keep token, try later
    }
    setAuthLoading(false)
  }

  function handleAuth(newToken, userData) {
    setToken(newToken)
    setUser(userData)
    setHasApiKey(userData.hasApiKey || false)
    setAuthLoading(false)
  }

  function handleLogout() {
    localStorage.removeItem("meetingai-token")
    setToken(null)
    setUser(null)
    setHasApiKey(false)
    setResult("")
    setTranscript("")
    setAuthLoading(false)
  }


  // ══════════════════════════════════════════════
  // API KEY SETUP
  // ══════════════════════════════════════════════
  async function saveApiKey() {
    if (!keyInput.trim()) return
    setSavingKey(true)
    try {
      const res = await fetch(`${BACKEND_URL}/user/api-key`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ groqKey: keyInput.trim() })
      })
      if (res.ok) {
        setHasApiKey(true)
        setKeyInput("")
        showToast("🔐 API key saved securely!")
      } else {
        const data = await res.json()
        setError(data.error || "Failed to save key")
      }
    } catch (err) {
      setError("Failed to save key: " + err.message)
    } finally {
      setSavingKey(false)
    }
  }

  async function removeApiKey() {
    try {
      await fetch(`${BACKEND_URL}/user/api-key`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      })
      setHasApiKey(false)
      showToast("API key removed")
    } catch (_) {}
  }


  // ══════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════
  function showToast(message) {
    setToast(message)
    setTimeout(() => setToast(""), 2500)
  }

  function authHeaders() {
    return { "Authorization": `Bearer ${token}` }
  }


  // ── File handling ──
  function handleFileChange(event) {
    const picked = event.target.files[0]
    if (!picked) return
    setError("")
    setFile(picked)
  }

  function handleDrop(event) {
    event.preventDefault()
    const dropped = event.dataTransfer.files[0]
    if (!dropped) return
    setError("")
    setFile(dropped)
  }

  function removeFile() {
    setFile(null)
    fileRef.current.value = ""
  }


  // ══════════════════════════════════════════════
  // TRANSCRIBE
  // ══════════════════════════════════════════════
  async function handleTranscribe() {
    if (!file) {
      setError("Please upload an audio file.")
      return
    }

    setError("")
    setTiming("")
    setResult("")
    setLoading(true)
    setLoadingType("transcribe")

    try {
      const formData = new FormData()
      formData.append("audio", file)

      const res = await fetch(`${BACKEND_URL}/groq/transcribe`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setTranscript(data.transcript)
      const compressNote = data.compressed ? " (auto-compressed)" : ""
      setTiming(`⚡ Transcribed in ${data.elapsed}${compressNote}`)
      showToast("Transcription complete!")

    } catch (err) {
      setError("Transcription failed: " + err.message)
    } finally {
      setLoading(false)
      setLoadingType("")
    }
  }


  // ══════════════════════════════════════════════
  // ANALYZE
  // ══════════════════════════════════════════════
  async function handleAnalyze() {
    if (!transcript.trim()) {
      setError("No transcript to analyze.")
      return
    }

    setError("")
    setResult("")
    setTiming("")
    setLoading(true)
    setLoadingType("analyze")

    try {
      const response = await fetch(`${BACKEND_URL}/groq/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          transcript,
          style: selectedStyle,
          sourceType,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Analysis failed")

      setResult(data.summary)
      setTiming(`✅ ${data.mode} — ${data.totalTime} (${data.models})`)
      setHistoryKey(k => k + 1) // refresh history panel
      showToast("Analysis complete!")

    } catch (err) {
      setError("Analysis failed: " + err.message)
    } finally {
      setLoading(false)
      setLoadingType("")
    }
  }


  // ══════════════════════════════════════════════
  // Load summary from history
  // ══════════════════════════════════════════════
  function handleLoadFromHistory(summary, style, srcType) {
    setResult(summary)
    setSelectedStyle(style || "detailed")
    setSourceType(srcType || "meeting")
    setTiming("📜 Loaded from history")
    showToast("Summary loaded from history")
  }


  // ══════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════

  // Loading auth state
  if (authLoading) {
    return (
      <div className="app auth-loading-screen">
        <span className="auth-loading-icon">🎙</span>
        <p className="auth-loading-text">Loading MeetingAI...</p>
      </div>
    )
  }

  // Not logged in → Auth page
  if (!token) {
    return <AuthPage onAuth={handleAuth} />
  }


  return (
    <div className="app">
      <Header />

      {/* User bar */}
      <div className="user-bar">
        <span className="user-email">👤 {user?.email || "User"}</span>
        <div className="user-actions">
          {hasApiKey && (
            <button className="user-btn key-btn" onClick={removeApiKey}>
              🔑 Change Key
            </button>
          )}
          <button className="user-btn logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <main className="main">

        {/* API Key Setup (shown only if no key saved) */}
        {!hasApiKey && (
          <div className="setup-card">
            <h3 className="setup-title">🔑 Set Up Your Groq API Key</h3>
            <p className="setup-desc">
              Get a free key from{" "}
              <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer">
                console.groq.com
              </a>
              . Your key is encrypted and stored securely — you only need to enter it once.
            </p>
            <div className="setup-input-row">
              <input
                className="setup-input"
                type="password"
                placeholder="gsk_..."
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
              />
              <button
                className="setup-save-btn"
                onClick={saveApiKey}
                disabled={savingKey || !keyInput.trim()}
              >
                {savingKey ? "Saving..." : "Save Key"}
              </button>
            </div>
          </div>
        )}

        {/* Main app content (only if key is set) */}
        {hasApiKey && (
          <>
            {/* Upload */}
            <p className="section-label">Upload audio file</p>
            <UploadBox
              file={file}
              fileRef={fileRef}
              onFileChange={handleFileChange}
              onDrop={handleDrop}
              onRemove={removeFile}
            />

            {/* Transcribe button */}
            {file && (
              <button
                className="transcribe-btn"
                onClick={handleTranscribe}
                disabled={loading}
              >
                {loading && loadingType === "transcribe" ? (
                  <span className="loading-row">
                    <span className="spinner" />
                    Transcribing with Groq Whisper...
                  </span>
                ) : (
                  "🎤 Transcribe with Groq Whisper"
                )}
              </button>
            )}

            {timing && <p className="timing-info">{timing}</p>}

            {/* Transcript */}
            <p className="section-label">Transcript</p>
            <textarea
              className="transcript-box"
              placeholder="Transcript will appear here after transcription, or paste your own text..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={transcript ? 8 : 4}
            />

            {/* Source type + Style picker */}
            <p className="section-label">What type of audio is this?</p>
            <StylePicker
              selected={selectedStyle}
              onSelect={setSelectedStyle}
              sourceType={sourceType}
              onSourceChange={setSourceType}
            />

            {error && <div className="error-box">{error}</div>}

            {/* Analyze button */}
            <button
              className="run-btn"
              onClick={handleAnalyze}
              disabled={loading || !transcript.trim()}
            >
              {loading && loadingType === "analyze" ? (
                <span className="loading-row">
                  <span className="spinner" />
                  3 models analyzing in parallel...
                </span>
              ) : (
                "🔍 Analyze & Summarize (3-model) →"
              )}
            </button>

            <p className="method-hint">
              {transcript.trim()
                ? "3 models run simultaneously → compare → merge best of all (check terminal)"
                : "Upload audio and transcribe, or paste text to get started"
              }
            </p>

            {/* Result */}
            {result && (
              <ResultCard
                result={result}
                selectedStyle={selectedStyle}
                onCopy={showToast}
              />
            )}

            {/* History */}
            <HistoryPanel
              token={token}
              onLoadSummary={handleLoadFromHistory}
              refreshKey={historyKey}
            />
          </>
        )}

      </main>

      {/* Toast notification */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

export default App