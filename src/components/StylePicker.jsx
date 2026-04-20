// StylePicker.jsx
// Two-section picker:
//   Section 1 — What type of audio is this? (source type)
//   Section 2 — How should it be summarized? (style, filtered by source)

import { sourceTypes, stylesBySource, styleLabels } from "../utils/buildPrompt"
import "./StylePicker.css"

function StylePicker({ selected, onSelect, sourceType, onSourceChange }) {

  // When user changes source type → auto-pick the first valid style
  function handleSourceChange(id) {
    onSourceChange(id)
    onSelect(stylesBySource[id][0])
  }

  const availableStyles = stylesBySource[sourceType] || []

  return (
    <div className="picker-wrapper">

      {/* ── SECTION 1: Source Type ── */}
      <div className="source-grid">
        {sourceTypes.map((s) => (
          <button
            key={s.id}
            className={sourceType === s.id ? "source-card selected" : "source-card"}
            onClick={() => handleSourceChange(s.id)}
            title={s.desc}
          >
            <span className="source-icon">{s.icon}</span>
            <span className="source-name">{s.label}</span>
            <span className="source-desc">{s.desc}</span>
          </button>
        ))}
      </div>

      <p className="picker-label">How do you want it summarized?</p>

      {/* ── SECTION 2: Summary Style (filtered by source type) ── */}
      <div className="style-grid">
        {availableStyles.map((id) => {
          const s = styleLabels[id]
          return (
            <button
              key={id}
              className={selected === id ? "style-card selected" : "style-card"}
              onClick={() => onSelect(id)}
              title={s.desc}
            >
              <span className="style-icon">{s.icon}</span>
              <span className="style-name">{s.label}</span>
              <span className="style-desc">{s.desc}</span>
            </button>
          )
        })}
      </div>

    </div>
  )
}

export default StylePicker