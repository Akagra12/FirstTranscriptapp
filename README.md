# 🧠 MeetingAI — Universal Audio Intelligence Platform

> **Transform any audio into structured, actionable intelligence — powered by Groq Whisper + Gemini + Llama.**

MeetingAI is a React-based web application that takes audio files or text transcripts and produces rich, context-aware summaries. It uses a **hybrid AI engine** — combining Groq's speed with Gemini's large context window for optimal results.

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🎤 **Groq Whisper Transcription** | Fast audio-to-text via Groq's Whisper API |
| 🧠 **Hybrid AI Analysis** | Groq Llama + Gemini work together for accurate summaries |
| 📊 **15 Summary Styles** | Detailed, Executive, Action Items, Flashcards, Mind Map, and more |
| 🎯 **10 Source Types** | Meeting, Lecture, Podcast, Interview, and 6 more |
| 📝 **Markdown Rendering** | Rich formatted output with tables, headings, lists |
| 📥 **Download & Copy** | Export summaries as `.md` files or copy to clipboard |
| 📡 **Live Progress** | SSE-based real-time progress tracking (Pass 1/3, 2/3, 3/3) |
| 🔑 **Dual API Keys** | Groq + Gemini keys saved in localStorage |
| ⚡ **Smart Mode Selection** | Auto-picks the best AI engine based on transcript size |

---

## 🏗️ Architecture

```
meeting-app/
├── src/                          # React frontend (Vite)
│   ├── App.jsx                   # Main app — dual keys, SSE progress, toast
│   ├── App.css                   # All app styles + progress bar + toast
│   ├── index.css                 # Global resets
│   ├── main.jsx                  # React entry point
│   ├── components/
│   │   ├── Header.jsx / .css     # App header with branding
│   │   ├── UploadBox.jsx / .css  # Drag-and-drop audio upload
│   │   ├── StylePicker.jsx / .css# Source type + summary style selector
│   │   ├── ApiKeyInput.jsx / .css# Reusable API key input (Groq & Gemini)
│   │   └── ResultCard.jsx / .css # Markdown-rendered result + copy + download
│   └── utils/
│       └── buildPrompt.js        # Frontend data exports (sourceTypes, styles)
├── backend/
│   ├── server.js                 # Hybrid AI engine (Groq + Gemini + SSE)
│   ├── prompts.js                # Rich prompt templates for all 15 styles
│   └── package.json              # Backend dependencies
├── index.html                    # Vite HTML entry
├── vite.config.js                # Vite configuration
├── package.json                  # Frontend dependencies
└── README.md                     # ← You are here
```

---

## 🚀 How It Works

### Hybrid AI Strategy

The app uses a **smart hybrid approach** to bypass Groq's strict TPM (tokens per minute) limits:

```
NORMAL MODE (transcript fits in Groq's TPM limit):
  Pass 1: Groq Llama    → Summarize (fast, ~2s)
  Pass 2: Gemini         → Compare/verify (large context, no TPM issues)
  Pass 3: Groq Llama    → Refine if accuracy < 85%

LARGE MODE (transcript exceeds Groq's limit):
  Pass 1: Gemini         → Summarize (1M+ token context window)
  Pass 2: Gemini         → Compare/verify accuracy
  Pass 3: Gemini         → Refine if accuracy < 70%

GROQ-ONLY FALLBACK (no Gemini key provided):
  Same as old 3-pass with 62-second TPM waits
```

### Why This Works

| Engine | Strength | Used For |
|--------|----------|----------|
| **Groq Llama** | Blazing fast responses (~2s) | Quick summarization & refinement |
| **Gemini** | 1M+ token context window, generous free tier | Heavy comparison step, large transcripts |
| **Groq Whisper** | Fast, accurate speech-to-text | Audio transcription |

**Result:** Analysis that took 3-4 minutes (with TPM waits) now takes **10-30 seconds** in hybrid mode.

---

## 📦 Setup & Installation

### Prerequisites
- **Node.js** 18+ installed
- **Groq API Key** — get one free at [console.groq.com](https://console.groq.com)
- **Gemini API Key** — get one free at [Google AI Studio](https://aistudio.google.com/apikey)

### Frontend

```bash
cd meeting-app
npm install
npm run dev
```

App runs at **http://localhost:5173**

### Backend (Required)

```bash
cd backend
npm install
node server.js
```

Backend runs at **http://localhost:3001**

---

## 🎯 Source Types & Available Styles

| Source | Styles Available |
|--------|-----------------|
| 🤝 Meeting | Detailed, Executive, Action Items, Decisions, Email Draft, Casual, TL;DR, Sentiment, Timeline, Mind Map, Q&A |
| 🎓 Lecture | Detailed, Smart Notes, Flashcards, Chapters, Q&A, TL;DR, Mind Map, Timeline |
| 🎙️ Podcast | Detailed, Chapters, Casual, Key Quotes, TL;DR, Smart Notes, Q&A, Mind Map, Timeline |
| 💼 Interview | Detailed, Key Quotes, Q&A, Sentiment, Executive, Casual, TL;DR, Smart Notes |
| 📊 Presentation | Detailed, Executive, Smart Notes, Action Items, Decisions, Email Draft, TL;DR, Mind Map |
| 🖥️ Webinar | Detailed, Executive, Smart Notes, Q&A, Action Items, Chapters, Email Draft, TL;DR |
| 💡 Brainstorm | Detailed, Mind Map, Action Items, Decisions, Casual, TL;DR, Timeline |
| 🎤 Voice Note | Detailed, TL;DR, Action Items, Email Draft, Casual, Smart Notes |
| 🗣️ Discussion | Detailed, Sentiment, Key Quotes, Q&A, Decisions, Chapters, Casual, TL;DR |
| 🎵 Other | Detailed, Casual, TL;DR, Smart Notes, Chapters, Action Items, Mind Map |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19 + Vite 8 |
| **AI — Transcription** | Groq Whisper (whisper-large-v3-turbo) |
| **AI — Summarization** | Groq Llama (llama-3.1-8b-instant) + Google Gemini (gemini-2.0-flash) |
| **Styling** | Vanilla CSS with dark theme |
| **Markdown** | react-markdown + remark-gfm |
| **Progress** | Server-Sent Events (SSE) |
| **Backend** | Express.js (Node) |

---

## 🔑 API Key Setup

| Key | Where to Get | Purpose |
|-----|-------------|---------|
| Groq | [console.groq.com](https://console.groq.com) | Whisper transcription + fast Llama summarization |
| Gemini | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | Comparison/verification + large transcript handling |

Both keys are **saved locally** in your browser's localStorage. They are **never sent to any third-party server** — only to the official Groq and Gemini APIs via your local backend.

---

## 📄 License

This project is for personal/educational use.

---

**Built with ❤️ using React, Vite, Groq, and Google Gemini**
