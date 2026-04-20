// ResultCard.jsx — Displays AI summary with markdown rendering
//
// Props:
//   result        — the summary text from AI
//   selectedStyle — which style was used
//   onCopy        — callback function for toast notification

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import "./ResultCard.css"
import { styleLabels } from "../utils/buildPrompt"

function ResultCard({ result, selectedStyle, onCopy }) {
  const styleObj = styleLabels[selectedStyle]

  function copyResult() {
    navigator.clipboard.writeText(result)
    if (onCopy) onCopy("📋 Copied to clipboard!")
  }

  function downloadResult() {
    const blob = new Blob([result], { type: "text/markdown" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href     = url
    a.download = `${styleObj.label.toLowerCase().replace(/\s+/g, "_")}_summary.md`
    a.click()
    URL.revokeObjectURL(url)
    if (onCopy) onCopy("📥 Downloaded!")
  }

  return (
    <div className="result-card">

      <div className="result-header">
        <div className="result-title-row">
          <span className="result-icon">{styleObj.icon}</span>
          <div>
            <h2 className="result-title">{styleObj.label} Summary</h2>
          </div>
        </div>
        <div className="result-actions">
          <button className="action-btn copy-btn" onClick={copyResult}>
            📋 Copy
          </button>
          <button className="action-btn download-btn" onClick={downloadResult}>
            📥 Download
          </button>
        </div>
      </div>

      <div className="result-divider" />

      <div className="result-body markdown-content">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {result}
        </ReactMarkdown>
      </div>

    </div>
  )
}

export default ResultCard