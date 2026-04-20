// HistoryPanel.jsx — Summary History Section
// Shows past summaries, click to load

import { useState, useEffect } from "react"
import "./HistoryPanel.css"
import { BACKEND_URL } from "../config"

function HistoryPanel({ token, onLoadSummary, refreshKey }) {
  const [summaries, setSummaries] = useState([])
  const [loading, setLoading]     = useState(false)
  const [expanded, setExpanded]   = useState(false)

  useEffect(() => {
    if (token) loadHistory()
  }, [token, refreshKey])

  async function loadHistory() {
    setLoading(true)
    try {
      const res = await fetch(`${BACKEND_URL}/user/summaries`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) setSummaries(data.summaries || [])
    } catch (err) {
      console.error("Failed to load history:", err)
    } finally {
      setLoading(false)
    }
  }

  async function loadFull(id) {
    try {
      const res = await fetch(`${BACKEND_URL}/user/summaries/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok && data.summary) {
        onLoadSummary(data.summary.summary, data.summary.style, data.summary.source_type)
      }
    } catch (err) {
      console.error("Failed to load summary:", err)
    }
  }

  async function deleteSummary(id, e) {
    e.stopPropagation()
    try {
      await fetch(`${BACKEND_URL}/user/summaries/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      })
      setSummaries(prev => prev.filter(s => s.id !== id))
    } catch (err) {
      console.error("Failed to delete:", err)
    }
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now - d
    if (diff < 60000) return "Just now"
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
    return d.toLocaleDateString()
  }

  if (summaries.length === 0 && !loading) return null

  return (
    <div className="history-panel">
      <button
        className="history-toggle"
        onClick={() => setExpanded(!expanded)}
      >
        <span>📜 History ({summaries.length})</span>
        <span className={`history-arrow ${expanded ? "open" : ""}`}>▾</span>
      </button>

      {expanded && (
        <div className="history-list">
          {loading && <p className="history-loading">Loading...</p>}
          {summaries.map(s => (
            <div
              key={s.id}
              className="history-item"
              onClick={() => loadFull(s.id)}
            >
              <div className="history-item-top">
                <span className="history-title">{s.title || "Untitled"}</span>
                <button
                  className="history-delete"
                  onClick={(e) => deleteSummary(s.id, e)}
                  title="Delete"
                >
                  ✕
                </button>
              </div>
              <div className="history-meta">
                <span className="history-style">{s.style}</span>
                <span className="history-dot">·</span>
                <span className="history-source">{s.source_type}</span>
                <span className="history-dot">·</span>
                <span className="history-time">{formatDate(s.created_at)}</span>
                {s.total_time && (
                  <>
                    <span className="history-dot">·</span>
                    <span className="history-elapsed">{s.total_time}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default HistoryPanel
