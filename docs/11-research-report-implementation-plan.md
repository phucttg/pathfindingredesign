# Implementation Plan: Deep Research Report → Codebase

> Generated from `deep-research-report (1).md`  
> **Language:** Vietnamese throughout the app  
> **Scope:** All 8 sections per algorithm + comparison table  
> **Date:** 2026-02-25

---

## Table of Contents

1. [Overview](#1-overview)
2. [Report Sections → Codebase Mapping](#2-report-sections--codebase-mapping)
3. [Detailed File-by-File Changes](#3-detailed-file-by-file-changes)
4. [New Files to Create](#4-new-files-to-create)
5. [Comparison Table Feature](#5-comparison-table-feature)
6. [Implementation Order (Suggested)](#6-implementation-order-suggested)
7. [Gap Analysis: What's Missing vs What Already Exists](#7-gap-analysis)
8. [Risk / Considerations](#8-risk--considerations)

---

## 1. Overview

The research report provides **8 information cards** for the algorithms already in the app:

| # | Algorithm | Report Key | Codebase Key(s) |
|---|-----------|-----------|-----------------|
| 1 | Dijkstra | Dijkstra | `dijkstra` |
| 2 | A* Search | A* | `astar` |
| 3 | Greedy Best-first | Greedy | `greedy` |
| 4 | Swarm | Swarm | `CLA` (heuristic=`manhattanDistance`), UI key `swarm` |
| 5 | Convergent Swarm | Convergent Swarm | `CLA` (heuristic=`extraPoweredManhattanDistance`), UI key `convergentSwarm` |
| 6 | Bidirectional Swarm | Bidirectional Swarm | `bidirectional` |
| 7 | BFS | BFS | `bfs` |
| 8 | DFS | DFS | `dfs` |

Each card has **8 sections**: Badges, One-liner, How it works, Pseudocode, Key insight, Characteristics, Common Pitfalls, Visual behavior.

---

## 2. Report Sections → Codebase Mapping

### Per-algorithm info card sections

| Report Section | Where It Maps in the Codebase | Current State | Action Needed |
|---|---|---|---|
| **A) Badges** (weighted/optimal/complete/heuristic/guarantees) | `algorithmDescriptions.js` → `category`, `guaranteesOptimal`, `complete`, `badges[]` | **✅ Implemented** – has `category`, `guaranteesOptimal`, `complete` (boolean/string), and `badges[]` array | Translate labels to Vietnamese if needed. |
| **B) One-liner** | `algorithmDescriptions.js` → `shortDescription` | **Exists** (English) | **Replace** with Vietnamese one-liners from report |
| **C) How it works** | `algorithmDescriptions.js` → `howItWorks[]` | **Exists** (English, simplified) | **Replace/enrich** with the fuller Vietnamese steps from report |
| **D) Pseudocode** | `algorithmDescriptions.js` → `pseudocode[]` | **Exists** (abbreviated English) | **Replace** with the detailed pseudocode from report (keep as text, Vietnamese comments) |
| **E) Key insight** | `algorithmDescriptions.js` → `keyInsight` | **Exists** (English, 1 sentence) | **Replace** with Vietnamese version from report |
| **F) Characteristics table** | `algorithmDescriptions.js` → `characteristics{}` | **Partial** – has `dataStructure`, `timeComplexity`, `usesHeuristic`, `selectionRule` | Add missing fields: `spaceComplexity`, `bestFor`, `weakness`, `notesOnGridWeights`. Translate all to Vietnamese. |
| **G) Common Pitfalls** | **Does not exist** in codebase | **Missing** | Add new field `pitfalls[]` to each algorithm object |
| **H) Visual behavior** | **Does not exist** in codebase | **Missing** | Add new field `visualBehavior[]` to each algorithm object |

### Cross-algorithm comparison table

| Report Section | Where It Maps | Current State | Action Needed |
|---|---|---|---|
| **Comparison table** (8 algorithms × 7 columns) | No equivalent UI | **Missing** | New feature: comparison modal/page |
| **"Cách chọn nhanh"** (quick selection guide) | No equivalent UI | **Missing** | Can be part of the comparison view or a tooltip |

### Supporting context from the report

| Report Section | Where It Maps | Current State | Action Needed |
|---|---|---|---|
| **Notation glossary** (g, h, f, openSet, closedSet, prev) | Insight panel tooltips in `board.js` → `INSIGHT_TOOLTIP_COPY` | **Partial** – tooltips exist for g, h, f | Enrich tooltips with Vietnamese text matching the report's notation definitions |
| **AI Explain metadata** | `aiExplain.js` → `ALGORITHM_META` | **Exists** (English, basic) | Enrich `selectionRule` text in Vietnamese; add `complete`, `weakness`, `bestFor` fields for richer AI prompts |
| **Explanation templates** | `explanationTemplates.js` → `generateExplanation()` | **Exists** (English) | Translate algorithm-specific context strings to Vietnamese |

---

## 3. Detailed File-by-File Changes

### 3.1 `public/browser/utils/algorithmDescriptions.js`

**This is the primary target.** Currently **403 lines** with data for 8 algorithms.

**Fields to update (per algorithm):**

| Field | Change Type | Details |
|---|---|---|
| `name` | Update | Translate to Vietnamese (e.g., "Thuật toán Dijkstra") |
| `shortDescription` | Replace | Vietnamese one-liner from section B |
| `category` | Keep | Already matches (`weighted`/`unweighted`) |
| `guaranteesOptimal` | Keep | Already matches |
| `howItWorks[]` | Replace | Vietnamese steps from section C (numbered) |
| `pseudocode[]` | Replace | Full pseudocode from section D |
| `keyInsight` | Replace | Vietnamese text from section E |
| `characteristics.dataStructure` | Update | Vietnamese/enriched from section F |
| `characteristics.timeComplexity` | Update | Add detail from report (e.g., "Array: O(V²); Binary heap: O(E log V)") |
| `characteristics.usesHeuristic` | Keep | Already correct |
| `characteristics.selectionRule` | Update | Vietnamese from report |
| **NEW** `characteristics.spaceComplexity` | ~~Add~~ | **✅ Already exists** in all 8 algorithms |
| **NEW** `characteristics.bestFor` | ~~Add~~ | **✅ Already exists** in all 8 algorithms |
| **NEW** `characteristics.weakness` | ~~Add~~ | **✅ Already exists** in all 8 algorithms |
| **NEW** `characteristics.notesOnGridWeights` | ~~Add~~ | **✅ Already exists** in all 8 algorithms |
| **NEW** `complete` | ~~Add~~ | **✅ Already exists** (Boolean/string: `true`, `false`, `"variant-dependent"`) |
| **NEW** `pitfalls[]` | ~~Add~~ | **✅ Already exists** in all 8 algorithms |
| **NEW** `visualBehavior[]` | ~~Add~~ | **✅ Already exists** in all 8 algorithms |

**Algorithms requiring changes:** All 8 (dijkstra, astar, greedy, swarm, convergentSwarm, bidirectional, bfs, dfs).

### 3.2 `public/browser/utils/algorithmModal.js`

**Currently:** Renders a Bootstrap modal with name, badges, description, how-it-works, pseudocode, key insight, and a characteristics table (4 rows).

**Changes needed:**

| UI Element | Change |
|---|---|
| Badges row | Add new badges: `complete`/`incomplete`, `heuristic`/`no heuristic`, `guarantees shortest path` / `does not guarantee`. All in Vietnamese. |
| Characteristics table | Add rows for: `spaceComplexity`, `bestFor`, `weakness`, `notesOnGridWeights`. Translate row headers to Vietnamese. |
| **NEW section** "Cạm bẫy thường gặp" (Common Pitfalls) | Render `pitfalls[]` as a `<ul>` list below characteristics |
| **NEW section** "Hành vi trực quan" (Visual Behavior) | Render `visualBehavior[]` as a `<ul>` list |
| Modal header / labels | Translate "How It Works", "Pseudocode", "Key Insight", "Characteristics" → Vietnamese |

### 3.3 `public/browser/utils/explanationTemplates.js`

**Currently:** 97 lines, generates English step-by-step text with algorithm-specific context strings.

**Changes needed:**

| Item | Change |
|---|---|
| All `algoContext` strings (lines ~4–16) | Translate to Vietnamese, enrich with info from report section E (key insight) |
| All template return strings | Translate to Vietnamese |
| `idToCoords()` output format | Keep as-is (numbers are universal) |

### 3.4 `public/browser/utils/aiExplain.js`

**Currently:** Contains `ALGORITHM_META` object (basic English) used to build a digest for the AI explanation endpoint.

**Changes needed:**

| Item | Change |
|---|---|
| `ALGORITHM_META[*].selectionRule` | Replace with Vietnamese text from report section F |
| ~~Add `ALGORITHM_META[*].complete`~~ | **✅ Already exists** in `ALGORITHM_META` for all 8 algorithms |
| ~~Add `ALGORITHM_META[*].weakness`~~ | **✅ Already exists** in `ALGORITHM_META` for all 8 algorithms |
| ~~Add `ALGORITHM_META[*].bestFor`~~ | **✅ Already exists** in `ALGORITHM_META` for all 8 algorithms |
| `buildRunDigest()` | No structural change, but the strings it sends will now be Vietnamese |

### 3.5 `public/browser/board.js`

**Currently:** ~2020 lines. Contains `INSIGHT_TOOLTIP_COPY`, `COST_TOOLTIP_KEYS`, and all sidebar/UI logic.

**Changes needed:**

| Item | Change |
|---|---|
| `INSIGHT_TOOLTIP_COPY` (all tooltip strings) | Translate to Vietnamese. Enrich with notation definitions from the report's "Bối cảnh và giả định" section. |
| `COST_TOOLTIP_KEYS` labels | May need Vietnamese label updates |
| Sidebar section titles in HTML | See `index.html` changes below |
| `setAlgorithmSelectionUI()` calls | The label text may need Vietnamese versions |
| **NEW** comparison table button handler | Add event listener to open the comparison modal |

### 3.6 `index.html`

**Changes needed:**

| Item | Change |
|---|---|
| Navbar algorithm labels (Dijkstra, A*, Greedy, etc.) | Can stay as-is (they're proper names) OR add Vietnamese subtitles |
| Sidebar section titles ("Algorithm", "Maze", "Weight Value", etc.) | Translate to Vietnamese |
| Insight panel titles ("Current Event", "Current Node", "What's Happening?", "Algorithm Metrics", etc.) | Translate to Vietnamese |
| Cost labels (g, h, f) | Keep letter labels, translate tooltip text |
| "Why This Path?" | → "Tại sao đường này?" |
| "AI Summary" | → "Tóm tắt AI" |
| Legend labels (Start, Target, Wall, etc.) | Translate to Vietnamese |
| Playback pod labels (Speed, Visualize!, Pause, Step) | Translate to Vietnamese |
| Tutorial overlay text | Translate to Vietnamese |
| **NEW** "So sánh thuật toán" button | Add in sidebar or navbar to open comparison modal |

### 3.7 `public/browser/utils/weightImpactAnalyzer.js`

**Changes needed:**

| Item | Change |
|---|---|
| All explanation sentences in `generateDetailedExplanation()` | Translate to Vietnamese |

### 3.8 `public/browser/utils/historyUI.js`

**Changes needed:**

| Item | Change |
|---|---|
| `formatAlgorithmName()` display names | Translate to Vietnamese (e.g., "Dijkstra" stays, but format text around it) |
| Status text ("Running...", "Exploring", "Path", etc.) | Translate to Vietnamese |
| History empty text ("No saved runs yet.") | Translate |

### 3.9 `server.js`

**Changes needed:**

| Item | Change |
|---|---|
| `buildPrompt()` / `generateFallback()` | Update to produce Vietnamese output (both AI prompt and fallback text) |

### 3.10 `public/styling/cssBasic.css`

**Changes needed:**

| Item | Change |
|---|---|
| New styles for pitfalls/visual-behavior sections in modal | Add CSS for `.algo-pitfalls`, `.algo-visual-behavior` |
| New styles for comparison modal/table | Add CSS for `.algo-compare-modal`, `.algo-compare-table` |

---

## 4. New Files to Create

| File | Purpose |
|---|---|
| `public/browser/utils/algorithmCompare.js` | Logic to render a comparison modal/table from `algorithmDescriptions.js` data. Renders the 8×7 summary table from the report plus the "Cách chọn nhanh" guide. |

---

## 5. Comparison Table Feature

### Data source
All data is already structured in `algorithmDescriptions.js` after the enrichment in step 3.1. The comparison table can be generated dynamically.

### UI design
- **Trigger:** A "So sánh tất cả" (Compare All) button in the sidebar Controls panel or navbar.
- **Modal:** Full-width Bootstrap modal with a responsive `<table>`:
  - Columns: Thuật toán | Weighted? | Optimal? | Complete? | Heuristic? | Selection rule | Time | Space
  - Rows: 8 algorithms
  - Each row links to the individual algorithm modal
- **Quick guide section:** Below the table, render the "Cách chọn nhanh" as bullet points.

### Files involved
- `algorithmCompare.js` (new) — builds HTML and opens modal
- `algorithmDescriptions.js` — data source
- `board.js` — adds button event listener
- `index.html` — adds the trigger button
- `cssBasic.css` — styles

---

## 6. Implementation Order (Suggested)

| Phase | Task | Files | Est. Effort |
|---|---|---|---|
| **Phase 1: Data layer** | Enrich `algorithmDescriptions.js` with all 8 sections × 8 algorithms (Vietnamese) | `algorithmDescriptions.js` | Medium-High |
| **Phase 2: Modal UI** | Update `algorithmModal.js` to render new sections (Badges, Pitfalls, Visual behavior, expanded Characteristics) | `algorithmModal.js`, `cssBasic.css` | Medium |
| **Phase 3: Insight panel translations** | Translate `INSIGHT_TOOLTIP_COPY`, `explanationTemplates.js`, sidebar titles in HTML | `board.js`, `explanationTemplates.js`, `index.html` | Medium |
| **Phase 4: AI / Weight explanation translations** | Translate `aiExplain.js`, `weightImpactAnalyzer.js`, `historyUI.js`, `server.js` fallback | `aiExplain.js`, `weightImpactAnalyzer.js`, `historyUI.js`, `server.js` | Medium |
| **Phase 5: Comparison table** | Create `algorithmCompare.js`, add button + modal, style it | `algorithmCompare.js` (new), `board.js`, `index.html`, `cssBasic.css` | Medium |
| **Phase 6: Full UI translation** | Translate remaining HTML (tutorial, legend, playback pod, navbar tooltips) | `index.html`, `cssBasic.css` | Low-Medium |
| **Phase 7: Testing & QA** | Verify all 8 algorithm modals, comparison table, insight panel, AI explain | `tests/` | Low |

---

## 7. Gap Analysis

### What already exists and aligns with the report

| Codebase Feature | Report Match | Status |
|---|---|---|
| `shortDescription` per algorithm | Section B (One-liner) | ✅ Content exists, needs Vietnamese replacement |
| `howItWorks[]` per algorithm | Section C (How it works) | ✅ Content exists (simplified), needs enrichment |
| `pseudocode[]` per algorithm | Section D (Pseudocode) | ✅ Content exists (abbreviated), needs replacement |
| `keyInsight` per algorithm | Section E (Key insight) | ✅ Content exists, needs Vietnamese replacement |
| `characteristics.dataStructure` | Section F table row | ✅ Exists |
| `characteristics.timeComplexity` | Section F table row | ✅ Exists (basic) |
| `characteristics.usesHeuristic` | Section F / Badges | ✅ Exists |
| `characteristics.selectionRule` | Section F table row | ✅ Exists (English) |
| `category` (weighted/unweighted) | Section A (Badges) | ✅ Exists |
| `guaranteesOptimal` | Section A (Badges) | ✅ Exists |
| Insight panel with g, h, f display | Notation glossary in report | ✅ Exists |
| Step-by-step explanation (explanationTemplates) | Matches report's educational intent | ✅ Exists |
| AI explanation endpoint | Complements report info | ✅ Exists |

### What's in the report but missing from the codebase

| Report Content | Codebase Gap | Priority |
|---|---|---|
| ~~`complete` property~~ | **✅ Already exists** in `algorithmDescriptions.js` | ~~🔴 High~~ Done |
| ~~`spaceComplexity`~~ | **✅ Already exists** in all 8 algorithms | ~~🟡 Medium~~ Done |
| ~~`bestFor`~~ | **✅ Already exists** in all 8 algorithms | ~~🟡 Medium~~ Done |
| ~~`weakness`~~ | **✅ Already exists** in all 8 algorithms | ~~🟡 Medium~~ Done |
| ~~`notesOnGridWeights`~~ | **✅ Already exists** in all 8 algorithms | ~~🟢 Low-Medium~~ Done |
| ~~`pitfalls[]`~~ | **✅ Already exists** in all 8 algorithms | ~~🔴 High~~ Done |
| ~~`visualBehavior[]`~~ | **✅ Already exists** in all 8 algorithms | ~~🔴 High~~ Done |
| ~~Comparison table UI~~ | **✅ Already exists** — `algorithmCompare.js` (133 LOC) | ~~🟡 Medium~~ Done |
| "Cách chọn nhanh" (quick selection guide) | No equivalent feature | 🟢 Low |
| Full Vietnamese translations | All text is English — `LANGUAGE_POLICY = "english"` in `server.js` | 🔴 High — if Vietnamese is still desired |

### What's in the codebase but not in the report

| Codebase Feature | Notes |
|---|---|
| Turn penalty cost model (base + turn + weight) | Report doesn't mention turn penalties — this is implementation-specific. Keep as-is. |
| `gScore` trace-only field | Implementation detail for the insight panel. Not in report. Keep as-is. |
| Swarm-specific tooltip keys (`swarm-score`, `swarm-heuristic`, `swarm-score-total`) | Report gives general description; tooltips can be enriched with report insights. |
| Animation controller, maze algorithms | Out of scope for this report. No changes needed. |
| Weight impact analyzer counterfactuals | Report doesn't cover this. Keep as-is, just translate. |

---

## 8. Risk / Considerations

| Risk | Impact | Mitigation |
|---|---|---|
| **Large diff in `algorithmDescriptions.js`** | ~403 lines currently, may grow to ~600+ after Vietnamese enrichment | Split into 8 commits (one per algorithm) |
| **Vietnamese text length** | Vietnamese text is often longer than English → modal/sidebar may overflow | Test with all 8 algorithms; add CSS for scrollable sections |
| **Pseudocode in Vietnamese comments** | The pseudocode itself uses English-like syntax with Vietnamese comments — this is standard and readable | Keep pseudocode keywords in English (e.g., `while`, `if`, `return`), comments in Vietnamese |
| **AI prompt language switch** | The OpenAI prompt in `server.js` currently asks for English output; `LANGUAGE_POLICY = "english"` already exists with conditional prompt logic | Update `buildPrompt()` to request Vietnamese output if policy changes |
| **Bundle size** | Adding ~400 lines of text increases `bundle.js` | Acceptable for educational app; could lazy-load comparison data if needed |
| **Testing** | `tests/algorithmDescriptionsSchema.test.js` already validates schema; no modal rendering tests yet | Extend existing test for new fields; add modal rendering tests if needed |
| **Swarm/Convergent/Bidirectional Swarm pseudocode** | Report marks these as "variant-dependent". Code uses specific formulas (e.g., `h^7` for convergentSwarm). | Cross-reference report pseudocode with actual `weightedSearchAlgorithm.js` formulas; annotate discrepancies |

---

## Summary

The research report maps **directly** onto the existing codebase structure. The vast majority of data-layer gaps have been resolved:

1. **`algorithmDescriptions.js` already enriched** (403 LOC) with all 8 sections × 8 algorithms including `complete`, `spaceComplexity`, `bestFor`, `weakness`, `notesOnGridWeights`, `pitfalls[]`, `visualBehavior[]`
2. **`algorithmCompare.js` already created** (133 LOC) with full comparison modal
3. **`aiExplain.js` `ALGORITHM_META` already enriched** with `complete`, `weakness`, `bestFor` for all 8 algorithms

The remaining primary work is:
1. **Translating all user-facing strings** across ~8 files to Vietnamese (if still desired)
2. **Updating `algorithmModal.js`** to render Pitfalls and Visual Behavior sections (verify current rendering)
3. **Adding "Cách chọn nhanh" quick selection guide** (optional)

No algorithm logic changes are needed — this is purely a **content and UI update**.
