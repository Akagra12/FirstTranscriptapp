// AuthPage.jsx — Login / Signup Page
// Dark-themed, matches the existing MeetingAI design

import { useState } from "react"
import "./AuthPage.css"
import { BACKEND_URL } from "../config"

function AuthPage({ onAuth }) {
  const [isLogin, setIsLogin]   = useState(true)
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState("")

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const endpoint = isLogin ? "/auth/login" : "/auth/signup"

    try {
      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Authentication failed")

      // Save token and notify parent
      localStorage.setItem("meetingai-token", data.token)
      onAuth(data.token, data.user)

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="auth-logo">
          <span className="auth-logo-icon">🎙</span>
          <h1 className="auth-logo-title">MeetingAI</h1>
          <p className="auth-logo-sub">Universal Audio Intelligence</p>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${isLogin ? "active" : ""}`}
            onClick={() => { setIsLogin(true); setError("") }}
          >
            Log In
          </button>
          <button
            className={`auth-tab ${!isLogin ? "active" : ""}`}
            onClick={() => { setIsLogin(false); setError("") }}
          >
            Sign Up
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label">Email</label>
            <input
              className="auth-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Password</label>
            <input
              className="auth-input"
              type="password"
              placeholder={isLogin ? "Enter password" : "At least 6 characters"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button
            className="auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <span className="auth-loading">
                <span className="auth-spinner" />
                {isLogin ? "Logging in..." : "Creating account..."}
              </span>
            ) : (
              isLogin ? "Log In →" : "Create Account →"
            )}
          </button>
        </form>

        <p className="auth-footer">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            className="auth-switch"
            onClick={() => { setIsLogin(!isLogin); setError("") }}
          >
            {isLogin ? "Sign Up" : "Log In"}
          </button>
        </p>

        <p className="auth-note">
          🔒 Your API keys are encrypted with AES-256 and stored securely on the server.
        </p>

      </div>
    </div>
  )
}

export default AuthPage
