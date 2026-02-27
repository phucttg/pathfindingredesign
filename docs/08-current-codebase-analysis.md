# Current Codebase Analysis

## Overview
This document provides a comprehensive analysis of the existing codebase to help developers understand what exists, what can be reused, and what needs modification for new features.

---

## 1) Tech Stack

| Layer | Technology | Version/Source |
|-------|------------|----------------|
| Frontend | Vanilla JavaScript + jQuery 3.1.1 | CDN |
| CSS Framework | Bootstrap 3.3.7 | CDN |
| Backend | Express.js | npm |
| Security | Helmet (headers) + express-rate-limit (30 req/15 min) | npm |
| AI | OpenAI Chat Completions API (gpt-4o-mini) | via `server.js` |
| Env Config | dotenv | npm |
| Bundler | Browserify + Watchify | npm (dev) |
| Dev Server | Nodemon | npm |

**No TypeScript, no React, no build-time transpilation.**

---

## 2) File Structure

```
Pathfinding-Visualizer/
├── index.html              # Single HTML entry point
├── server.js               # Express server + /api/explain endpoint
├── package.json            # Dependencies & scripts
├── .env                    # OPENAI_API_KEY (not committed)
├── .env.example            # Template for env vars
│
├── public/
│   ├── browser/
│   │   ├── board.js              # Main controller (2032 LOC) ⚠️ God Object
│   │   ├── node.js               # Node data model (23 LOC)
│   │   ├── getDistance.js        # Direction/distance utility (52 LOC)
│   │   ├── bundle.js             # Browserify output (do not edit)
│   │   │
│   │   ├── pathfindingAlgorithms/
│   │   │   ├── weightedSearchAlgorithm.js   # Dijkstra, Swarm, Greedy
│   │   │   ├── unweightedSearchAlgorithm.js # BFS, DFS
│   │   │   ├── astar.js                     # A* Search
│   │   │   ├── bidirectional.js             # Bidirectional Swarm
│   │   │   └── testAlgorithm.js             # Empty placeholder
│   │   │
│   │   ├── mazeAlgorithms/
│   │   │   ├── recursiveDivisionMaze.js     # Main maze generator
│   │   │   ├── otherMaze.js                 # Vertical skew variant
│   │   │   ├── otherOtherMaze.js            # Horizontal skew variant
│   │   │   ├── stairDemonstration.js
│   │   │   ├── weightsDemonstration.js
│   │   │   └── simpleDemonstration.js
│   │   │
│   │   ├── animations/
│   │   │   ├── animationController.js       # Pause/resume/step/stop (85 LOC)
│   │   │   ├── launchAnimations.js          # Animated visualization
│   │   │   ├── launchInstantAnimations.js   # Instant (no animation)
│   │   │   └── mazeGenerationAnimations.js  # Maze building animation
│   │   │
│   │   └── utils/
│   │       ├── aiExplain.js               # AI explanation client (231 LOC)
│   │       ├── algorithmCompare.js        # Algorithm comparison modal (133 LOC)
│   │       ├── algorithmDescriptions.js   # Algorithm data for 8 algos (403 LOC)
│   │       ├── algorithmModal.js          # Individual algorithm info modal (100 LOC)
│   │       ├── explanationTemplates.js    # Step-by-step text templates (99 LOC)
│   │       ├── gridMetrics.js             # Grid statistics calculator (105 LOC)
│   │       ├── historyStorage.js          # localStorage persistence (88 LOC)
│   │       ├── historyUI.js               # History panel UI (534 LOC)
│   │       ├── mazeSelector.js            # Maze presets + onboarding (227 LOC)
│   │       ├── runSerializer.js           # Board state serialization (143 LOC)
│   │       └── weightImpactAnalyzer.js    # Weight impact analysis (145 LOC)
│   │
│   └── styling/
│       ├── cssBasic.css    # Main stylesheet (7000+ LOC)
│       ├── cssPokemon.css  # Alternate theme
│       └── fonts/          # Glyphicons, Inter, Lato
│
├── tests/
│   ├── algorithmDescriptionsSchema.test.js
│   └── weightImpactAnalyzer.test.js
│
├── docs/                   # Documentation (this folder)
├── .agent/                 # Agent configuration
└── .github/                # GitHub configuration
```

---

## 3) Data Models

### Node (`node.js`)
```javascript
function Node(id, status) {
  this.id = id;                    // "row-col" format, e.g., "5-10"
  this.status = status;            // "unvisited" | "visited" | "wall" | "start" | "target"
  this.previousNode = null;        // For path reconstruction
  this.path = null;                // Movement sequence
  this.direction = null;           // "up" | "down" | "left" | "right"
  this.storedDirection = null;     // For re-runs
  this.distance = Infinity;        // g(n) - distance from start
  this.totalDistance = Infinity;   // f(n) = g(n) + h(n) for A*
  this.heuristicDistance = null;   // h(n) - estimated to target
  this.weight = 0;                 // Extra cost (0 or 15 currently)
  
  // Bidirectional search properties
  this.otherpreviousNode = null;
  this.otherdistance = Infinity;
  this.otherdirection = null;
}
```

### Board (`board.js` constructor)
```javascript
function Board(height, width) {
  // Grid dimensions
  this.height = height;
  this.width = width;
  
  // Special nodes
  this.start = null;               // Start node ID
  this.target = null;              // Target node ID
  
  // Data structures
  this.boardArray = [];            // 2D array of Nodes
  this.nodes = {};                 // Hash map {id: Node} for O(1) lookup
  
  // Animation queues
  this.nodesToAnimate = [];
  this.shortestPathNodesToAnimate = [];
  this.wallsToAnimate = [];
  
  // Interaction state
  this.mouseDown = false;
  this.pressedNodeStatus = "normal";
  this.previouslyPressedNodeStatus = null;
  this.previouslySwitchedNode = null;
  this.previouslySwitchedNodeWeight = 0;
  this.keyDown = false;
  
  // Algorithm state
  this.algoDone = false;
  this.currentAlgorithm = null;
  this.currentHeuristic = null;
  
  // UI state
  this.buttonsOn = false;
  this.speed = "fast";             // "fast" | "average" | "slow"
  this.currentWeightValue = 15;    // Weight slider value (0-50)
  
  // Sidebar state
  this.sidebarOpen = /* from localStorage or true */;
  
  // Trace / Explanation state
  this.currentTrace = [];          // Trace events from last algorithm run
  this.traceCursor = 0;            // Current position in trace playback
  this.lastVisitedCount = 0;       // For live metrics
  this.lastKnownPanelValues = {};  // Cached panel display values
  
  // Animation controller
  this.animationController = new AnimationController();
  
  // UI interaction
  this.algoSelectPulseTimer = null;  // Pulse effect timer for algo select
  this.currentRunToken = null;       // Token for pending history run
  this.runContext = null;            // "visualize" | "replay" context
  this.costTooltipMode = null;       // Tooltip mode for cost labels
}
```

---

## 4) Key Functions by File

### `board.js` (Main Controller — 2032 LOC)

| Function | Purpose |
|----------|---------|  
| `initialise()` | Entry point: createGrid + addEventListeners + initSidebar + initTutorial |
| `createGrid()` | Build HTML table + Node objects |
| `addEventListeners()` | Mouse events for drawing/dragging |
| `getNode(id)` | Get Node by "row-col" ID |
| `changeSpecialNode()` | Handle drag of start/target |
| `changeNormalNode()` | Toggle wall/weight on click |
| `drawShortestPath()` | Trace back path from target |
| `drawShortestPathTimeout()` | Animated path drawing + triggers AI explanation |
| `clearPath()` | Reset visited nodes + main Visualize handler |
| `clearWalls()` | Remove all walls |
| `clearWeights()` | Remove all weights |
| `instantAlgorithm()` | Run algorithm without animation |
| `redoAlgorithm()` | Re-run after dragging nodes |
| `toggleButtons()` | Enable/disable all UI + event handlers |
| `initSidebar()` | Initialize dual-tab sidebar (Controls + Insight) |
| `applySidebarState()` | Apply sidebar open/closed state from localStorage |
| `toggleSidebar()` | Toggle sidebar visibility |
| `setSidebarTab()` | Switch between Controls and Insight tabs |
| `initInsightTooltips()` | Initialize Feynman tooltip icons on Insight panel |
| `applyInsightTooltipCopy()` | Set tooltip content for all ? icons |
| `syncCostTooltipsForAlgorithmMode()` | Swap cost tooltips for Swarm mode (g/h/f → Score/Heuristic/Score) |
| `updateExplanationPanel()` | Update Insight panel with current trace step |
| `updateRunningStateUI()` | Update UI state during animation |
| `setAlgorithmSelectionUI()` | Set algorithm selection in sidebar |
| `syncAlgorithmSelectionUI()` | Sync algorithm selection across UI elements |
| `applyAlgorithmSelection()` | Apply algorithm selection to board state |
| `pulseAlgoSelectButton()` | Pulse effect on algorithm select button |
| `bindNavInfoOnlyHandlers()` | Bind navbar info-only handlers |
| `bindAlgoDropupHandlers()` | Bind algorithm dropup menu handlers |
| `runVisualization()` | Main visualization entry point |
| `bindStartVisualizeHandler()` | Bind Visualize button handler |
| `setInteractiveControlsEnabled()` | Enable/disable interactive controls |
| `computePathCost()` | Calculate total cost of found path |
| `displayPathCost()` | Show path cost in results bar |
| `hidePathCost()` | Hide path cost display |
| `initTutorial()` | 7-slide onboarding tutorial with keyboard nav, progress dots, focus trapping |

### `weightedSearchAlgorithm.js`

| Function | Purpose |
|----------|---------|
| `weightedSearchAlgorithm()` | Main entry for Dijkstra/Swarm/Greedy |
| `closestNode()` | Find min-distance node (O(n) scan) |
| `updateNeighbors()` | Process all neighbors of current |
| `updateNode()` | Relaxation step with cost calculation |
| `getNeighbors()` | Get 4-directional neighbors |
| `getDistance()` | Calculate edge cost including turn penalty |
| `manhattanDistance()` | Heuristic function |

### `astar.js`

| Function | Purpose |
|----------|---------|
| `astar()` | A* with f(n) = g(n) + h(n) |
| `closestNode()` | Find min totalDistance node |
| `updateNode()` | Update with heuristic consideration |

### `unweightedSearchAlgorithm.js`

| Function | Purpose |
|----------|---------|
| `unweightedSearchAlgorithm()` | BFS (queue) or DFS (stack) |
| `getNeighbors()` | 4-directional, order differs for BFS/DFS |

### `launchAnimations.js`

| Function | Purpose |
|----------|---------|
| `launchAnimations()` | Main animation loop with setTimeout |
| `timeout()` | Recursive step-by-step animation |
| `change()` | Update single node's CSS class |
| `shortestPathTimeout()` | Animate the final path |

---

## 5) Algorithm Implementations

### Supported Algorithms

| Algorithm | File | Weighted | Guaranteed Shortest | Trace Support |
|-----------|------|----------|---------------------|---------------|
| Dijkstra | weightedSearchAlgorithm.js | ✅ | ✅ | ✅ |
| A* | astar.js | ✅ | ✅ | ✅ |
| Greedy Best-first | weightedSearchAlgorithm.js | ✅ | ❌ | ✅ |
| Swarm | weightedSearchAlgorithm.js | ✅ | ❌ | ✅ |
| Convergent Swarm | weightedSearchAlgorithm.js | ✅ | ❌ | ✅ |
| Bidirectional Swarm | bidirectional.js | ✅ | ❌ | ✅ |
| BFS | unweightedSearchAlgorithm.js | ❌ | ✅ | ✅ |
| DFS | unweightedSearchAlgorithm.js | ❌ | ❌ | ✅ |

### Cost Model (Current)
```javascript
// Edge cost = base + turn penalty + weight
// Base: 1 (always)
// Turn penalty: 1 (straight), 2 (90°), 3 (180°)
// Weight: user-configurable via slider (0-50, default 15)

// From getDistance():
// Returns [cost, path, direction]
// e.g., [2, ["l", "f"], "up"] = cost 2, turn left then forward, facing up
```

---

## 6) Known Issues & Technical Debt

### Critical for New Features

| Issue | Location | Status |
|-------|----------|--------|
| ~~**Hardcoded weight=15**~~ | various | **✅ Fixed** — no hardcoded weight=15 found in codebase |
| ~~**No trace/logging**~~ | All algorithms | **✅ Implemented** — all 4 algorithm files have full trace support |
| **God object (board.js)** | 2032 LOC single file | ⚠️ Partially mitigated by 11 utility modules + AnimationController |
| ~~**No state serialization**~~ | N/A | **✅ Implemented** — `runSerializer.js` (143 LOC) |

### Performance Issues

| Issue | Location | Severity |
|-------|----------|----------|
| O(n) closestNode scan | weightedSearchAlgorithm.js:29-38 | Medium (should use heap) |
| Repeated DOM queries | Throughout | Low-Medium |
| ~~No animation cancellation~~ | ~~launchAnimations.js~~ | **✅ Fixed** — `AnimationController` supports stop/pause/resume/step |

### Code Quality

| Issue | Description |
|-------|-------------|
| Global variables | `counter`, `window.__board` (was `newBoard`) at module level |
| Duplicated getDistance() | Still exists in multiple files with same logic |
| Mixed concerns | DOM manipulation in algorithm files |
| No error handling | No try/catch, minimal validation |

---

## 7) What Can Be Reused

### ✅ Reuse Directly
- Node data model structure
- Algorithm core logic (Dijkstra, A*, BFS, DFS)
- Maze generation algorithms
- CSS animations and styles
- HTML structure

### ✅ Already Modified & Working
- `weightedSearchAlgorithm.js` — trace support added, hardcoded weight removed
- `astar.js` — trace events added
- `bidirectional.js` — trace events added (incl. `found_midpoint`)
- `unweightedSearchAlgorithm.js` — trace events added
- `board.js` — serialization, history hooks, sidebar, tutorial all integrated
- Cost calculation in `getDistance()` — uses dynamic `node.weight`

### ✅ Created & Working
- Trace collector system (`trace[]` in all algorithms)
- Explanation templates (`explanationTemplates.js`, 99 LOC)
- localStorage persistence (`historyStorage.js`, 88 LOC)
- History UI components (`historyUI.js`, 534 LOC)
- Weight slider UI (in sidebar Controls panel)
- Run summary display (`#resultsBar`)
- Animation controller (`animationController.js`, 85 LOC)
- AI explanation client (`aiExplain.js`, 231 LOC)
- Algorithm descriptions data (`algorithmDescriptions.js`, 403 LOC)
- Algorithm comparison modal (`algorithmCompare.js`, 133 LOC)
- Algorithm info modals (`algorithmModal.js`, 100 LOC)
- Grid metrics calculator (`gridMetrics.js`, 105 LOC)
- Maze selector / onboarding (`mazeSelector.js`, 227 LOC)
- Run serializer (`runSerializer.js`, 143 LOC)
- Weight impact analyzer (`weightImpactAnalyzer.js`, 145 LOC)

---

## 8) Entry Points & Data Flow

### Initialization Flow
```
index.html loads
    ↓
bundle.js executes
    ↓
board.js bottom: new Board(height, width)
    ↓
window.__board.initialise()
    ↓
├── createGrid()           → Build DOM table + Node objects
├── addEventListeners()    → Mouse handlers
├── initSidebar()          → Dual-tab sidebar (Controls + Insight)
├── initInsightTooltips()  → Feynman tooltip icons
├── initTutorial()         → 7-slide onboarding with keyboard nav
└── historyUI.init()       → History panel in sidebar
```

### Visualization Flow
```
User clicks "Visualize!"
    ↓
runVisualization() / clearPath("clickedButton") → Reset state
    ↓
Algorithm function (e.g., weightedSearchAlgorithm) + trace recording
    ↓
├── Returns "success" or false
├── Populates nodesToAnimate[]
├── Sets node.previousNode for path
└── Populates currentTrace[] with trace events
    ↓
historyUI: create pending run card (token-based)
    ↓
launchAnimations(board, success, type)
    ↓
setTimeout loop animates each node (via AnimationController)
    ↓
updateExplanationPanel() updates Insight sidebar at each step
    ↓
drawShortestPathTimeout() animates path
    ↓
toggleButtons() → Re-enable UI
    ↓
├── displayPathCost() → Show results in #resultsBar
├── historyUI: save run to localStorage + update card
└── aiExplain.requestAIExplanation() → POST /api/explain → render in Insight panel
```

### Mouse Interaction Flow
```
mousedown on cell
    ↓
Is it start/target?
├── Yes → pressedNodeStatus = special, enable drag
└── No  → changeNormalNode() → toggle wall/weight
    ↓
mousemove (if mouseDown)
    ↓
Is pressedNodeStatus special?
├── Yes → changeSpecialNode() → move special node
│         if algoDone → redoAlgorithm()
└── No  → changeNormalNode() → draw walls
    ↓
mouseup → reset pressedNodeStatus
```

---

## 9) Integration Points (Implemented)

### Step-by-Step Explanations ✅
- **Trace:** All 4 algorithm files push events to `trace[]` during execution
- **UI:** `updateExplanationPanel()` in `board.js` renders trace events in the Insight sidebar
- **Templates:** `explanationTemplates.js` generates human-readable text from trace events

### History/localStorage ✅
- **Serialize:** `runSerializer.js` captures board state (walls, weights, start, target, settings, result)
- **Storage:** `historyStorage.js` manages localStorage with MAX_RUNS = 5
- **Save trigger:** After algorithm completes in `drawShortestPathTimeout`
- **UI:** `historyUI.js` renders history panel in sidebar with Load/Replay/Delete

### Cost Experimentation ✅
- **Weight slider:** In sidebar Controls panel, stored in `board.currentWeightValue`
- **`changeNormalNode()`:** Uses dynamic weight from slider
- **Results:** `#resultsBar` shows Path Cost, Length, Visited after run

### AI Explanation ✅
- **Client:** `aiExplain.js` builds run digest and sends POST to `/api/explain`
- **Server:** `server.js` with Helmet + rate-limit, calls OpenAI Chat Completions API
- **Fallback:** `generateFallback()` produces 5-sentence deterministic text

### Animation Controls ✅
- **Controller:** `AnimationController` (85 LOC) with pause/resume/step/stop
- **UI:** `#pauseResumeBtn`, `#stepForwardBtn` in `index.html`

---

## 10) Testing Current Functionality

### Manual Test Checklist
- [ ] Grid renders correctly on page load
- [ ] Can draw walls by clicking
- [ ] Can draw weights by holding W + clicking
- [ ] Can drag start/target nodes
- [ ] All 8 algorithms run without errors
- [ ] Animation plays at all 3 speeds
- [ ] Maze generation works (all types)
- [ ] Clear Board/Walls/Path buttons work
- [ ] Tutorial displays and can be skipped

### Browser Console Commands for Debugging
```javascript
// Access board instance
window.__board

// Check current state
window.__board.currentAlgorithm
window.__board.nodes["10-15"]
window.__board.nodesToAnimate.length
window.__board.currentTrace.length
window.__board.animationController

// Manually trigger
window.__board.clearPath("clickedButton")
window.__board.redoAlgorithm()
```
