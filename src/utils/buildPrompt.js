// buildPrompt.js — Frontend data exports
// ────────────────────────────────────────────────────────────
// NOTE: Prompt building is now handled by backend/prompts.js.
// This file only exports the data structures needed by React
// components (StylePicker, ResultCard, etc.).
// ────────────────────────────────────────────────────────────


// ── 10 source types with icons and descriptions ──
export const sourceTypes = [
  { id: "meeting",      label: "Meeting",      icon: "🤝", desc: "Syncs, standups, 1:1s" },
  { id: "lecture",      label: "Lecture",      icon: "🎓", desc: "Classes, tutorials, talks" },
  { id: "podcast",      label: "Podcast",      icon: "🎙️", desc: "Episodes, shows" },
  { id: "interview",    label: "Interview",    icon: "💼", desc: "Job, media, research" },
  { id: "presentation", label: "Presentation", icon: "📊", desc: "Pitches, demos, keynotes" },
  { id: "webinar",      label: "Webinar",      icon: "🖥️", desc: "Online events, workshops" },
  { id: "brainstorm",   label: "Brainstorm",   icon: "💡", desc: "Ideation, planning" },
  { id: "voicenote",    label: "Voice Note",   icon: "🎤", desc: "Memos, dictation" },
  { id: "debate",       label: "Discussion",   icon: "🗣️", desc: "Panels, debates, groups" },
  { id: "other",        label: "Other",        icon: "🎵", desc: "Any audio" },
]


// ── 15 summary styles with icons and descriptions ──
export const styleLabels = {
  detailed:     { label: "Detailed",     icon: "📋", desc: "Complete — nothing missed" },
  professional: { label: "Executive",    icon: "📊", desc: "Structured briefing" },
  casual:       { label: "Casual",       icon: "😊", desc: "Quick friendly recap" },
  tldr:         { label: "TL;DR",        icon: "⚡", desc: "2–3 sentence takeaway" },
  action:       { label: "Action Items", icon: "✅", desc: "Tasks, owners & deadlines" },
  notes:        { label: "Smart Notes",  icon: "📝", desc: "Study-ready notes" },
  chapters:     { label: "Chapters",     icon: "🎬", desc: "Topic-by-topic breakdown" },
  sentiment:    { label: "Sentiment",    icon: "🎭", desc: "Mood, tone & dynamics" },
  quote:        { label: "Key Quotes",   icon: "💎", desc: "Most important statements" },
  qa:           { label: "Q&A Extract",  icon: "❓", desc: "Questions & answers" },
  decisions:    { label: "Decisions",    icon: "⚖️", desc: "What was decided & why" },
  flashcards:   { label: "Flashcards",   icon: "🃏", desc: "Study cards" },
  email:        { label: "Email Draft",  icon: "📧", desc: "Follow-up email" },
  mindmap:      { label: "Mind Map",     icon: "🧠", desc: "Hierarchical topic tree" },
  timeline:     { label: "Timeline",     icon: "⏱️", desc: "Chronological flow" },
}


// ── Which styles are available for each source type ──
export const stylesBySource = {
  meeting:      ["detailed","professional","action","decisions","email","casual","tldr","sentiment","timeline","mindmap","qa"],
  lecture:      ["detailed","notes","flashcards","chapters","qa","tldr","mindmap","timeline"],
  podcast:      ["detailed","chapters","casual","quote","tldr","notes","qa","mindmap","timeline"],
  interview:    ["detailed","quote","qa","sentiment","professional","casual","tldr","notes"],
  presentation: ["detailed","professional","notes","action","decisions","email","tldr","mindmap"],
  webinar:      ["detailed","professional","notes","qa","action","chapters","email","tldr"],
  brainstorm:   ["detailed","mindmap","action","decisions","casual","tldr","timeline"],
  voicenote:    ["detailed","tldr","action","email","casual","notes"],
  debate:       ["detailed","sentiment","quote","qa","decisions","chapters","casual","tldr"],
  other:        ["detailed","casual","tldr","notes","chapters","action","mindmap"],
}