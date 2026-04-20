// Header.jsx — App header with branding

import "./Header.css"

function Header() {
  return (
    <header className="header">
      <div className="header-left">
        <span className="header-logo">🎙</span>
        <div>
          <h1 className="header-title">MeetingAI</h1>
          <p className="header-sub">Universal Audio Intelligence · 3-Model Parallel</p>
        </div>
      </div>
      <div className="header-badge">
        ✦ 3-Model Analysis
      </div>
    </header>
  )
}

export default Header
