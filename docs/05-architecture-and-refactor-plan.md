# Architecture & Refactor Plan (Incremental, no rewrite)

> **Note:** This document describes the **target architecture**. The 3-day roadmap (doc 07) takes incremental steps toward this structure without a full rewrite. Not all layers will be cleanly separated after MVP.

## 1) Current pain points
- `board.js` is a "God object": state + DOM + orchestration + tutorial (**2032 LOC**, nearly doubled from original 1115)
- Algorithms mutate node state and rely on board queues
- Hard to add trace/explanations cleanly without further coupling

> **Partial mitigation:** 11 new utility modules + `AnimationController` provide some separation, but `board.js` still handles model + rendering + UI + orchestration.

## 2) Target lightweight architecture (framework-agnostic)
Split into four layers:

1) **Model**
- Node, Grid, CostModelConfig
- Pure data, no DOM

2) **Algorithm Core**
- Functions that take (grid, start, target, config) and return:
  - visitedOrder
  - shortestPath
  - trace events (optional)
  - metrics

3) **Renderer / Animator**
- Applies classes / animations based on visited/path
- Updates explanation panel from trace

4) **UI Controller**
- Reads inputs (algo, speed, weight slider)
- Calls algorithm core → renderer
- Saves history

## 3) Minimal Changes to Algorithms

**✅ Implemented** — all 4 algorithm files now accept and populate `trace[]`.

```javascript
// Before (current)
function weightedSearchAlgorithm(nodes, start, target, nodesToAnimate, ...) {
  // ... algorithm logic
}

// After (add trace parameter)
function weightedSearchAlgorithm(nodes, start, target, nodesToAnimate, ..., trace) {
  // At key moments:
  if (trace) trace.push({ t: 'select_current', current: currentNode.id, g: currentNode.distance });
  // ... rest of algorithm unchanged
}
```

## 4) Performance Note
- Trace is optional: pass `null` to skip
- localStorage write happens once after run completes
- Keep trace events small (just IDs and numbers)

## 5) AI Explanation Service (Server-side)

### Architecture Boundary

```
┌─────────────────────────────────────────────────────────────┐
│  Browser                                                    │
│  ┌─────────────────┐      ┌─────────────────────────────┐  │
│  │ Animation ends  │ ──── │ Build Run Digest (JSON)     │  │
│  │ (toggleButtons) │      │ POST /api/explain           │  │
│  └─────────────────┘      └─────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│  Express Server (/api/explain)                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. Validate digest                                   │   │
│  │ 2. Build prompt with guardrails                      │   │
│  │ 3. Call OpenAI Chat Completions API (gpt-4o-mini)     │   │
│  │ 4. Return { explanation: "...5 sentences..." }        │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────────────┬────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│  OpenAI Chat Completions API                                │
│  - Endpoint: /v1/chat/completions                            │
│  - API key from process.env.OPENAI_API_KEY                   │
│  - Model: gpt-4o-mini (cost-effective)                       │
└─────────────────────────────────────────────────────────────┘
```

### Security

- **API key in env var only:** `process.env.OPENAI_API_KEY` (loaded via `dotenv`)
- **Never shipped to client:** No API key in browser JS or HTML
- **Server-side only:** All OpenAI calls happen in Express
- **Helmet:** Security headers middleware (CSP, etc.)
- **Rate limiting:** `express-rate-limit` at 30 requests per 15 minutes on `/api/explain`

### Trigger Point

- **Location:** `board.js` → `drawShortestPathTimeout()` → after `board.toggleButtons()`
- **Condition:** `success === true`
- **Action:** Call `aiExplain.requestAIExplanation()` (in `utils/aiExplain.js`, 231 LOC)

### Caching (Future Enhancement)

- In-memory cache keyed by `(algorithmKey + gridHash + settings)`
- Avoids redundant API calls for identical runs
- **Not in MVP** — implement when usage/cost becomes concern
