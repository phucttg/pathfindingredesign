# Product Requirements (PRD)

## Personas
- **Student**: learning algorithms; needs the “why,” not just the final path.
- **Educator**: needs quick demos, replay, and predictable tasks for students.
- **Developer**: wants to test cost-model variants and compare behaviors.

## Primary User Goals
1. Configure and run a pathfinding algorithm on a grid
2. Understand step-by-step decisions (node selection + cost updates)
3. Experiment with costs (weights) and observe decision changes
4. Save and replay recent runs

## Key User Flows
### Flow A — Learn (Explain Mode)
1. Setup grid (start/target + walls/weights)
2. Choose algorithm + speed + cost settings
3. Click Visualize
4. Follow explanation panel (current node, reason, cost updates)
5. Pause / step through animation using playback controls (**implemented** — `AnimationController`)

### Flow B — Experiment (Cost)
1. Choose weight value / preset terrain
2. Paint weights
3. Run algorithm
4. Compare summary metrics (total cost, visited nodes, path shape)

### Flow C — Revisit (History)
1. Open History
2. Select a previous run
3. Load + Replay
4. (Optional) delete

## UX Principles
- Explanations must be tied to **specific steps**, not generic text.
- When costs exist, show numbers (g/h/f) where relevant.
- Keep history lightweight: store sparse grid representation + settings.

## Constraints & Assumptions
- Core pathfinding runs in browser; backend required for AI explanation endpoint (`/api/explain`)
- Requires `OPENAI_API_KEY` on server; browser never contains API key
- If API fails, show deterministic fallback text (graceful degradation, not a supported mode)
- 4-direction movement in MVP
- No user accounts
- localStorage size constraints → sparse storage + cap at 5 runs
