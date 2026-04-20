// prompts.js — Optimized prompts for 3-Model Architecture
// ══════════════════════════════════════════════════════════
// Token-efficient but detailed. Each prompt captures everything.
// Used by server.js for the 3-model parallel pipeline.
// ══════════════════════════════════════════════════════════

// ── Source context (what kind of audio) ──
const SOURCE = {
  meeting:      "business meeting",
  podcast:      "podcast episode",
  lecture:      "educational lecture",
  interview:    "interview",
  webinar:      "webinar/workshop",
  presentation: "presentation/demo",
  brainstorm:   "brainstorming session",
  voicenote:    "voice note/memo",
  debate:       "panel discussion/debate",
  other:        "audio recording",
}


// ── Style prompts: Models A & B use these (user's chosen style) ──
// Each is minimal (~100-150 tokens of instructions) but captures everything
const STYLE_PROMPTS = {

  detailed: (src) => `Create a COMPREHENSIVE summary of this ${src}.

## 📋 Overview
3-5 sentences: what it was about, who was involved, purpose.

## 🔑 Key Topics
For each major topic:
### [Topic Name]
- What was discussed, who said it, key data/numbers

## 📌 Important Details
All names, dates, numbers, URLs, tools, examples mentioned.

## 💡 Key Insights
Top 3-5 insights and why each matters.

## ❓ Open Questions
Unresolved questions or things needing follow-up.`,


  professional: (src) => `Create an executive briefing of this ${src}.

## 📊 Executive Summary
2-3 sentences on outcomes and business impact.

## 🎯 Key Highlights
3-5 bullets — concise, action-oriented, include metrics.

## ✅ Decisions Made
Each decision with rationale and owner.

## ⚠️ Risks & Concerns
Issues raised and potential impact.

## 🎬 Next Steps
Action items with owners and deadlines.`,


  casual: (src) => `Write a quick, friendly recap of this ${src} — like texting a friend who missed it.

**Here's what you missed:**
• [main points as short bullets]

**The vibe:** [one line on tone/energy]

**Don't forget:**
• [tasks or urgent follow-ups]

Simple language, no jargon. Breezy but complete.`,


  tldr: (src) => `Write the shortest possible summary.

**⚡ TL;DR**
[2-3 sentences. What happened? Key outcome?]

**One-liner:** [the entire ${src} in under 15 words]`,


  action: (src) => `Extract EVERY action item and task from this ${src}.

## ✅ Action Items

### 🔴 High Priority
- **[Person]** → [task] → **Due:** [date or ASAP]

### 🟡 Medium Priority
- **[Person]** → [task] → **Due:** [date or TBD]

### 🟢 Low Priority
- **[Person]** → [task] → **Due:** [date]

### 🔄 Follow-ups
[Recurring or scheduled items]

No person → "Team". No deadline → "TBD". Include implicit tasks.`,


  notes: (src) => `Create clean study/reference notes from this ${src}.

## 📝 Notes
### 📌 [Major Topic]
- **Key point:** [idea]
  - Supporting detail or example
[Repeat for all topics]

## ⭐ Key Terms
- **[Term]** — [definition]

## 💡 Key Takeaways
1. [most important] 2. [second] 3. [third]

## 📚 References
[Any books, tools, URLs mentioned]

Bold important terms on first use.`,


  chapters: (src) => `Break this ${src} into logical chapters (3-12).

## 🎬 Chapters

### Chapter 1 — [Title]
**Tags:** [topic tags]
[2-3 sentence summary]
- Key points

[Repeat for all chapters]

## 📊 Overview Table
| # | Chapter | Key Focus | Importance |
|---|---------|-----------|------------|

**Most important:** Chapter [X] — [why]`,


  sentiment: (src) => `Analyze the emotional tone and dynamics of this ${src}.

## 🎭 Sentiment Analysis

| Aspect | Rating | Notes |
|--------|--------|-------|
| Mood | [Positive/Neutral/Negative] | [why] |
| Energy | [High/Medium/Low] | |
| Agreement | [High/Medium/Low] | |

### 🎢 Emotional Arc
Opening → Middle → Closing: how did mood shift?

### 🔥 Key Emotional Moments (3-5)
- **[Moment]:** [what happened] → [emotion]

### 👥 Speaker Dynamics
Who led? Tension? Agreements/disagreements?

### 📝 Vibe: [one vivid sentence]`,


  quote: (src) => `Extract 5-7 most powerful quotes from this ${src}.

## 💎 Key Quotes

💬 **"[exact quote]"**
— *[Speaker]*
> Why it matters: [1-2 sentences]

[Repeat for all quotes]

### ⭐ Quote of the Session
💬 **"[most impactful]"** — *[Speaker]*
> Stands out because: [why]`,


  qa: (src) => `Extract ALL questions and answers from this ${src}.

## ❓ Q&A

### Answered
**Q: [question]** — *[who asked]*
> **A:** [answer] — *[who answered]*

### ⚠️ Unanswered
1. **[question]** — *[who]* — Status: Deferred/Unanswered

### 🤔 Implied Questions
[Questions the discussion raised but nobody asked]

Total: [n] | Answered: [n] | Unanswered: [n]`,


  decisions: (src) => `Extract EVERY decision from this ${src}.

## ⚖️ Decisions

### Decision 1: [title]
- **What:** [decision]
- **Why:** [rationale]
- **Owner:** [who]
- **Status:** Final / Tentative / Needs approval

### 🔄 Pending
1. [topic] — needs deciding — Blocker: [why]

Total: [n] | Final: [n] | Pending: [n]`,


  flashcards: (src) => `Create 10-20 study flashcards from this ${src}.

## 🃏 Flashcards

### Card 1
**Q:** [question]
**A:** [answer]
*Difficulty: Easy/Medium/Hard*

[Repeat 10-20 cards. Mix factual + conceptual. Self-contained answers.]

## 💡 Study Tips
Focus on: 1. [hardest topic] 2. [key relationship] 3. [easy to forget]`,


  email: (src) => `Write a professional follow-up email for this ${src}.

## 📧 Email Draft

**Subject:** [specific subject]

Hi everyone,

[Opening — reference the ${src}]

**Key Points:**
• [point]

**Decisions:**
1. [decision]

**Action Items:**
| Owner | Task | Deadline |
|-------|------|----------|
| [name] | [task] | [date] |

**Next Steps:** [what happens next]

Best regards,
[Your name]`,


  mindmap: (src) => `Create a hierarchical mind map of this ${src} (3+ levels deep).

## 🧠 Mind Map

\`\`\`
[Main Theme]
├── [Topic 1]
│   ├── [Subtopic 1a]
│   │   ├── [Detail]
│   │   └── [Detail]
│   └── [Subtopic 1b]
├── [Topic 2]
│   ├── [Subtopic 2a]
│   └── [Subtopic 2b]
└── [Topic 3]
\`\`\`

### 🔗 Connections
- [Topic A] ↔ [Topic B]: [relationship]

### 💡 Hidden Themes
Patterns: 1. [theme]`,


  timeline: (src) => `Create a chronological timeline of this ${src}.

## ⏱️ Timeline

### Phase 1: Opening
📍 **[Event]** — Who: [names] — What happened

⬇️

### Phase 2: [Name]
📍 **[Event]** — Key development

⬇️

[All phases chronologically]

### Final Phase: Closing
📍 **[Conclusions and commitments]**

## 🔄 Turning Points
1. **[moment]** — what changed and why`,
}


// ── Model C's "Capture Everything" prompt ──
// Used alongside A & B to ensure nothing is missed
function buildCaptureAllPrompt(src) {
  return `Extract EVERY important detail from this ${src}:
- All names mentioned (people, companies, products)
- All numbers (budgets, dates, percentages, metrics, deadlines)
- All decisions made (what, why, who approved)
- All action items (task, owner, deadline)
- All key statements and quotes
- All questions raised (answered or not)
- All problems/risks discussed
- All tools, links, references mentioned

Be thorough. Miss NOTHING. List everything even if it seems minor.`
}


// ── Merge prompt: combines 3 model outputs into final ──
function buildMergePrompt(summaryA, summaryB, summaryC, tagA, tagB, tagC, src, styleDesc, isLong) {
  return `You have 3 AI summaries of the same ${src} from different models. Each captured different details.

SUMMARY A (${tagA}):
"""
${summaryA}
"""

SUMMARY B (${tagB}):
"""
${summaryB}
"""

SUMMARY C (${tagC}${isLong ? " — covered a different section" : " — used capture-everything approach"}):
"""
${summaryC}
"""

Your job:
1. Compare all 3 — what did each capture that others missed?
2. Produce ONE FINAL ${styleDesc.toUpperCase()} that merges the BEST of all 3
3. Include EVERY unique detail — names, numbers, dates, decisions, action items
4. Remove duplicates, organize clearly
5. End with: [Merged from 3 AI perspectives]

Output only the final merged summary.`
}


module.exports = {
  SOURCE,
  STYLE_PROMPTS,
  buildCaptureAllPrompt,
  buildMergePrompt,
}
