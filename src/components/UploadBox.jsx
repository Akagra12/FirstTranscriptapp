// UploadBox.jsx
// Handles file upload by clicking OR drag and drop
//
// Props it receives from App.jsx:
//   file         = the current file (or null if none)
//   fileRef      = connects to the hidden input element
//   onFileChange = function to call when file is picked
//   onDrop       = function to call when file is dropped
//   onRemove     = function to call when ✕ is clicked

import "./UploadBox.css"

function UploadBox({ file, fileRef, onFileChange, onDrop, onRemove }) {
  return (
    <div>

      {/* The visible upload area */}
      <div
        className={`upload-box ${file ? "has-file" : ""}`}
        onClick={() => fileRef.current.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >

        {/* Show this when NO file is selected */}
        {!file && (
          <div className="upload-empty">
            <div className="upload-icon-circle">⬆</div>
            <p className="upload-text">Drop your audio file here</p>
            <p className="upload-or">or <span>click to browse</span></p>
            <div className="upload-formats">mp3 · wav · m4a · ogg</div>
          </div>
        )}

        {/* Show this when a file IS selected */}
        {file && (
          <div className="file-info">
            <div className="file-icon">🎵</div>
            <div className="file-details">
              <span className="file-name">{file.name}</span>
              <span className="file-size">
                {(file.size / 1024 / 1024).toFixed(2)} MB · Ready
              </span>
            </div>
            <button
              className="remove-btn"
              onClick={(e) => {
                e.stopPropagation() // stops click going to parent box
                onRemove()
              }}
            >
              ✕
            </button>
          </div>
        )}

      </div>

      {/* Hidden file input — triggered when box is clicked */}
      <input
        type="file"
        accept="audio/*"
        ref={fileRef}
        style={{ display: "none" }}
        onChange={onFileChange}
      />

    </div>
  )
}

export default UploadBox
