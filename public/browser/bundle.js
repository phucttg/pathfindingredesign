(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
function AnimationController() {
  this.isPaused = false;
  this.timerId = null;
  this.currentIndex = 0;
  this.totalFrames = 0;
  this.speed = 0;
  this.phase = "idle";
  this.onFrame = null;
  this.onComplete = null;
}

AnimationController.prototype.start = function (totalFrames, speed, onFrame, onComplete, phaseLabel) {
  this.stop();
  this.totalFrames = totalFrames;
  this.speed = speed;
  this.currentIndex = 0;
  this.isPaused = false;
  this.phase = phaseLabel || "exploring";
  this.onFrame = onFrame;
  this.onComplete = onComplete;
  this._scheduleNext();
};

AnimationController.prototype.pause = function () {
  if (this.phase === "idle" || this.phase === "done") return;
  this.isPaused = true;
  if (this.timerId) {
    clearTimeout(this.timerId);
    this.timerId = null;
  }
};

AnimationController.prototype.resume = function () {
  if (!this.isPaused) return;
  this.isPaused = false;
  this._scheduleNext();
};

AnimationController.prototype.stepForward = function () {
  if (this.phase === "idle" || this.phase === "done") return;
  this.isPaused = true;
  if (this.timerId) {
    clearTimeout(this.timerId);
    this.timerId = null;
  }
  if (this.currentIndex <= this.totalFrames) {
    if (this.onFrame) this.onFrame(this.currentIndex);
    this.currentIndex++;
  }
  if (this.currentIndex > this.totalFrames) {
    this.phase = "done";
    if (this.onComplete) this.onComplete();
  }
};

AnimationController.prototype.stop = function () {
  if (this.timerId) {
    clearTimeout(this.timerId);
    this.timerId = null;
  }
  this.isPaused = false;
  this.currentIndex = 0;
  this.totalFrames = 0;
  this.phase = "idle";
  this.onFrame = null;
  this.onComplete = null;
};

AnimationController.prototype._scheduleNext = function () {
  if (this.isPaused) return;
  if (this.currentIndex > this.totalFrames) {
    this.phase = "done";
    if (this.onComplete) this.onComplete();
    return;
  }
  var self = this;
  this.timerId = setTimeout(function () {
    if (self.isPaused) return;
    if (self.onFrame) self.onFrame(self.currentIndex);
    self.currentIndex++;
    self._scheduleNext();
  }, this.speed);
};

module.exports = AnimationController;

},{}],2:[function(require,module,exports){
const weightedSearchAlgorithm = require("../pathfindingAlgorithms/weightedSearchAlgorithm");
const unweightedSearchAlgorithm = require("../pathfindingAlgorithms/unweightedSearchAlgorithm");
const historyStorage = require("../utils/historyStorage");
const serializeRun = require("../utils/runSerializer");
const historyUI = require("../utils/historyUI");

function launchAnimations(board, success, type) {
  var nodes = board.nodesToAnimate.slice(0);
  var speed = board.speed === "fast" ? 0 : board.speed === "average" ? 100 : 500;
  var controller = board.animationController;

  var controls = document.getElementById("animationControls");
  var progressEl = document.getElementById("animationProgress");
  var pauseBtn = document.getElementById("pauseResumeBtn");

  if (speed > 0) {
    if (controls) controls.classList.remove("hidden");
  } else {
    if (controls) controls.classList.add("hidden");
    if (progressEl) progressEl.textContent = "";
  }

  if (pauseBtn) {
    pauseBtn.innerHTML = '<span class="glyphicon glyphicon-pause"></span> Pause';
  }

  var runContext = historyUI && typeof historyUI.getRunContext === "function"
    ? historyUI.getRunContext(board)
    : { mode: "visualize", sourceRunId: null };

  if (historyUI && typeof historyUI.setPendingRun === "function") {
    board.currentRunToken = historyUI.setPendingRun(board, {
      mode: runContext.mode || "visualize",
      sourceRunId: runContext.sourceRunId || null,
      algorithm: board.currentAlgorithm,
      heuristic: board.currentHeuristic,
      speed: board.speed,
      phase: "exploring",
      current: 0,
      total: nodes.length,
      statusText: nodes.length > 0 ? "Exploring 0/" + nodes.length : "Exploring..."
    });
  } else {
    board.currentRunToken = null;
  }

  function onExploreFrame(index) {
    var progressIndex = nodes.length ? Math.min(index + 1, nodes.length) : 0;
    if (progressEl) {
      progressEl.textContent = "Exploring " + progressIndex + "/" + nodes.length;
    }

    if (historyUI && typeof historyUI.updatePendingRun === "function") {
      historyUI.updatePendingRun(board, board.currentRunToken, {
        phase: "exploring",
        current: progressIndex,
        total: nodes.length,
        statusText: "Exploring " + progressIndex + "/" + nodes.length
      });
    }

    if (index >= nodes.length) return;

    if (index === 0) {
      if (document.getElementById(board.start).className !== "visitedStartNodePurple") {
        document.getElementById(board.start).className = "visitedStartNodeBlue";
      }
      if (board.currentAlgorithm === "bidirectional") {
        document.getElementById(board.target).className = "visitedTargetNodeBlue";
      }
      change(nodes[index]);
    } else if (index === nodes.length - 1 && board.currentAlgorithm === "bidirectional") {
      change(nodes[index], nodes[index - 1], "bidirectional");
    } else if (index < nodes.length) {
      change(nodes[index], nodes[index - 1]);
    }

    if (board.currentTrace && board.currentTrace.length > 0 && board.updateExplanationPanel) {
      var traceIndex = Math.min(board.traceCursor, board.currentTrace.length - 1);
      var event = board.currentTrace[traceIndex];
      board.updateExplanationPanel(event);
      board.traceCursor = Math.min(board.traceCursor + 1, board.currentTrace.length - 1);
    }
  }

  function onExploreComplete() {
    board.lastVisitedCount = nodes.length;
    board.nodesToAnimate = [];
    if (progressEl) progressEl.textContent = "";

    if (board.currentTrace && board.currentTrace.length > 0 && board.updateExplanationPanel) {
      var finalEvent = board.currentTrace[board.currentTrace.length - 1];
      board.updateExplanationPanel(finalEvent);
    }

    if (success) {
      if (document.getElementById(board.target).className !== "visitedTargetNodeBlue") {
        document.getElementById(board.target).className = "visitedTargetNodeBlue";
      }
      board.drawShortestPathTimeout(board.target, board.start, type);
      board.reset();
      var visitedCount = nodes.length;
      board.displayPathCost(visitedCount);
      var runSummary = serializeRun(board, success, visitedCount);
      historyStorage.saveRun(runSummary);
      if (historyUI && typeof historyUI.updatePendingRun === "function") {
        historyUI.updatePendingRun(board, board.currentRunToken, {
          phase: "finalizing",
          statusText: "Finalizing run...",
          persistedRunId: runSummary.id
        });
      }
      console.log("[Run Complete]", runSummary);
      return;
    }

    console.log("Failure.");
    board.reset();
    if (controls) controls.classList.add("hidden");
    if (progressEl) progressEl.textContent = "";
    if (historyUI && typeof historyUI.resolvePendingRun === "function") {
      historyUI.resolvePendingRun(board, board.currentRunToken, {
        status: "failed",
        statusText: "Failed",
        clearDelayMs: 1200
      });
    }
    board.currentRunToken = null;
    board.toggleButtons();
  }

  function change(currentNode, previousNode, bidirectional) {
    var currentHTMLNode = document.getElementById(currentNode.id);
    var relevantClassNames = ["start", "target", "visitedStartNodeBlue", "visitedStartNodePurple", "visitedTargetNodePurple", "visitedTargetNodeBlue"];
    if (!relevantClassNames.includes(currentHTMLNode.className)) {
      currentHTMLNode.className = !bidirectional ? "current" : currentNode.weight > 0 ? "visited weight" : "visited";
    }
    if (currentHTMLNode.className === "visitedStartNodePurple") {
      currentHTMLNode.className = "visitedStartNodeBlue";
    }
    if (previousNode) {
      var previousHTMLNode = document.getElementById(previousNode.id);
      if (!relevantClassNames.includes(previousHTMLNode.className)) {
        previousHTMLNode.className = previousNode.weight > 0 ? "visited weight" : "visited";
      }
    }
  }

  controller.start(nodes.length, speed, onExploreFrame, onExploreComplete, "exploring");
}

module.exports = launchAnimations;

},{"../pathfindingAlgorithms/unweightedSearchAlgorithm":14,"../pathfindingAlgorithms/weightedSearchAlgorithm":15,"../utils/historyStorage":21,"../utils/historyUI":22,"../utils/runSerializer":24}],3:[function(require,module,exports){
const weightedSearchAlgorithm = require("../pathfindingAlgorithms/weightedSearchAlgorithm");
const unweightedSearchAlgorithm = require("../pathfindingAlgorithms/unweightedSearchAlgorithm");

function launchInstantAnimations(board, success, type) {
  let nodes = board.nodesToAnimate.slice(0);
  let shortestNodes;
  for (let i = 0; i < nodes.length; i++) {
    if (i === 0) {
      change(nodes[i]);
    } else {
      change(nodes[i], nodes[i - 1]);
    }
  }
  board.nodesToAnimate = [];
  if (success) {
    board.drawShortestPath(board.target, board.start);
    shortestNodes = board.shortestPathNodesToAnimate;
  } else {
    console.log("Failure");
    board.reset();
    return;
  }

  let j;
  for (j = 0; j < shortestNodes.length; j++) {
    if (j === 0) {
      shortestPathChange(shortestNodes[j]);
    } else {
      shortestPathChange(shortestNodes[j], shortestNodes[j - 1]);
    }
  }
  board.reset();
  shortestPathChange(board.nodes[board.target], shortestNodes[j - 1]);

  // Final event for panel values + metrics in instant mode
  if (board.currentTrace) {
    var visitedCount = nodes.length;
    board.lastVisitedCount = visitedCount;
    var costObj = board.computePathCost();
    var pathCost = costObj && costObj.cost ? costObj.cost : 0;
    var totalNodes = Object.keys(board.nodes).length;
    var frontierSize = Math.max(totalNodes - visitedCount, 0);
    var lastEvent = board.currentTrace[board.currentTrace.length - 1];
    var finalValues = { g: pathCost, h: 0, f: pathCost };
    var finalMetrics = {
      visitedCount: visitedCount,
      pathCost: pathCost,
      frontierSize: frontierSize
    };

    if (lastEvent && lastEvent.t === "found_target") {
      lastEvent.values = finalValues;
      lastEvent.metrics = Object.assign({}, lastEvent.metrics, finalMetrics);
      if (board.updateExplanationPanel) {
        board.updateExplanationPanel(lastEvent);
      }
    } else {
      var finalEvent = {
        t: "found_target",
        step: board.currentTrace.length,
        target: board.target,
        values: finalValues,
        metrics: finalMetrics
      };
      board.currentTrace.push(finalEvent);
      if (board.updateExplanationPanel) {
        board.updateExplanationPanel(finalEvent);
      }
    }
  }

  function change(currentNode, previousNode) {
    let currentHTMLNode = document.getElementById(currentNode.id);
    let relevantClassNames = ["start", "shortest-path", "instantshortest-path", "instantshortest-path weight"];
    if (previousNode) {
      let previousHTMLNode = document.getElementById(previousNode.id);
      if (!relevantClassNames.includes(previousHTMLNode.className)) {
        previousHTMLNode.className = previousNode.weight > 0 ? "instantvisited weight" : "instantvisited";
      }
    }
  }

  function shortestPathChange(currentNode, previousNode) {
    let currentHTMLNode = document.getElementById(currentNode.id);
    if (type === "unweighted") {
      currentHTMLNode.className = "shortest-path-unweighted";
    } else {
      if (currentNode.direction === "up") {
        currentHTMLNode.className = "shortest-path-up";
      } else if (currentNode.direction === "down") {
        currentHTMLNode.className = "shortest-path-down";
      } else if (currentNode.direction === "right") {
        currentHTMLNode.className = "shortest-path-right";
      } else if (currentNode.direction === "left") {
        currentHTMLNode.className = "shortest-path-left";
      }
    }
    if (previousNode) {
      let previousHTMLNode = document.getElementById(previousNode.id);
      previousHTMLNode.className = previousNode.weight > 0 ? "instantshortest-path weight" : "instantshortest-path";
    } else {
      let element = document.getElementById(board.start);
      element.className = "startTransparent";
    }
  }

};

module.exports = launchInstantAnimations;

},{"../pathfindingAlgorithms/unweightedSearchAlgorithm":14,"../pathfindingAlgorithms/weightedSearchAlgorithm":15}],4:[function(require,module,exports){
function mazeGenerationAnimations(board, onComplete) {
  let nodes = board.wallsToAnimate.slice(0);
  let speed = board.speed === "fast" ?
    5 : board.speed === "average" ?
      25 : 75;
  function timeout(index) {
    setTimeout(function () {
      if (index === nodes.length) {
        board.wallsToAnimate = [];
        if (typeof onComplete === "function") {
          onComplete();
        } else {
          board.toggleButtons();
        }
        return;
      }
      nodes[index].className = board.nodes[nodes[index].id].weight > 0 ? "unvisited weight" : "wall";
      timeout(index + 1);
    }, speed);
  }

  timeout(0);
};

module.exports = mazeGenerationAnimations;

},{}],5:[function(require,module,exports){
const Node = require("./node");
const launchAnimations = require("./animations/launchAnimations");
const launchInstantAnimations = require("./animations/launchInstantAnimations");
const weightedSearchAlgorithm = require("./pathfindingAlgorithms/weightedSearchAlgorithm");
const unweightedSearchAlgorithm = require("./pathfindingAlgorithms/unweightedSearchAlgorithm");
const explanationTemplates = require("./utils/explanationTemplates");
const bidirectional = require("./pathfindingAlgorithms/bidirectional");
const getDistance = require("./getDistance");
const aiExplain = require("./utils/aiExplain");
const historyUI = require("./utils/historyUI");
const weightImpactAnalyzer = require("./utils/weightImpactAnalyzer");
const algorithmDescriptions = require("./utils/algorithmDescriptions");
const algorithmModal = require("./utils/algorithmModal");
const AnimationController = require("./animations/animationController");
const mazeSelector = require("./utils/mazeSelector");

const NAV_INFO_MAP = {
  navAlgoDijkstra: "dijkstra",
  navAlgoAstar: "astar",
  navAlgoGreedy: "greedy",
  navAlgoSwarm: "swarm",
  navAlgoConvergent: "convergentSwarm",
  navAlgoBidirectional: "bidirectional",
  navAlgoBFS: "bfs",
  navAlgoDFS: "dfs"
};

const ALGO_SELECTION_MAP = {
  startButtonDijkstra: {
    algorithm: "dijkstra",
    heuristic: null,
    label: "Dijkstra's Algorithm",
    clearWeights: false
  },
  startButtonAStar2: {
    algorithm: "astar",
    heuristic: "poweredManhattanDistance",
    label: "A* Search",
    clearWeights: false
  },
  startButtonGreedy: {
    algorithm: "greedy",
    heuristic: null,
    label: "Greedy Best-first Search",
    clearWeights: false
  },
  startButtonAStar: {
    algorithm: "CLA",
    heuristic: "manhattanDistance",
    label: "Swarm Algorithm",
    clearWeights: false
  },
  startButtonAStar3: {
    algorithm: "CLA",
    heuristic: "extraPoweredManhattanDistance",
    label: "Convergent Swarm Algorithm",
    clearWeights: false
  },
  startButtonBidirectional: {
    algorithm: "bidirectional",
    heuristic: "manhattanDistance",
    label: "Bidirectional Swarm Algorithm",
    clearWeights: false
  },
  startButtonBFS: {
    algorithm: "bfs",
    heuristic: null,
    label: "Breadth-first Search",
    clearWeights: true
  },
  startButtonDFS: {
    algorithm: "dfs",
    heuristic: null,
    label: "Depth-first Search",
    clearWeights: true
  }
};

function getSelectionByState(algorithm, heuristic) {
  if (algorithm === "swarm") {
    algorithm = "CLA";
    heuristic = "manhattanDistance";
  } else if (algorithm === "convergentSwarm") {
    algorithm = "CLA";
    heuristic = "extraPoweredManhattanDistance";
  }
  var targetHeuristic = heuristic || null;
  var buttonIds = Object.keys(ALGO_SELECTION_MAP);
  for (var i = 0; i < buttonIds.length; i++) {
    var option = ALGO_SELECTION_MAP[buttonIds[i]];
    if (option.algorithm === algorithm && (option.heuristic || null) === targetHeuristic) {
      return option;
    }
  }
  return null;
}

function Board(height, width) {
  this.height = height;
  this.width = width;
  this.start = null;
  this.target = null;
  this.boardArray = [];
  this.nodes = {};
  this.nodesToAnimate = [];
  this.shortestPathNodesToAnimate = [];
  this.wallsToAnimate = [];
  this.mouseDown = false;
  this.pressedNodeStatus = "normal";
  this.previouslyPressedNodeStatus = null;
  this.previouslySwitchedNode = null;
  this.previouslySwitchedNodeWeight = 0;
  this.keyDown = false;
  this.algoDone = false;
  this.currentAlgorithm = null;
  this.currentHeuristic = null;
  this.buttonsOn = false;
  this.speed = "fast";
  this.currentWeightValue = 15;
  this.sidebarOpen = localStorage.getItem("sidebarOpen");
  this.sidebarOpen = this.sidebarOpen === null ? true : this.sidebarOpen === "true";
  this.currentTrace = [];
  this.traceCursor = 0;
  this.lastVisitedCount = 0;
  this.lastKnownPanelValues = {
    g: null,
    h: null,
    f: null,
    frontierSize: null,
    visitedCount: null,
    currentNode: null
  };
  this.animationController = new AnimationController();
  this.algoSelectPulseTimer = null;
  this.currentRunToken = null;
  this.runContext = null;
}

Board.prototype.initialise = function () {
  this.createGrid();
  this.addEventListeners();
  this.initSidebar();
  mazeSelector.initSidebarMazeDropup(this);
  historyUI.initHistoryUI(this);
  this.bindNavInfoOnlyHandlers();
  this.setAlgorithmSelectionUI("Select Algorithm");
  this.setInteractiveControlsEnabled(false);
  this.initTutorial();
};

Board.prototype.initSidebar = function () {
  var currentObject = this;
  var sidebar = document.getElementById("sidebar");
  if (!sidebar) return;

  if (window.innerWidth < 1200 && localStorage.getItem("sidebarOpen") === null) {
    this.sidebarOpen = false;
  }

  this.applySidebarState();
  this.setSidebarTab("controls");

  var toggleButton = document.getElementById("toggleSidebarBtn");
  var tabControls = document.getElementById("tabControls");
  var tabInsight = document.getElementById("tabInsight");
  var sidebarClearPath = document.getElementById("sidebarClearPath");
  var sidebarClearWalls = document.getElementById("sidebarClearWalls");
  var sidebarClearBoard = document.getElementById("sidebarClearBoard");
  var algoInfoBtn = document.getElementById("algoInfoBtn");

  if (toggleButton) {
    toggleButton.addEventListener("click", function () {
      currentObject.toggleSidebar();
    });
  }

  if (tabControls) {
    tabControls.addEventListener("click", function () {
      currentObject.setSidebarTab("controls");
    });
  }

  if (tabInsight) {
    tabInsight.addEventListener("click", function () {
      currentObject.setSidebarTab("insight");
    });
  }

  if (sidebarClearPath) {
    sidebarClearPath.addEventListener("click", function () {
      if (!currentObject.buttonsOn) return;
      currentObject.clearPath("clickedButton");
    });
  }

  if (sidebarClearWalls) {
    sidebarClearWalls.addEventListener("click", function () {
      if (!currentObject.buttonsOn) return;
      currentObject.clearWalls();
    });
  }

  if (sidebarClearBoard) {
    sidebarClearBoard.addEventListener("click", function () {
      if (!currentObject.buttonsOn) return;
      currentObject.clearBoard();
    });
  }

  if (algoInfoBtn) {
    algoInfoBtn.addEventListener("click", function () {
      if (!currentObject.currentAlgorithm) return;
      var key = algorithmDescriptions.getAlgorithmKey(currentObject.currentAlgorithm, currentObject.currentHeuristic);
      algorithmModal.showAlgorithmInfo(key);
    });
  }

  window.addEventListener("resize", function () {
    currentObject.applySidebarState();
  });

  this.updateExplanationPanel(null);
};

Board.prototype.applySidebarState = function () {
  var sidebar = document.getElementById("sidebar");
  if (!sidebar) return;

  if (window.innerWidth <= 1199) {
    sidebar.classList.remove("sidebar-collapsed");
    if (this.sidebarOpen) {
      sidebar.classList.add("sidebar-open");
    } else {
      sidebar.classList.remove("sidebar-open");
    }
    return;
  }

  sidebar.classList.remove("sidebar-open");
  if (this.sidebarOpen) {
    sidebar.classList.remove("sidebar-collapsed");
  } else {
    sidebar.classList.add("sidebar-collapsed");
  }
};

Board.prototype.toggleSidebar = function (forceOpen) {
  if (typeof forceOpen === "boolean") {
    this.sidebarOpen = forceOpen;
  } else {
    this.sidebarOpen = !this.sidebarOpen;
  }
  this.applySidebarState();
  localStorage.setItem("sidebarOpen", this.sidebarOpen);
};

Board.prototype.setSidebarTab = function (tab) {
  var controlsTab = document.getElementById("tabControls");
  var insightTab = document.getElementById("tabInsight");
  var controlsPanel = document.getElementById("panelControls");
  var insightPanel = document.getElementById("panelInsight");
  if (!controlsTab || !insightTab || !controlsPanel || !insightPanel) return;

  var showInsight = tab === "insight";
  controlsTab.classList.toggle("active", !showInsight);
  insightTab.classList.toggle("active", showInsight);
  controlsPanel.classList.toggle("active", !showInsight);
  insightPanel.classList.toggle("active", showInsight);
};

Board.prototype.activateControlsTab = function () {
  this.setSidebarTab("controls");
};

Board.prototype.activateInsightTab = function () {
  this.setSidebarTab("insight");
};

Board.prototype.updateRunningStateUI = function (isRunning) {
  var startButton = document.getElementById("startButtonStart");
  if (startButton) {
    startButton.classList.toggle("hidden", isRunning);
  }

  if (!isRunning) {
    var controls = document.getElementById("animationControls");
    var progress = document.getElementById("animationProgress");
    if (controls) controls.classList.add("hidden");
    if (progress) progress.textContent = "";
  }
};

Board.prototype.setAlgorithmSelectionUI = function (label) {
  var labelElement = document.getElementById("algoSelectLabel");
  if (!labelElement) return;
  labelElement.textContent = label || "Select Algorithm";
};

Board.prototype.syncAlgorithmSelectionUI = function () {
  var selection = getSelectionByState(this.currentAlgorithm, this.currentHeuristic);
  if (!selection) {
    this.setAlgorithmSelectionUI("Select Algorithm");
    return;
  }
  this.setAlgorithmSelectionUI(selection.label);
};

Board.prototype.applyAlgorithmSelection = function (selection) {
  if (!selection) return;
  this.currentAlgorithm = selection.algorithm;
  this.currentHeuristic = selection.heuristic || null;
  if (selection.clearWeights) this.clearWeights();
  this.clearPath("clickedButton");
  this.changeStartNodeImages();
  this.setAlgorithmSelectionUI(selection.label);
};

Board.prototype.pulseAlgoSelectButton = function () {
  var algoButton = document.getElementById("algoSelectBtn");
  if (!algoButton) return;
  algoButton.classList.remove("pulse");
  void algoButton.offsetWidth;
  algoButton.classList.add("pulse");
  if (this.algoSelectPulseTimer) {
    clearTimeout(this.algoSelectPulseTimer);
  }
  this.algoSelectPulseTimer = setTimeout(function () {
    algoButton.classList.remove("pulse");
  }, 1200);
};

Board.prototype.bindNavInfoOnlyHandlers = function () {
  Object.keys(NAV_INFO_MAP).forEach(function (id) {
    var navItem = document.getElementById(id);
    if (!navItem) return;
    navItem.onclick = function (event) {
      if (event) event.preventDefault();
      algorithmModal.showAlgorithmInfo(NAV_INFO_MAP[id]);
    };
  });
};

Board.prototype.bindAlgoDropupHandlers = function () {
  var currentObject = this;
  Object.keys(ALGO_SELECTION_MAP).forEach(function (id) {
    var optionEl = document.getElementById(id);
    if (!optionEl) return;
    optionEl.onclick = function (event) {
      if (event) event.preventDefault();
      if (!currentObject.buttonsOn) return;
      currentObject.applyAlgorithmSelection(ALGO_SELECTION_MAP[id]);
      var algoSelectBtn = document.getElementById("algoSelectBtn");
      if (algoSelectBtn && algoSelectBtn.parentNode) {
        algoSelectBtn.parentNode.classList.remove("open");
      }
    };
  });
};

Board.prototype.runVisualization = function () {
  if (historyUI && typeof historyUI.getRunContext === "function" && typeof historyUI.setRunContext === "function") {
    var runContext = historyUI.getRunContext(this);
    if (!runContext || runContext.mode !== "replay") {
      historyUI.setRunContext(this, { mode: "visualize", sourceRunId: null });
    }
  }

  this.clearPath("clickedButton");
  this.toggleButtons();
  let weightedAlgorithms = ["dijkstra", "CLA", "greedy"];
  let unweightedAlgorithms = ["dfs", "bfs"];
  let success;
  if (this.currentAlgorithm === "bidirectional") {
    if (!this.numberOfObjects) {
      success = bidirectional(this.nodes, this.start, this.target, this.nodesToAnimate, this.boardArray, this.currentAlgorithm, this.currentHeuristic, this, this.currentTrace);
      launchAnimations(this, success, "weighted");
    } else {
      this.isObject = true;
      success = bidirectional(this.nodes, this.start, this.object, this.nodesToAnimate, this.boardArray, this.currentAlgorithm, this.currentHeuristic, this, this.currentTrace);
      launchAnimations(this, success, "weighted");
    }
    this.algoDone = true;
  } else if (this.currentAlgorithm === "astar") {
    if (!this.numberOfObjects) {
      success = weightedSearchAlgorithm(this.nodes, this.start, this.target, this.nodesToAnimate, this.boardArray, this.currentAlgorithm, this.currentHeuristic, this.currentTrace);
      launchAnimations(this, success, "weighted");
    } else {
      this.isObject = true;
      success = weightedSearchAlgorithm(this.nodes, this.start, this.object, this.objectNodesToAnimate, this.boardArray, this.currentAlgorithm, this.currentHeuristic, this.currentTrace);
      launchAnimations(this, success, "weighted", "object", this.currentAlgorithm);
    }
    this.algoDone = true;
  } else if (weightedAlgorithms.includes(this.currentAlgorithm)) {
    if (!this.numberOfObjects) {
      success = weightedSearchAlgorithm(this.nodes, this.start, this.target, this.nodesToAnimate, this.boardArray, this.currentAlgorithm, this.currentHeuristic, this.currentTrace);
      launchAnimations(this, success, "weighted");
    } else {
      this.isObject = true;
      success = weightedSearchAlgorithm(this.nodes, this.start, this.object, this.objectNodesToAnimate, this.boardArray, this.currentAlgorithm, this.currentHeuristic, this.currentTrace);
      launchAnimations(this, success, "weighted", "object", this.currentAlgorithm, this.currentHeuristic);
    }
    this.algoDone = true;
  } else if (unweightedAlgorithms.includes(this.currentAlgorithm)) {
    if (!this.numberOfObjects) {
      success = unweightedSearchAlgorithm(this.nodes, this.start, this.target, this.nodesToAnimate, this.boardArray, this.currentAlgorithm, this.currentTrace);
      launchAnimations(this, success, "unweighted");
    } else {
      this.isObject = true;
      success = unweightedSearchAlgorithm(this.nodes, this.start, this.object, this.objectNodesToAnimate, this.boardArray, this.currentAlgorithm, this.currentTrace);
      launchAnimations(this, success, "unweighted", "object", this.currentAlgorithm);
    }
    this.algoDone = true;
  }
};

Board.prototype.bindStartVisualizeHandler = function () {
  var currentObject = this;
  var startContainer = document.getElementById("startButtonStart");
  var actualStartButton = document.getElementById("actualStartButton");
  if (!startContainer || !actualStartButton) return;
  var handleStart = function (event) {
    if (event) event.preventDefault();
    if (!currentObject.buttonsOn) return;
    if (!currentObject.currentAlgorithm) {
      currentObject.pulseAlgoSelectButton();
      return;
    }
    currentObject.runVisualization();
  };
  startContainer.onclick = handleStart;
  actualStartButton.onclick = function (event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    handleStart(event);
  };
};

Board.prototype.setInteractiveControlsEnabled = function (isEnabled) {
  var isDisabled = !isEnabled;
  var algoSelectBtn = document.getElementById("algoSelectBtn");
  var adjustSpeedBtn = document.getElementById("adjustSpeed");
  var actualStartButton = document.getElementById("actualStartButton");
  var weightSlider = document.getElementById("weightSlider");
  var sidebarMazeBtn = document.getElementById("sidebarMazeBtn");
  var sidebarClearPath = document.getElementById("sidebarClearPath");
  var sidebarClearWalls = document.getElementById("sidebarClearWalls");
  var sidebarClearBoard = document.getElementById("sidebarClearBoard");
  var algoDropdown = document.querySelector("#playbackPod .playback-algo-dropdown");
  var speedDropdown = document.querySelector("#playbackPod .playback-speed-dropdown");
  var dropdowns = document.querySelectorAll("#playbackPod .dropdown");
  var toggleItemIds = Object.keys(ALGO_SELECTION_MAP).concat(["adjustFast", "adjustAverage", "adjustSlow"]);

  if (algoSelectBtn) {
    algoSelectBtn.disabled = isDisabled;
    algoSelectBtn.classList.toggle("control-disabled", isDisabled);
  }
  if (adjustSpeedBtn) {
    adjustSpeedBtn.disabled = isDisabled;
    adjustSpeedBtn.classList.toggle("control-disabled", isDisabled);
  }
  if (actualStartButton) {
    actualStartButton.disabled = isDisabled;
    actualStartButton.classList.toggle("control-disabled", isDisabled);
  }
  if (weightSlider) weightSlider.disabled = isDisabled;
  if (sidebarMazeBtn) sidebarMazeBtn.disabled = isDisabled;
  if (sidebarClearPath) {
    sidebarClearPath.disabled = isDisabled;
    sidebarClearPath.classList.toggle("control-disabled", isDisabled);
  }
  if (sidebarClearWalls) {
    sidebarClearWalls.disabled = isDisabled;
    sidebarClearWalls.classList.toggle("control-disabled", isDisabled);
  }
  if (sidebarClearBoard) {
    sidebarClearBoard.disabled = isDisabled;
    sidebarClearBoard.classList.toggle("control-disabled", isDisabled);
  }
  if (algoDropdown) {
    algoDropdown.classList.toggle("control-disabled", isDisabled);
  }
  if (speedDropdown) {
    speedDropdown.classList.toggle("control-disabled", isDisabled);
  }

  toggleItemIds.forEach(function (id) {
    var element = document.getElementById(id);
    if (element) element.classList.toggle("control-disabled", isDisabled);
  });

  if (dropdowns && isDisabled) {
    for (var i = 0; i < dropdowns.length; i++) {
      dropdowns[i].classList.remove("open");
    }
  }

  if (historyUI && typeof historyUI.setHistoryLocked === "function") {
    historyUI.setHistoryLocked(this, isDisabled);
  }
};

Board.prototype.initExplanationPanel = function () {
  this.initSidebar();
};

Board.prototype.toggleExplanationPanel = function () {
  this.toggleSidebar();
};

Board.prototype.updateExplanationPanel = function (event) {
  var insightPlaceholder = document.getElementById("insightPlaceholder");

  if (!event) {
    if (insightPlaceholder) insightPlaceholder.classList.remove("hidden");
    document.getElementById("stepNumber").textContent = "—";
    document.getElementById("currentNodeInfo").querySelector(".node-coords").textContent = "—";
    document.getElementById("gCost").textContent = "—";
    document.getElementById("hCost").textContent = "—";
    document.getElementById("fCost").textContent = "—";
    document.getElementById("explanationText").textContent = "No algorithm running.";
    document.getElementById("frontierSize").textContent = "—";
    document.getElementById("visitedCountLive").textContent = "—";
    return;
  }

  if (insightPlaceholder) insightPlaceholder.classList.add("hidden");

  var cached = this.lastKnownPanelValues;
  var computedCost = null;
  if (event.t === "found_target") {
    var costObj = this.computePathCost();
    computedCost = costObj ? costObj.cost : null;
    if (event.metrics && computedCost !== null) {
      event.metrics.pathCost = computedCost;
    }
  }

  var algoKey = algorithmDescriptions.getAlgorithmKey(this.currentAlgorithm, this.currentHeuristic);
  var isSwarm = algoKey === "swarm" || algoKey === "convergentSwarm";
  var relaxNodeScore = null;
  if (isSwarm && event && event.t === "relax_neighbor" && event.to && this.nodes[event.to]) {
    relaxNodeScore = this.nodes[event.to].gScore;
  }
  var explanationEvent = event;
  if (isSwarm && event && event.t === "relax_neighbor" && relaxNodeScore !== null && event.new) {
    explanationEvent = Object.assign({}, event, {
      new: Object.assign({}, event.new, { g: relaxNodeScore, f: relaxNodeScore })
    });
  }
  var explanation = explanationTemplates.generateExplanation(explanationEvent, algoKey);

  var gLabel = document.getElementById("gLabel");
  var hLabel = document.getElementById("hLabel");
  var fLabel = document.getElementById("fLabel");
  if (gLabel && hLabel && fLabel) {
    if (isSwarm) {
      gLabel.textContent = "Score:";
      hLabel.textContent = "Heuristic:";
      fLabel.textContent = "Score:";
    } else {
      gLabel.textContent = "g:";
      hLabel.textContent = "h:";
      fLabel.textContent = "f:";
    }
  }

  document.getElementById("stepNumber").textContent = event.step;
  document.getElementById("explanationText").textContent = explanation;

  if (event.current) {
    cached.currentNode = event.current;
    var coords = event.current.replace("-", ",");
    document.getElementById("currentNodeInfo").querySelector(".node-coords").textContent = "(" + coords + ")";
  } else if (event.t === "found_target" && event.target) {
    cached.currentNode = event.target;
    var targetCoords = event.target.replace("-", ",");
    document.getElementById("currentNodeInfo").querySelector(".node-coords").textContent = "(" + targetCoords + ")";
  } else if (event.t === "relax_neighbor" && event.to) {
    var toCoords = event.to.replace("-", ",");
    document.getElementById("currentNodeInfo").querySelector(".node-coords").textContent = "(" + toCoords + ")";
  } else if (event.from) {
    var fromCoords = event.from.replace("-", ",");
    document.getElementById("currentNodeInfo").querySelector(".node-coords").textContent = "(" + fromCoords + ")";
  } else if (cached.currentNode) {
    var cachedCoords = cached.currentNode.replace("-", ",");
    document.getElementById("currentNodeInfo").querySelector(".node-coords").textContent = "(" + cachedCoords + ")";
  }

  if (event.values) {
    if (event.values.g !== undefined) cached.g = event.values.g;
    if (event.values.h !== undefined) cached.h = event.values.h;
    if (event.values.f !== undefined) cached.f = event.values.f;
  } else if (event.t === "relax_neighbor" && event.new) {
    if (isSwarm) {
      if (relaxNodeScore !== null && relaxNodeScore !== undefined) {
        cached.g = relaxNodeScore;
        cached.f = relaxNodeScore;
      }
    } else {
      if (event.new.g !== undefined) cached.g = event.new.g;
      if (event.new.f !== undefined) cached.f = event.new.f;
    }
  }
  if (event.t === "found_target" && computedCost !== null) {
    cached.g = computedCost;
    cached.h = 0;
    cached.f = computedCost;
  }

  if (isSwarm) {
    var currentId = event.current || event.from || event.target || cached.currentNode;
    var heuristic = null;
    if (currentId && this.target) {
      var currentParts = currentId.split("-").map(Number);
      var targetParts = this.target.split("-").map(Number);
      if (currentParts.length === 2 && targetParts.length === 2) {
        heuristic = Math.abs(currentParts[0] - targetParts[0]) + Math.abs(currentParts[1] - targetParts[1]);
      }
    }
    var useRelaxScore = event && event.t === "relax_neighbor" && relaxNodeScore !== null && relaxNodeScore !== undefined;
    document.getElementById("gCost").textContent = useRelaxScore ? relaxNodeScore : (cached.g !== null ? cached.g : "—");
    document.getElementById("hCost").textContent = heuristic !== null ? heuristic : "—";
    document.getElementById("fCost").textContent = useRelaxScore ? relaxNodeScore : (cached.g !== null ? cached.g : "—");
  } else {
    document.getElementById("gCost").textContent = cached.g !== null ? cached.g : "—";
    document.getElementById("hCost").textContent = cached.h !== null ? cached.h : "—";
    document.getElementById("fCost").textContent = cached.f !== null ? cached.f : "—";
  }

  if (event.metrics) {
    if (event.metrics.frontierSize !== undefined) cached.frontierSize = event.metrics.frontierSize;
    if (event.metrics.visitedCount !== undefined) cached.visitedCount = event.metrics.visitedCount;
  }
  if (event.t === "found_target" && cached.visitedCount !== null) {
    var totalNodes = Object.keys(this.nodes).length;
    cached.frontierSize = totalNodes - cached.visitedCount;
  }

  document.getElementById("frontierSize").textContent = cached.frontierSize !== null ? cached.frontierSize : "—";
  document.getElementById("visitedCountLive").textContent = cached.visitedCount !== null ? cached.visitedCount : "—";
};

Board.prototype.createGrid = function () {
  let tableHTML = "";
  for (let r = 0; r < this.height; r++) {
    let currentArrayRow = [];
    let currentHTMLRow = `<tr id="row ${r}">`;
    for (let c = 0; c < this.width; c++) {
      let newNodeId = `${r}-${c}`, newNodeClass, newNode;
      if (r === Math.floor(this.height / 2) && c === Math.floor(this.width / 4)) {
        newNodeClass = "start";
        this.start = `${newNodeId}`;
      } else if (r === Math.floor(this.height / 2) && c === Math.floor(3 * this.width / 4)) {
        newNodeClass = "target";
        this.target = `${newNodeId}`;
      } else {
        newNodeClass = "unvisited";
      }
      newNode = new Node(newNodeId, newNodeClass);
      currentArrayRow.push(newNode);
      currentHTMLRow += `<td id="${newNodeId}" class="${newNodeClass}"></td>`;
      this.nodes[`${newNodeId}`] = newNode;
    }
    this.boardArray.push(currentArrayRow);
    tableHTML += `${currentHTMLRow}</tr>`;
  }
  let board = document.getElementById("board");
  board.innerHTML = tableHTML;
};

Board.prototype.addEventListeners = function () {
  let board = this;
  for (let r = 0; r < board.height; r++) {
    for (let c = 0; c < board.width; c++) {
      let currentId = `${r}-${c}`;
      let currentNode = board.getNode(currentId);
      let currentElement = document.getElementById(currentId);
      currentElement.onmousedown = (e) => {
        e.preventDefault();
        if (this.buttonsOn) {
          board.mouseDown = true;
          if (currentNode.status === "start" || currentNode.status === "target") {
            board.pressedNodeStatus = currentNode.status;
          } else {
            board.pressedNodeStatus = "normal";
            board.changeNormalNode(currentNode);
          }
        }
      }
      currentElement.onmouseup = () => {
        if (this.buttonsOn) {
          board.mouseDown = false;
          if (board.pressedNodeStatus === "target") {
            board.target = currentId;
          } else if (board.pressedNodeStatus === "start") {
            board.start = currentId;
          }
          board.pressedNodeStatus = "normal";
        }
      }
      currentElement.onmouseenter = () => {
        if (this.buttonsOn) {
          if (board.mouseDown && board.pressedNodeStatus !== "normal") {
            board.changeSpecialNode(currentNode);
            if (board.pressedNodeStatus === "target") {
              board.target = currentId;
              if (board.algoDone) {
                board.redoAlgorithm();
              }
            } else if (board.pressedNodeStatus === "start") {
              board.start = currentId;
              if (board.algoDone) {
                board.redoAlgorithm();
              }
            }
          } else if (board.mouseDown) {
            board.changeNormalNode(currentNode);
          }
        }
      }
      currentElement.onmouseleave = () => {
        if (this.buttonsOn) {
          if (board.mouseDown && board.pressedNodeStatus !== "normal") {
            board.changeSpecialNode(currentNode);
          }
        }
      }
    }
  }
};

Board.prototype.getNode = function (id) {
  let coordinates = id.split("-");
  let r = parseInt(coordinates[0]);
  let c = parseInt(coordinates[1]);
  return this.boardArray[r][c];
};

Board.prototype.changeSpecialNode = function (currentNode) {
  let element = document.getElementById(currentNode.id), previousElement;
  if (this.previouslySwitchedNode) previousElement = document.getElementById(this.previouslySwitchedNode.id);
  if (currentNode.status !== "target" && currentNode.status !== "start") {
    if (this.previouslySwitchedNode) {
      this.previouslySwitchedNode.status = this.previouslyPressedNodeStatus;
      previousElement.className = this.previouslySwitchedNodeWeight > 0 ?
        "unvisited weight" : this.previouslyPressedNodeStatus;
      this.previouslySwitchedNode.weight = this.previouslySwitchedNodeWeight;
      this.previouslySwitchedNode = null;
      this.previouslySwitchedNodeWeight = currentNode.weight;

      this.previouslyPressedNodeStatus = currentNode.status;
      element.className = this.pressedNodeStatus;
      currentNode.status = this.pressedNodeStatus;

      currentNode.weight = 0;
    }
  } else if (currentNode.status !== this.pressedNodeStatus && !this.algoDone) {
    this.previouslySwitchedNode.status = this.pressedNodeStatus;
    previousElement.className = this.pressedNodeStatus;
  } else if (currentNode.status === this.pressedNodeStatus) {
    this.previouslySwitchedNode = currentNode;
    element.className = this.previouslyPressedNodeStatus;
    currentNode.status = this.previouslyPressedNodeStatus;
  }
};

Board.prototype.changeNormalNode = function (currentNode) {
  let element = document.getElementById(currentNode.id);
  let relevantStatuses = ["start", "target"];
  let unweightedAlgorithms = ["dfs", "bfs"]
  if (!this.keyDown) {
    if (!relevantStatuses.includes(currentNode.status)) {
      element.className = currentNode.status !== "wall" ?
        "wall" : "unvisited";
      currentNode.status = element.className !== "wall" ?
        "unvisited" : "wall";
      currentNode.weight = 0;
    }
  } else if (this.keyDown === 87 && !unweightedAlgorithms.includes(this.currentAlgorithm)) {
    if (!relevantStatuses.includes(currentNode.status)) {
      if (this.currentWeightValue === 0) {
        element.className = "unvisited";
        currentNode.weight = 0;
        currentNode.status = "unvisited";
      } else {
        element.className = currentNode.weight === 0 ?
          "unvisited weight" : "unvisited";
        currentNode.weight = element.className !== "unvisited weight" ?
          0 : this.currentWeightValue;
        currentNode.status = "unvisited";
      }
    }
  }
};

Board.prototype.drawShortestPath = function (targetNodeId, startNodeId) {
  let currentNode;
  if (this.currentAlgorithm !== "bidirectional") {
    currentNode = this.nodes[this.nodes[targetNodeId].previousNode];
    while (currentNode.id !== startNodeId) {
      this.shortestPathNodesToAnimate.unshift(currentNode);
      document.getElementById(currentNode.id).className = `shortest-path`;
      currentNode = this.nodes[currentNode.previousNode];
    }
  } else {
    if (this.middleNode !== this.target && this.middleNode !== this.start) {
      currentNode = this.nodes[this.nodes[this.middleNode].previousNode];
      secondCurrentNode = this.nodes[this.nodes[this.middleNode].otherpreviousNode];
      if (secondCurrentNode.id === this.target) {
        this.nodes[this.target].direction = getDistance(this.nodes[this.middleNode], this.nodes[this.target])[2];
      }
      if (this.nodes[this.middleNode].weight === 0) {
        document.getElementById(this.middleNode).className = `shortest-path`;
      } else {
        document.getElementById(this.middleNode).className = `shortest-path weight`;
      }
      while (currentNode.id !== startNodeId) {
        this.shortestPathNodesToAnimate.unshift(currentNode);
        document.getElementById(currentNode.id).className = `shortest-path`;
        currentNode = this.nodes[currentNode.previousNode];
      }
      while (secondCurrentNode.id !== targetNodeId) {
        this.shortestPathNodesToAnimate.unshift(secondCurrentNode);
        document.getElementById(secondCurrentNode.id).className = `shortest-path`;
        if (secondCurrentNode.otherpreviousNode === targetNodeId) {
          if (secondCurrentNode.otherdirection === "left") {
            secondCurrentNode.direction = "right";
          } else if (secondCurrentNode.otherdirection === "right") {
            secondCurrentNode.direction = "left";
          } else if (secondCurrentNode.otherdirection === "up") {
            secondCurrentNode.direction = "down";
          } else if (secondCurrentNode.otherdirection === "down") {
            secondCurrentNode.direction = "up";
          }
          this.nodes[this.target].direction = getDistance(secondCurrentNode, this.nodes[this.target])[2];
        }
        secondCurrentNode = this.nodes[secondCurrentNode.otherpreviousNode]
      }
    } else {
      document.getElementById(this.nodes[this.target].previousNode).className = `shortest-path`;
    }
  }
};

Board.prototype.addShortestPath = function (targetNodeId, startNodeId) {
  let currentNode = this.nodes[this.nodes[targetNodeId].previousNode];
  while (currentNode.id !== startNodeId) {
    this.shortestPathNodesToAnimate.unshift(currentNode);
    currentNode = this.nodes[currentNode.previousNode];
  }
};

Board.prototype.drawShortestPathTimeout = function (targetNodeId, startNodeId, type) {
  let board = this;
  let currentNode;
  let secondCurrentNode;
  let currentNodesToAnimate;

  if (board.currentAlgorithm !== "bidirectional") {
    currentNode = board.nodes[board.nodes[targetNodeId].previousNode];
    currentNodesToAnimate = [];
    while (currentNode.id !== startNodeId) {
      currentNodesToAnimate.unshift(currentNode);
      currentNode = board.nodes[currentNode.previousNode];
    }
  } else {
    if (board.middleNode !== board.target && board.middleNode !== board.start) {
      currentNode = board.nodes[board.nodes[board.middleNode].previousNode];
      secondCurrentNode = board.nodes[board.nodes[board.middleNode].otherpreviousNode];
      if (secondCurrentNode.id === board.target) {
        board.nodes[board.target].direction = getDistance(board.nodes[board.middleNode], board.nodes[board.target])[2];
      }
      currentNodesToAnimate = [];
      board.nodes[board.middleNode].direction = getDistance(currentNode, board.nodes[board.middleNode])[2];
      while (currentNode.id !== startNodeId) {
        currentNodesToAnimate.unshift(currentNode);
        currentNode = board.nodes[currentNode.previousNode];
      }
      currentNodesToAnimate.push(board.nodes[board.middleNode]);
      while (secondCurrentNode.id !== targetNodeId) {
        if (secondCurrentNode.otherdirection === "left") {
          secondCurrentNode.direction = "right";
        } else if (secondCurrentNode.otherdirection === "right") {
          secondCurrentNode.direction = "left";
        } else if (secondCurrentNode.otherdirection === "up") {
          secondCurrentNode.direction = "down";
        } else if (secondCurrentNode.otherdirection === "down") {
          secondCurrentNode.direction = "up";
        }
        currentNodesToAnimate.push(secondCurrentNode);
        if (secondCurrentNode.otherpreviousNode === targetNodeId) {
          board.nodes[board.target].direction = getDistance(secondCurrentNode, board.nodes[board.target])[2];
        }
        secondCurrentNode = board.nodes[secondCurrentNode.otherpreviousNode]
      }
    } else {
      currentNodesToAnimate = [];
      let target = board.nodes[board.target];
      currentNodesToAnimate.push(board.nodes[target.previousNode], target);
    }

  }

  // Preserve computed shortest path for UI + history (especially bidirectional)
  board.shortestPathNodesToAnimate = currentNodesToAnimate.slice(0);

  var controller = board.animationController;
  var totalPathFrames = currentNodesToAnimate.length;
  var controls = document.getElementById("animationControls");
  var progressEl = document.getElementById("animationProgress");

  if (board.speed !== "fast") {
    if (controls) controls.classList.remove("hidden");
  } else {
    if (controls) controls.classList.add("hidden");
    if (progressEl) progressEl.textContent = "";
  }

  function onPathFrame(index) {
    var progressIndex = Math.min(index + 1, totalPathFrames + 1);
    if (progressEl) {
      progressEl.textContent = "Path " + progressIndex + "/" + (totalPathFrames + 1);
    }

    if (historyUI && typeof historyUI.updatePendingRun === "function") {
      historyUI.updatePendingRun(board, board.currentRunToken, {
        phase: "path",
        current: progressIndex,
        total: totalPathFrames + 1,
        statusText: "Path " + progressIndex + "/" + (totalPathFrames + 1)
      });
    }

    if (!currentNodesToAnimate.length) currentNodesToAnimate.push(board.nodes[board.start]);

    if (index === 0) {
      shortestPathChange(currentNodesToAnimate[index]);
    } else if (index < currentNodesToAnimate.length) {
      shortestPathChange(currentNodesToAnimate[index], currentNodesToAnimate[index - 1]);
    } else if (index === currentNodesToAnimate.length) {
      shortestPathChange(board.nodes[board.target], currentNodesToAnimate[index - 1], "isActualTarget");
    }
  }

  function onPathComplete() {
    if (controls) controls.classList.add("hidden");
    if (progressEl) progressEl.textContent = "";
    if (historyUI && typeof historyUI.resolvePendingRun === "function") {
      historyUI.resolvePendingRun(board, board.currentRunToken, { status: "success" });
    }
    board.currentRunToken = null;
    board.toggleButtons();
    var visitedCount = board.lastVisitedCount !== undefined ? board.lastVisitedCount :
      (board.nodesToAnimate ? board.nodesToAnimate.length : 0);
    var costObj = board.computePathCost();
    var pathLength = costObj && costObj.pathLength ? costObj.pathLength : 0;
    var pathCost = costObj && costObj.cost ? costObj.cost : 0;
    var totalNodes = Object.keys(board.nodes).length;
    var frontierSize = Math.max(totalNodes - visitedCount, 0);

    // Ensure panel ends on a final event with fresh values/metrics
    if (board.currentTrace) {
      var lastEvent = board.currentTrace[board.currentTrace.length - 1];
      var finalValues = { g: pathCost, h: 0, f: pathCost };
      var finalMetrics = {
        visitedCount: visitedCount,
        pathCost: pathCost,
        frontierSize: frontierSize
      };

      if (lastEvent && lastEvent.t === "found_target") {
        lastEvent.values = finalValues;
        lastEvent.metrics = Object.assign({}, lastEvent.metrics, finalMetrics);
        board.updateExplanationPanel(lastEvent);
      } else {
        var finalEvent = {
          t: "found_target",
          step: board.currentTrace.length,
          target: board.target,
          values: finalValues,
          metrics: finalMetrics
        };
        board.currentTrace.push(finalEvent);
        board.updateExplanationPanel(finalEvent);
      }
    }

    if (visitedCount > 0 && pathLength > 0) {
      aiExplain.requestAIExplanation(board, visitedCount, pathLength);
    }

    var impactDisplay = document.getElementById("weightImpactDisplay");
    var impactText = document.getElementById("weightImpactText");
    if (impactText) {
      var impact = weightImpactAnalyzer.analyzeWeightImpact(board);
      impactText.textContent = impact.explanation;
      if (impactDisplay) {
        impactDisplay.classList.remove("hidden");
      }
    }
  }

  controller.start(totalPathFrames, 40, onPathFrame, onPathComplete, "shortestPath");


  function shortestPathChange(currentNode, previousNode, isActualTarget) {
    if (currentNode.id !== board.start) {
      if (currentNode.id !== board.target || currentNode.id === board.target && isActualTarget) {
        let currentHTMLNode = document.getElementById(currentNode.id);
        if (type === "unweighted") {
          currentHTMLNode.className = "shortest-path-unweighted";
        } else {
          if (currentNode.direction === "up") {
            currentHTMLNode.className = "shortest-path-up";
          } else if (currentNode.direction === "down") {
            currentHTMLNode.className = "shortest-path-down";
          } else if (currentNode.direction === "right") {
            currentHTMLNode.className = "shortest-path-right";
          } else if (currentNode.direction === "left") {
            currentHTMLNode.className = "shortest-path-left";
          } else {
            currentHTMLNode.className = "shortest-path";
          }
        }
      }
    }
    if (previousNode) {
      if (previousNode.id !== board.target && previousNode.id !== board.start) {
        let previousHTMLNode = document.getElementById(previousNode.id);
        previousHTMLNode.className = previousNode.weight > 0 ? "shortest-path weight" : "shortest-path";
      }
    } else {
      let element = document.getElementById(board.start);
      element.className = "startTransparent";
    }
  }





};

Board.prototype.createMazeOne = function (type) {
  Object.keys(this.nodes).forEach(node => {
    let random = Math.random();
    let currentHTMLNode = document.getElementById(node);
    let relevantClassNames = ["start", "target"]
    let randomTwo = type === "wall" ? 0.25 : 0.35;
    if (random < randomTwo && !relevantClassNames.includes(currentHTMLNode.className)) {
      if (type === "wall") {
        currentHTMLNode.className = "wall";
        this.nodes[node].status = "wall";
        this.nodes[node].weight = 0;
      } else if (type === "weight") {
        currentHTMLNode.className = "unvisited weight";
        this.nodes[node].status = "unvisited";
        this.nodes[node].weight = this.currentWeightValue;
      }
    }
  });
};

Board.prototype.computePathCost = function () {
  if (this.currentAlgorithm === "bidirectional" &&
    this.shortestPathNodesToAnimate &&
    this.shortestPathNodesToAnimate.length) {
    let cost = 0;
    let pathLength = 0;
    let includesStart = false;
    let includesTarget = false;

    for (let i = 0; i < this.shortestPathNodesToAnimate.length; i++) {
      let node = this.shortestPathNodesToAnimate[i];
      if (node.id === this.start) includesStart = true;
      if (node.id === this.target) includesTarget = true;
      cost += node.weight > 0 ? node.weight : 1;
      pathLength++;
    }

    if (!includesStart) {
      cost += 1;
      pathLength++;
    }
    if (!includesTarget) {
      cost += 1;
      pathLength++;
    }

    return { cost: cost, pathLength: pathLength };
  }

  let cost = 0;
  let pathLength = 0;
  let currentId = this.target;

  while (currentId && currentId !== this.start) {
    let node = this.nodes[currentId];
    cost += node.weight > 0 ? node.weight : 1;
    pathLength++;
    currentId = node.previousNode;
  }

  if (currentId === this.start) {
    cost += 1;
    pathLength++;
  }

  return { cost: cost, pathLength: pathLength };
};

Board.prototype.displayPathCost = function (visitedCount) {
  let metrics = this.computePathCost();
  let costEl = document.getElementById("pathCost");
  let lengthEl = document.getElementById("pathLength");
  let visitedEl = document.getElementById("visitedCount");
  if (costEl) costEl.textContent = metrics.cost;
  if (lengthEl) lengthEl.textContent = metrics.pathLength;
  if (visitedEl) visitedEl.textContent = visitedCount;

  let resultsEl = document.getElementById("resultsBar");
  let legacyEl = document.getElementById("pathCostDisplay");
  if (resultsEl) {
    resultsEl.classList.remove("hidden");
  } else if (legacyEl) {
    legacyEl.classList.remove("hidden");
  }
};

Board.prototype.hidePathCost = function () {
  let resultsEl = document.getElementById("resultsBar");
  let legacyEl = document.getElementById("pathCostDisplay");
  if (resultsEl) {
    resultsEl.classList.add("hidden");
  } else if (legacyEl) {
    legacyEl.classList.add("hidden");
  }
};

Board.prototype.clearPath = function (clickedButton) {
  if (historyUI && typeof historyUI.clearPendingRun === "function" && this.currentRunToken) {
    historyUI.clearPendingRun(this, this.currentRunToken);
    this.currentRunToken = null;
  }
  if (this.animationController) this.animationController.stop();
  var controls = document.getElementById("animationControls");
  if (controls) controls.classList.add("hidden");
  var progressEl = document.getElementById("animationProgress");
  if (progressEl) progressEl.textContent = "";
  this.currentTrace = [];
  this.traceCursor = 0;
  this.lastVisitedCount = 0;
  this.shortestPathNodesToAnimate = [];
  this.lastKnownPanelValues = {
    g: null,
    h: null,
    f: null,
    frontierSize: null,
    visitedCount: null,
    currentNode: null
  };
  this.updateExplanationPanel(null);
  var impactDisplay = document.getElementById("weightImpactDisplay");
  if (impactDisplay) {
    impactDisplay.classList.add("hidden");
  }
  var impactText = document.getElementById("weightImpactText");
  if (impactText) {
    impactText.textContent = "";
  }
  if (clickedButton) {
    this.hidePathCost();
    aiExplain.hideAIExplanation();
    let start = this.nodes[this.start];
    let target = this.nodes[this.target];
    start.status = "start";
    document.getElementById(start.id).className = "start";
    target.status = "target";
    document.getElementById(target.id).className = "target";
  }
  this.bindStartVisualizeHandler();

  this.algoDone = false;
  Object.keys(this.nodes).forEach(id => {
    let currentNode = this.nodes[id];
    currentNode.previousNode = null;
    currentNode.distance = Infinity;
    currentNode.totalDistance = Infinity;
    currentNode.heuristicDistance = null;
    currentNode.direction = null;
    currentNode.storedDirection = null;
    currentNode.otherpreviousNode = null;
    currentNode.otherdistance = Infinity;
    currentNode.otherdirection = null;
    let currentHTMLNode = document.getElementById(id);
    let relevantStatuses = ["wall", "start", "target"];
    if (!relevantStatuses.includes(currentNode.status) && currentNode.weight === 0) {
      currentNode.status = "unvisited";
      currentHTMLNode.className = "unvisited";
    } else if (currentNode.weight > 0) {
      currentNode.status = "unvisited";
      currentHTMLNode.className = "unvisited weight";
    }
  });
};

Board.prototype.clearWalls = function () {
  this.clearPath("clickedButton");
  Object.keys(this.nodes).forEach(id => {
    let currentNode = this.nodes[id];
    let currentHTMLNode = document.getElementById(id);
    if (currentNode.status === "wall" || currentNode.weight > 0) {
      currentNode.status = "unvisited";
      currentNode.weight = 0;
      currentHTMLNode.className = "unvisited";
    }
  });
}

Board.prototype.clearBoard = function () {
  if (historyUI && typeof historyUI.clearPendingRun === "function" && this.currentRunToken) {
    historyUI.clearPendingRun(this, this.currentRunToken);
    this.currentRunToken = null;
  }
  if (this.animationController) this.animationController.stop();
  var controls = document.getElementById("animationControls");
  if (controls) controls.classList.add("hidden");
  var progressEl = document.getElementById("animationProgress");
  if (progressEl) progressEl.textContent = "";
  this.currentTrace = [];
  this.updateExplanationPanel(null);
  var impactDisplay = document.getElementById("weightImpactDisplay");
  if (impactDisplay) {
    impactDisplay.classList.add("hidden");
  }
  var impactText = document.getElementById("weightImpactText");
  if (impactText) {
    impactText.textContent = "";
  }
  let height = this.height;
  let width = this.width;
  let start = Math.floor(height / 2).toString() + "-" + Math.floor(width / 4).toString();
  let target = Math.floor(height / 2).toString() + "-" + Math.floor(3 * width / 4).toString();

  Object.keys(this.nodes).forEach(id => {
    let currentNode = this.nodes[id];
    let currentHTMLNode = document.getElementById(id);
    if (id === start) {
      currentHTMLNode.className = "start";
      currentNode.status = "start";
    } else if (id === target) {
      currentHTMLNode.className = "target";
      currentNode.status = "target"
    } else {
      currentHTMLNode.className = "unvisited";
      currentNode.status = "unvisited";
    }
    currentNode.previousNode = null;
    currentNode.path = null;
    currentNode.direction = null;
    currentNode.storedDirection = null;
    currentNode.distance = Infinity;
    currentNode.totalDistance = Infinity;
    currentNode.heuristicDistance = null;
    currentNode.weight = 0;

  });
  this.start = start;
  this.target = target;
  this.nodesToAnimate = [];
  this.shortestPathNodesToAnimate = [];
  this.wallsToAnimate = [];
  this.mouseDown = false;
  this.pressedNodeStatus = "normal";
  this.previouslyPressedNodeStatus = null;
  this.previouslySwitchedNode = null;
  this.previouslySwitchedNodeWeight = 0;
  this.keyDown = false;
  this.algoDone = false;
  this.clearPath("clickedButton");
  this.bindStartVisualizeHandler();
};

Board.prototype.clearWeights = function () {
  Object.keys(this.nodes).forEach(id => {
    let currentNode = this.nodes[id];
    let currentHTMLNode = document.getElementById(id);
    if (currentNode.weight > 0) {
      currentNode.status = "unvisited";
      currentNode.weight = 0;
      currentHTMLNode.className = "unvisited";
    }
  });
}

Board.prototype.clearNodeStatuses = function () {
  Object.keys(this.nodes).forEach(id => {
    let currentNode = this.nodes[id];
    currentNode.previousNode = null;
    currentNode.distance = Infinity;
    currentNode.totalDistance = Infinity;
    currentNode.heuristicDistance = null;
    currentNode.storedDirection = currentNode.direction;
    currentNode.direction = null;
    let relevantStatuses = ["wall", "start", "target"];
    if (!relevantStatuses.includes(currentNode.status)) {
      currentNode.status = "unvisited";
    }
  })
};

Board.prototype.instantAlgorithm = function () {
  let weightedAlgorithms = ["dijkstra", "CLA", "greedy"];
  let unweightedAlgorithms = ["dfs", "bfs"];
  let success;
  if (this.currentAlgorithm === "bidirectional") {
    success = bidirectional(this.nodes, this.start, this.target, this.nodesToAnimate, this.boardArray, this.currentAlgorithm, this.currentHeuristic, this, this.currentTrace);
    launchInstantAnimations(this, success, "weighted");
    this.algoDone = true;
  } else if (this.currentAlgorithm === "astar") {
    success = weightedSearchAlgorithm(this.nodes, this.start, this.target, this.nodesToAnimate, this.boardArray, this.currentAlgorithm, this.currentHeuristic, this.currentTrace);
    launchInstantAnimations(this, success, "weighted");
    this.algoDone = true;
  }
  if (weightedAlgorithms.includes(this.currentAlgorithm)) {
    success = weightedSearchAlgorithm(this.nodes, this.start, this.target, this.nodesToAnimate, this.boardArray, this.currentAlgorithm, this.currentHeuristic, this.currentTrace);
    launchInstantAnimations(this, success, "weighted");
    this.algoDone = true;
  } else if (unweightedAlgorithms.includes(this.currentAlgorithm)) {
    success = unweightedSearchAlgorithm(this.nodes, this.start, this.target, this.nodesToAnimate, this.boardArray, this.currentAlgorithm, this.currentTrace);
    launchInstantAnimations(this, success, "unweighted");
    this.algoDone = true;
  }
};

Board.prototype.redoAlgorithm = function () {
  this.clearPath();
  this.instantAlgorithm();
};

Board.prototype.reset = function (objectNotTransparent) {
  this.nodes[this.start].status = "start";
  document.getElementById(this.start).className = "startTransparent";
  this.nodes[this.target].status = "target";
};

Board.prototype.resetHTMLNodes = function () {
  let start = document.getElementById(this.start);
  let target = document.getElementById(this.target);
  start.className = "start";
  target.className = "target";
};

Board.prototype.changeStartNodeImages = function () {
  let unweighted = ["bfs", "dfs"];
  let strikethrough = ["bfs", "dfs"];
  let guaranteed = ["dijkstra", "astar"];
  let name = "";
  if (this.currentAlgorithm === "bfs") {
    name = "Breath-first Search";
  } else if (this.currentAlgorithm === "dfs") {
    name = "Depth-first Search";
  } else if (this.currentAlgorithm === "dijkstra") {
    name = "Dijkstra's Algorithm";
  } else if (this.currentAlgorithm === "astar") {
    name = "A* Search";
  } else if (this.currentAlgorithm === "greedy") {
    name = "Greedy Best-first Search";
  } else if (this.currentAlgorithm === "CLA" && this.currentHeuristic !== "extraPoweredManhattanDistance") {
    name = "Swarm Algorithm";
  } else if (this.currentAlgorithm === "CLA" && this.currentHeuristic === "extraPoweredManhattanDistance") {
    name = "Convergent Swarm Algorithm";
  } else if (this.currentAlgorithm === "bidirectional") {
    name = "Bidirectional Swarm Algorithm";
  }
  if (unweighted.includes(this.currentAlgorithm)) {
    if (this.currentAlgorithm === "dfs") {
      document.getElementById("algorithmDescriptor").innerHTML = `${name} is <i><b>unweighted</b></i> and <i><b>does not guarantee</b></i> the shortest path!`;
    } else {
      document.getElementById("algorithmDescriptor").innerHTML = `${name} is <i><b>unweighted</b></i> and <i><b>guarantees</b></i> the shortest path!`;
    }
    let weightLegend = document.getElementById("weightLegend");
    if (weightLegend) weightLegend.className = "strikethrough";
    for (let i = 0; i < 14; i++) {
      let j = i.toString();
      let backgroundImage = document.styleSheets["1"].rules[j].style.backgroundImage;
      document.styleSheets["1"].rules[j].style.backgroundImage = backgroundImage.replace("triangle", "spaceship");
    }
  } else {
    if (this.currentAlgorithm === "greedy" || this.currentAlgorithm === "CLA") {
      document.getElementById("algorithmDescriptor").innerHTML = `${name} is <i><b>weighted</b></i> and <i><b>does not guarantee</b></i> the shortest path!`;
    }
    let weightLegend = document.getElementById("weightLegend");
    if (weightLegend) weightLegend.className = "";
    for (let i = 0; i < 14; i++) {
      let j = i.toString();
      let backgroundImage = document.styleSheets["1"].rules[j].style.backgroundImage;
      document.styleSheets["1"].rules[j].style.backgroundImage = backgroundImage.replace("spaceship", "triangle");
    }
  }
  if (this.currentAlgorithm === "bidirectional") {
    document.getElementById("algorithmDescriptor").innerHTML = `${name} is <i><b>weighted</b></i> and <i><b>does not guarantee</b></i> the shortest path!`;
  }
  if (guaranteed.includes(this.currentAlgorithm)) {
    document.getElementById("algorithmDescriptor").innerHTML = `${name} is <i><b>weighted</b></i> and <i><b>guarantees</b></i> the shortest path!`;
  }

  var key = algorithmDescriptions.getAlgorithmKey(this.currentAlgorithm, this.currentHeuristic);
  var desc = algorithmDescriptions.descriptions[key];
  if (desc) {
    var el = document.getElementById("algorithmDescriptor");
    var existing = el.innerHTML;
    if (existing.indexOf(desc.shortDescription) === -1) {
      el.innerHTML = existing + '<br><small style="color:#555">' + desc.shortDescription + '</small>';
    }
  }
};

Board.prototype.initTutorial = function () {
  var overlay = document.getElementById("tutorialOverlay");
  if (!overlay) return;

  this.tutorialSlides = [
    {
      chip: "WELCOME",
      title: "Pathfinding, Visualized",
      body: "Watch algorithms think. See every decision. Understand why a path was chosen.",
      sceneKey: "welcome-ripple"
    },
    {
      chip: "THE GRID",
      title: "Every Cell Is a Decision",
      body: "The board is a map. The start node explores outward, the target node waits. Your job is to shape the terrain.",
      sceneKey: "grid-activation"
    },
    {
      chip: "ALGORITHMS",
      title: "Eight Ways to Search",
      body: "Pick a strategy. Dijkstra guarantees the best path, DFS dives deep, and A* uses a heuristic shortcut.",
      sceneKey: "algorithm-race"
    },
    {
      chip: "OBSTACLES",
      title: "Walls Block. Weights Slow.",
      body: "Click to build walls. Hold W and click to add weight nodes when a weighted algorithm is selected. Use the slider to dial cost from 0 to 50.",
      sceneKey: "obstacles"
    },
    {
      chip: "ENDPOINTS",
      title: "Drag. Drop. Recalculate.",
      body: "Move start or target anywhere. After a completed run, repositioning triggers an instant recalculation so comparisons are fast.",
      sceneKey: "drag-recalc"
    },
    {
      chip: "CONTROLS",
      title: "Your Command Center",
      body: "Algorithms, mazes, weight slider, clear actions, and run history with Load and Replay all live in the sidebar.",
      sceneKey: "controls-ui"
    },
    {
      chip: "LET'S GO",
      title: "Hit Visualize!",
      body: "Pick an algorithm below, press Visualize!, and watch the search unfold. Open the Insight tab to follow the reasoning.",
      sceneKey: "go-path"
    }
  ];

  this.tutorialIndex = 0;
  this.tutorialOpen = false;
  this.tutorialClosing = false;
  this.tutorialAnimating = false;
  this.tutorialEventsBound = false;
  this.tutorialTransitionTimer = null;
  this.tutorialCloseTimer = null;
  this.tutorialRestoreFocusEl = null;
  this.tutorialElements = {
    overlay: overlay,
    frame: document.getElementById("tutSlideFrame"),
    chip: document.getElementById("tutChip"),
    title: document.getElementById("tutTitle"),
    body: document.getElementById("tutBody"),
    prev: document.getElementById("tutPrev"),
    next: document.getElementById("tutNext"),
    skip: document.getElementById("tutSkip"),
    progressLabel: document.getElementById("tutProgressLabel"),
    progressSegments: Array.prototype.slice.call(document.querySelectorAll("#tutProgressTrack .tut-progress-segment")),
    illustration: document.getElementById("tutIllustration"),
    scenes: Array.prototype.slice.call(document.querySelectorAll("#tutIllustration .tut-scene"))
  };

  this.bindTutorialEvents();
  this.openTutorial(0);
};

Board.prototype.bindTutorialEvents = function () {
  if (this.tutorialEventsBound || !this.tutorialElements || !this.tutorialElements.overlay) return;

  var board = this;
  var overlay = this.tutorialElements.overlay;
  var nextButton = this.tutorialElements.next;
  var prevButton = this.tutorialElements.prev;
  var skipButton = this.tutorialElements.skip;

  if (nextButton) {
    nextButton.addEventListener("click", function () {
      if (!board.tutorialOpen || board.tutorialAnimating || board.tutorialClosing) return;
      if (board.tutorialIndex >= board.tutorialSlides.length - 1) {
        board.closeTutorial();
        return;
      }
      board.renderTutorialSlide(board.tutorialIndex + 1, "forward");
    });
  }

  if (prevButton) {
    prevButton.addEventListener("click", function () {
      if (!board.tutorialOpen || board.tutorialAnimating || board.tutorialClosing) return;
      if (board.tutorialIndex <= 0) return;
      board.renderTutorialSlide(board.tutorialIndex - 1, "back");
    });
  }

  if (skipButton) {
    skipButton.addEventListener("click", function () {
      if (!board.tutorialOpen || board.tutorialClosing) return;
      board.closeTutorial();
    });
  }

  overlay.addEventListener("keydown", function (event) {
    if (!board.tutorialOpen) return;

    if (event.key === "ArrowRight") {
      event.preventDefault();
      if (board.tutorialAnimating || board.tutorialClosing) return;
      if (board.tutorialIndex >= board.tutorialSlides.length - 1) {
        board.closeTutorial();
      } else {
        board.renderTutorialSlide(board.tutorialIndex + 1, "forward");
      }
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (board.tutorialAnimating || board.tutorialClosing) return;
      if (board.tutorialIndex > 0) {
        board.renderTutorialSlide(board.tutorialIndex - 1, "back");
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      if (!board.tutorialClosing) board.closeTutorial();
      return;
    }

    if (event.key === "Tab") {
      var focusables = Array.prototype.slice.call(
        overlay.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")
      ).filter(function (element) {
        return !element.disabled && element.offsetParent !== null;
      });
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  this.tutorialEventsBound = true;
};

Board.prototype.openTutorial = function (startIndex) {
  if (!this.tutorialElements || !this.tutorialElements.overlay) return;

  if (this.tutorialCloseTimer) {
    clearTimeout(this.tutorialCloseTimer);
    this.tutorialCloseTimer = null;
  }

  if (this.tutorialTransitionTimer) {
    clearTimeout(this.tutorialTransitionTimer);
    this.tutorialTransitionTimer = null;
  }

  this.tutorialClosing = false;
  this.tutorialAnimating = false;
  this.tutorialOpen = true;

  var overlay = this.tutorialElements.overlay;
  overlay.classList.remove("tut-hidden", "tut-closing");
  overlay.setAttribute("aria-hidden", "false");

  if (document.activeElement && typeof document.activeElement.blur === "function") {
    this.tutorialRestoreFocusEl = document.activeElement;
  } else {
    this.tutorialRestoreFocusEl = null;
  }

  this.renderTutorialSlide(typeof startIndex === "number" ? startIndex : 0, "forward", true);

  if (this.tutorialElements.next) {
    this.tutorialElements.next.focus();
  }
};

Board.prototype.closeTutorial = function () {
  if (!this.tutorialElements || !this.tutorialElements.overlay || this.tutorialClosing) return;

  this.tutorialOpen = false;
  this.tutorialClosing = true;
  this.tutorialAnimating = false;

  if (this.tutorialTransitionTimer) {
    clearTimeout(this.tutorialTransitionTimer);
    this.tutorialTransitionTimer = null;
  }

  var board = this;
  var overlay = this.tutorialElements.overlay;
  overlay.classList.add("tut-closing");
  overlay.setAttribute("aria-hidden", "true");

  this.tutorialCloseTimer = setTimeout(function () {
    overlay.classList.remove("tut-closing");
    overlay.classList.add("tut-hidden");
    board.tutorialClosing = false;
    board.tutorialCloseTimer = null;
    if (board.tutorialRestoreFocusEl && document.body.contains(board.tutorialRestoreFocusEl)) {
      board.tutorialRestoreFocusEl.focus();
    }
    mazeSelector.showOnboardingModal(board);
  }, 300);
};

Board.prototype.renderTutorialSlide = function (index, direction, immediate) {
  if (!this.tutorialElements || !this.tutorialSlides || !this.tutorialSlides.length) return;

  var totalSlides = this.tutorialSlides.length;
  var nextIndex = Math.max(0, Math.min(index, totalSlides - 1));
  this.tutorialIndex = nextIndex;

  var board = this;
  var frame = this.tutorialElements.frame;
  var applyContent = function () {
    var slide = board.tutorialSlides[nextIndex];
    if (board.tutorialElements.chip) board.tutorialElements.chip.textContent = slide.chip;
    if (board.tutorialElements.title) board.tutorialElements.title.textContent = slide.title;
    if (board.tutorialElements.body) board.tutorialElements.body.textContent = slide.body;
    board.renderIllustrationScene(slide.sceneKey);
    board.updateTutorialProgress(nextIndex);
    board.updateTutorialNav(nextIndex);
  };

  if (!frame) {
    applyContent();
    return;
  }

  if (this.tutorialTransitionTimer) {
    clearTimeout(this.tutorialTransitionTimer);
    this.tutorialTransitionTimer = null;
  }

  frame.classList.remove("tut-direction-forward", "tut-direction-back");
  frame.classList.add(direction === "back" ? "tut-direction-back" : "tut-direction-forward");

  if (immediate) {
    frame.classList.remove("tut-is-transitioning");
    applyContent();
    this.tutorialAnimating = false;
    return;
  }

  this.tutorialAnimating = true;
  frame.classList.add("tut-is-transitioning");
  this.tutorialTransitionTimer = setTimeout(function () {
    applyContent();
    frame.classList.remove("tut-is-transitioning");
    board.tutorialAnimating = false;
    board.tutorialTransitionTimer = null;
  }, 170);
};

Board.prototype.updateTutorialProgress = function (index) {
  if (!this.tutorialElements) return;

  var segments = this.tutorialElements.progressSegments || [];
  for (var i = 0; i < segments.length; i++) {
    segments[i].classList.remove("is-active", "is-complete");
    if (i < index) {
      segments[i].classList.add("is-complete");
    } else if (i === index) {
      segments[i].classList.add("is-active");
    }
  }

  if (this.tutorialElements.progressLabel) {
    this.tutorialElements.progressLabel.textContent = (index + 1) + " / " + this.tutorialSlides.length;
  }
};

Board.prototype.updateTutorialNav = function (index) {
  if (!this.tutorialElements) return;

  if (this.tutorialElements.prev) {
    this.tutorialElements.prev.disabled = index <= 0;
  }

  if (this.tutorialElements.next) {
    this.tutorialElements.next.textContent = index >= this.tutorialSlides.length - 1 ? "Start Exploring" : "Continue";
  }
};

Board.prototype.renderIllustrationScene = function (sceneKey) {
  if (!this.tutorialElements || !this.tutorialElements.scenes) return;

  if (this.tutorialElements.illustration) {
    this.tutorialElements.illustration.setAttribute("data-scene", sceneKey);
  }

  this.tutorialElements.scenes.forEach(function (scene) {
    scene.classList.toggle("is-active", scene.getAttribute("data-scene") === sceneKey);
  });
};

Board.prototype.toggleButtons = function () {
  var refreshButton = document.getElementById("refreshButton");
  if (refreshButton) {
    refreshButton.onclick = (event) => {
      if (event) event.preventDefault();
      if (event && event.shiftKey) {
        window.location.reload(true);
        return;
      }
      this.openTutorial(0);
    };
  }

  if (!this.buttonsOn) {
    this.buttonsOn = true;
    this.bindStartVisualizeHandler();
    this.bindAlgoDropupHandlers();
    this.bindNavInfoOnlyHandlers();

    var adjustFast = document.getElementById("adjustFast");
    if (adjustFast) {
      adjustFast.onclick = () => {
        if (!this.buttonsOn) return;
        this.speed = "fast";
        document.getElementById("adjustSpeed").innerHTML = 'Speed: Fast<span class="caret"></span>';
      };
    }

    var adjustAverage = document.getElementById("adjustAverage");
    if (adjustAverage) {
      adjustAverage.onclick = () => {
        if (!this.buttonsOn) return;
        this.speed = "average";
        document.getElementById("adjustSpeed").innerHTML = 'Speed: Average<span class="caret"></span>';
      };
    }

    var adjustSlow = document.getElementById("adjustSlow");
    if (adjustSlow) {
      adjustSlow.onclick = () => {
        if (!this.buttonsOn) return;
        this.speed = "slow";
        document.getElementById("adjustSpeed").innerHTML = 'Speed: Slow<span class="caret"></span>';
      };
    }

    var weightSlider = document.getElementById("weightSlider");
    if (weightSlider) {
      weightSlider.oninput = (e) => {
        if (!this.buttonsOn) return;
        this.currentWeightValue = parseInt(e.target.value);
        document.getElementById("weightValue").textContent = this.currentWeightValue;
      };
    }

    var self = this;
    var pauseBtn = document.getElementById("pauseResumeBtn");
    var stepBtn = document.getElementById("stepForwardBtn");
    if (pauseBtn && stepBtn) {
      pauseBtn.onclick = function () {
        var ctrl = self.animationController;
        if (ctrl.isPaused) {
          ctrl.resume();
          this.innerHTML = '<span class="glyphicon glyphicon-pause"></span> Pause';
        } else {
          ctrl.pause();
          this.innerHTML = '<span class="glyphicon glyphicon-play"></span> Resume';
        }
      };
      stepBtn.onclick = function () {
        var ctrl = self.animationController;
        if (!ctrl.isPaused) {
          ctrl.pause();
          pauseBtn.innerHTML = '<span class="glyphicon glyphicon-play"></span> Resume';
        }
        ctrl.stepForward();
      };
    }

    var legacyClearPath = document.getElementById("startButtonClearPath");
    if (legacyClearPath) {
      legacyClearPath.onclick = () => {
        if (!this.buttonsOn) return;
        this.clearPath("clickedButton");
      };
    }

    var legacyClearWalls = document.getElementById("startButtonClearWalls");
    if (legacyClearWalls) {
      legacyClearWalls.onclick = () => {
        if (!this.buttonsOn) return;
        this.clearWalls();
      };
    }

    var legacyClearBoard = document.getElementById("startButtonClearBoard");
    if (legacyClearBoard) {
      legacyClearBoard.onclick = () => {
        if (!this.buttonsOn) return;
        this.clearBoard();
      };
    }

    this.setInteractiveControlsEnabled(true);
    this.syncAlgorithmSelectionUI();
  } else {
    this.buttonsOn = false;
    this.setInteractiveControlsEnabled(false);
  }
}

const CELL_WIDTH = 25;
const CELL_HEIGHT = 25;
const MIN_ROWS = 10;
const MIN_COLS = 10;

function getGridWrapperContentSize(wrapper) {
  if (!wrapper) return { width: 0, height: 0 };
  let styles = window.getComputedStyle(wrapper);
  let paddingX = (parseFloat(styles.paddingLeft) || 0) + (parseFloat(styles.paddingRight) || 0);
  let paddingY = (parseFloat(styles.paddingTop) || 0) + (parseFloat(styles.paddingBottom) || 0);
  return {
    width: Math.max(0, wrapper.clientWidth - paddingX),
    height: Math.max(0, wrapper.clientHeight - paddingY)
  };
}

function getInitialBoardDimensions() {
  let wrapper = document.getElementById("gridWrapper");
  let contentSize = getGridWrapperContentSize(wrapper);
  let navbarHeight = document.getElementById("navbarDiv") ? document.getElementById("navbarDiv").clientHeight : 50;
  let legendHeight = document.getElementById("legendBar") ? document.getElementById("legendBar").clientHeight : 28;
  let fallbackHeight = Math.max(MIN_ROWS * CELL_HEIGHT, document.documentElement.clientHeight - navbarHeight - legendHeight - 6);
  let fallbackWidth = Math.max(MIN_COLS * CELL_WIDTH, document.documentElement.clientWidth);
  let availableHeight = Math.max(MIN_ROWS * CELL_HEIGHT, contentSize.height || fallbackHeight);
  let availableWidth = Math.max(MIN_COLS * CELL_WIDTH, contentSize.width || fallbackWidth);
  return {
    height: Math.max(MIN_ROWS, Math.floor(availableHeight / CELL_HEIGHT)),
    width: Math.max(MIN_COLS, Math.floor(availableWidth / CELL_WIDTH))
  };
}

let dimensions = getInitialBoardDimensions();
let newBoard = new Board(dimensions.height, dimensions.width)
window.__board = newBoard;
newBoard.initialise();

window.onkeydown = (e) => {
  newBoard.keyDown = e.keyCode;
}

window.onkeyup = (e) => {
  newBoard.keyDown = false;
}

},{"./animations/animationController":1,"./animations/launchAnimations":2,"./animations/launchInstantAnimations":3,"./getDistance":6,"./node":11,"./pathfindingAlgorithms/bidirectional":13,"./pathfindingAlgorithms/unweightedSearchAlgorithm":14,"./pathfindingAlgorithms/weightedSearchAlgorithm":15,"./utils/aiExplain":16,"./utils/algorithmDescriptions":17,"./utils/algorithmModal":18,"./utils/explanationTemplates":19,"./utils/historyUI":22,"./utils/mazeSelector":23,"./utils/weightImpactAnalyzer":25}],6:[function(require,module,exports){
function getDistance(nodeOne, nodeTwo) {
  let currentCoordinates = nodeOne.id.split("-");
  let targetCoordinates = nodeTwo.id.split("-");
  let x1 = parseInt(currentCoordinates[0]);
  let y1 = parseInt(currentCoordinates[1]);
  let x2 = parseInt(targetCoordinates[0]);
  let y2 = parseInt(targetCoordinates[1]);
  if (x2 < x1) {
    if (nodeOne.direction === "up") {
      return [1, ["f"], "up"];
    } else if (nodeOne.direction === "right") {
      return [2, ["l", "f"], "up"];
    } else if (nodeOne.direction === "left") {
      return [2, ["r", "f"], "up"];
    } else if (nodeOne.direction === "down") {
      return [3, ["r", "r", "f"], "up"];
    }
  } else if (x2 > x1) {
    if (nodeOne.direction === "up") {
      return [3, ["r", "r", "f"], "down"];
    } else if (nodeOne.direction === "right") {
      return [2, ["r", "f"], "down"];
    } else if (nodeOne.direction === "left") {
      return [2, ["l", "f"], "down"];
    } else if (nodeOne.direction === "down") {
      return [1, ["f"], "down"];
    }
  }
  if (y2 < y1) {
    if (nodeOne.direction === "up") {
      return [2, ["l", "f"], "left"];
    } else if (nodeOne.direction === "right") {
      return [3, ["l", "l", "f"], "left"];
    } else if (nodeOne.direction === "left") {
      return [1, ["f"], "left"];
    } else if (nodeOne.direction === "down") {
      return [2, ["r", "f"], "left"];
    }
  } else if (y2 > y1) {
    if (nodeOne.direction === "up") {
      return [2, ["r", "f"], "right"];
    } else if (nodeOne.direction === "right") {
      return [1, ["f"], "right"];
    } else if (nodeOne.direction === "left") {
      return [3, ["r", "r", "f"], "right"];
    } else if (nodeOne.direction === "down") {
      return [2, ["l", "f"], "right"];
    }
  }
}

module.exports = getDistance;

},{}],7:[function(require,module,exports){
function recursiveDivisionMaze(board, rowStart, rowEnd, colStart, colEnd, orientation, surroundingWalls) {
  if (rowEnd < rowStart || colEnd < colStart) {
    return;
  }
  if (!surroundingWalls) {
    let relevantIds = [board.start, board.target];
    Object.keys(board.nodes).forEach(node => {
      if (!relevantIds.includes(node)) {
        let r = parseInt(node.split("-")[0]);
        let c = parseInt(node.split("-")[1]);
        if (r === 0 || c === 0 || r === board.height - 1 || c === board.width - 1) {
          let currentHTMLNode = document.getElementById(node);
          board.wallsToAnimate.push(currentHTMLNode);
          board.nodes[node].status = "wall";
        }
      }
    });
    surroundingWalls = true;
  }
  if (orientation === "horizontal") {
    let possibleRows = [];
    for (let number = rowStart; number <= rowEnd; number += 2) {
      possibleRows.push(number);
    }
    let possibleCols = [];
    for (let number = colStart - 1; number <= colEnd + 1; number += 2) {
      possibleCols.push(number);
    }
    let randomRowIndex = Math.floor(Math.random() * possibleRows.length);
    let randomColIndex = Math.floor(Math.random() * possibleCols.length);
    let currentRow = possibleRows[randomRowIndex];
    let colRandom = possibleCols[randomColIndex];
    Object.keys(board.nodes).forEach(node => {
      let r = parseInt(node.split("-")[0]);
      let c = parseInt(node.split("-")[1]);
      if (r === currentRow && c !== colRandom && c >= colStart - 1 && c <= colEnd + 1) {
        let currentHTMLNode = document.getElementById(node);
        if (currentHTMLNode.className !== "start" && currentHTMLNode.className !== "target") {
          board.wallsToAnimate.push(currentHTMLNode);
          board.nodes[node].status = "wall";
        }
      }
    });
    if (currentRow - 2 - rowStart > colEnd - colStart) {
      recursiveDivisionMaze(board, rowStart, currentRow - 2, colStart, colEnd, orientation, surroundingWalls);
    } else {
      recursiveDivisionMaze(board, rowStart, currentRow - 2, colStart, colEnd, "vertical", surroundingWalls);
    }
    if (rowEnd - (currentRow + 2) > colEnd - colStart) {
      recursiveDivisionMaze(board, currentRow + 2, rowEnd, colStart, colEnd, "vertical", surroundingWalls);
    } else {
      recursiveDivisionMaze(board, currentRow + 2, rowEnd, colStart, colEnd, "vertical", surroundingWalls);
    }
  } else {
    let possibleCols = [];
    for (let number = colStart; number <= colEnd; number += 2) {
      possibleCols.push(number);
    }
    let possibleRows = [];
    for (let number = rowStart - 1; number <= rowEnd + 1; number += 2) {
      possibleRows.push(number);
    }
    let randomColIndex = Math.floor(Math.random() * possibleCols.length);
    let randomRowIndex = Math.floor(Math.random() * possibleRows.length);
    let currentCol = possibleCols[randomColIndex];
    let rowRandom = possibleRows[randomRowIndex];
    Object.keys(board.nodes).forEach(node => {
      let r = parseInt(node.split("-")[0]);
      let c = parseInt(node.split("-")[1]);
      if (c === currentCol && r !== rowRandom && r >= rowStart - 1 && r <= rowEnd + 1) {
        let currentHTMLNode = document.getElementById(node);
        if (currentHTMLNode.className !== "start" && currentHTMLNode.className !== "target") {
          board.wallsToAnimate.push(currentHTMLNode);
          board.nodes[node].status = "wall";
        }
      }
    });
    if (rowEnd - rowStart > currentCol - 2 - colStart) {
      recursiveDivisionMaze(board, rowStart, rowEnd, colStart, currentCol - 2, "vertical", surroundingWalls);
    } else {
      recursiveDivisionMaze(board, rowStart, rowEnd, colStart, currentCol - 2, orientation, surroundingWalls);
    }
    if (rowEnd - rowStart > colEnd - (currentCol + 2)) {
      recursiveDivisionMaze(board, rowStart, rowEnd, currentCol + 2, colEnd, "horizontal", surroundingWalls);
    } else {
      recursiveDivisionMaze(board, rowStart, rowEnd, currentCol + 2, colEnd, orientation, surroundingWalls);
    }
  }
};

module.exports = recursiveDivisionMaze;

},{}],8:[function(require,module,exports){
function recursiveDivisionMaze(board, rowStart, rowEnd, colStart, colEnd, orientation, surroundingWalls) {
  if (rowEnd < rowStart || colEnd < colStart) {
    return;
  }
  if (!surroundingWalls) {
    let relevantIds = [board.start, board.target];
    Object.keys(board.nodes).forEach(node => {
      if (!relevantIds.includes(node)) {
        let r = parseInt(node.split("-")[0]);
        let c = parseInt(node.split("-")[1]);
        if (r === 0 || c === 0 || r === board.height - 1 || c === board.width - 1) {
          let currentHTMLNode = document.getElementById(node);
          board.wallsToAnimate.push(currentHTMLNode);
          board.nodes[node].status = "wall";
        }
      }
    });
    surroundingWalls = true;
  }
  if (orientation === "horizontal") {
    let possibleRows = [];
    for (let number = rowStart; number <= rowEnd; number += 2) {
      possibleRows.push(number);
    }
    let possibleCols = [];
    for (let number = colStart - 1; number <= colEnd + 1; number += 2) {
      possibleCols.push(number);
    }
    let randomRowIndex = Math.floor(Math.random() * possibleRows.length);
    let randomColIndex = Math.floor(Math.random() * possibleCols.length);
    let currentRow = possibleRows[randomRowIndex];
    let colRandom = possibleCols[randomColIndex];
    Object.keys(board.nodes).forEach(node => {
      let r = parseInt(node.split("-")[0]);
      let c = parseInt(node.split("-")[1]);
      if (r === currentRow && c !== colRandom && c >= colStart - 1 && c <= colEnd + 1) {
        let currentHTMLNode = document.getElementById(node);
        if (currentHTMLNode.className !== "start" && currentHTMLNode.className !== "target") {
          board.wallsToAnimate.push(currentHTMLNode);
          board.nodes[node].status = "wall";
        }
      }
    });
    if (currentRow - 2 - rowStart > colEnd - colStart) {
      recursiveDivisionMaze(board, rowStart, currentRow - 2, colStart, colEnd, orientation, surroundingWalls);
    } else {
      recursiveDivisionMaze(board, rowStart, currentRow - 2, colStart, colEnd, "horizontal", surroundingWalls);
    }
    if (rowEnd - (currentRow + 2) > colEnd - colStart) {
      recursiveDivisionMaze(board, currentRow + 2, rowEnd, colStart, colEnd, orientation, surroundingWalls);
    } else {
      recursiveDivisionMaze(board, currentRow + 2, rowEnd, colStart, colEnd, "vertical", surroundingWalls);
    }
  } else {
    let possibleCols = [];
    for (let number = colStart; number <= colEnd; number += 2) {
      possibleCols.push(number);
    }
    let possibleRows = [];
    for (let number = rowStart - 1; number <= rowEnd + 1; number += 2) {
      possibleRows.push(number);
    }
    let randomColIndex = Math.floor(Math.random() * possibleCols.length);
    let randomRowIndex = Math.floor(Math.random() * possibleRows.length);
    let currentCol = possibleCols[randomColIndex];
    let rowRandom = possibleRows[randomRowIndex];
    Object.keys(board.nodes).forEach(node => {
      let r = parseInt(node.split("-")[0]);
      let c = parseInt(node.split("-")[1]);
      if (c === currentCol && r !== rowRandom && r >= rowStart - 1 && r <= rowEnd + 1) {
        let currentHTMLNode = document.getElementById(node);
        if (currentHTMLNode.className !== "start" && currentHTMLNode.className !== "target") {
          board.wallsToAnimate.push(currentHTMLNode);
          board.nodes[node].status = "wall";
        }
      }
    });
    if (rowEnd - rowStart > currentCol - 2 - colStart) {
      recursiveDivisionMaze(board, rowStart, rowEnd, colStart, currentCol - 2, "horizontal", surroundingWalls);
    } else {
      recursiveDivisionMaze(board, rowStart, rowEnd, colStart, currentCol - 2, "horizontal", surroundingWalls);
    }
    if (rowEnd - rowStart > colEnd - (currentCol + 2)) {
      recursiveDivisionMaze(board, rowStart, rowEnd, currentCol + 2, colEnd, "horizontal", surroundingWalls);
    } else {
      recursiveDivisionMaze(board, rowStart, rowEnd, currentCol + 2, colEnd, orientation, surroundingWalls);
    }
  }
};

module.exports = recursiveDivisionMaze;

},{}],9:[function(require,module,exports){
function recursiveDivisionMaze(board, rowStart, rowEnd, colStart, colEnd, orientation, surroundingWalls, type) {
  if (rowEnd < rowStart || colEnd < colStart) {
    return;
  }
  if (!surroundingWalls) {
    let relevantIds = [board.start, board.target];
    Object.keys(board.nodes).forEach(node => {
      if (!relevantIds.includes(node)) {
        let r = parseInt(node.split("-")[0]);
        let c = parseInt(node.split("-")[1]);
        if (r === 0 || c === 0 || r === board.height - 1 || c === board.width - 1) {
          let currentHTMLNode = document.getElementById(node);
          board.wallsToAnimate.push(currentHTMLNode);
          if (type === "wall") {
            board.nodes[node].status = "wall";
            board.nodes[node].weight = 0;
          } else if (type === "weight") {
            board.nodes[node].status = "unvisited";
            board.nodes[node].weight = board.currentWeightValue;
          }
        }
      }
    });
    surroundingWalls = true;
  }
  if (orientation === "horizontal") {
    let possibleRows = [];
    for (let number = rowStart; number <= rowEnd; number += 2) {
      possibleRows.push(number);
    }
    let possibleCols = [];
    for (let number = colStart - 1; number <= colEnd + 1; number += 2) {
      possibleCols.push(number);
    }
    let randomRowIndex = Math.floor(Math.random() * possibleRows.length);
    let randomColIndex = Math.floor(Math.random() * possibleCols.length);
    let currentRow = possibleRows[randomRowIndex];
    let colRandom = possibleCols[randomColIndex];
    Object.keys(board.nodes).forEach(node => {
      let r = parseInt(node.split("-")[0]);
      let c = parseInt(node.split("-")[1]);
      if (r === currentRow && c !== colRandom && c >= colStart - 1 && c <= colEnd + 1) {
        let currentHTMLNode = document.getElementById(node);
        if (currentHTMLNode.className !== "start" && currentHTMLNode.className !== "target") {
          board.wallsToAnimate.push(currentHTMLNode);
          if (type === "wall") {
            board.nodes[node].status = "wall";
            board.nodes[node].weight = 0;
          } else if (type === "weight") {
            board.nodes[node].status = "unvisited";
            board.nodes[node].weight = board.currentWeightValue;
          }
        }
      }
    });
    if (currentRow - 2 - rowStart > colEnd - colStart) {
      recursiveDivisionMaze(board, rowStart, currentRow - 2, colStart, colEnd, orientation, surroundingWalls, type);
    } else {
      recursiveDivisionMaze(board, rowStart, currentRow - 2, colStart, colEnd, "vertical", surroundingWalls, type);
    }
    if (rowEnd - (currentRow + 2) > colEnd - colStart) {
      recursiveDivisionMaze(board, currentRow + 2, rowEnd, colStart, colEnd, orientation, surroundingWalls, type);
    } else {
      recursiveDivisionMaze(board, currentRow + 2, rowEnd, colStart, colEnd, "vertical", surroundingWalls, type);
    }
  } else {
    let possibleCols = [];
    for (let number = colStart; number <= colEnd; number += 2) {
      possibleCols.push(number);
    }
    let possibleRows = [];
    for (let number = rowStart - 1; number <= rowEnd + 1; number += 2) {
      possibleRows.push(number);
    }
    let randomColIndex = Math.floor(Math.random() * possibleCols.length);
    let randomRowIndex = Math.floor(Math.random() * possibleRows.length);
    let currentCol = possibleCols[randomColIndex];
    let rowRandom = possibleRows[randomRowIndex];
    Object.keys(board.nodes).forEach(node => {
      let r = parseInt(node.split("-")[0]);
      let c = parseInt(node.split("-")[1]);
      if (c === currentCol && r !== rowRandom && r >= rowStart - 1 && r <= rowEnd + 1) {
        let currentHTMLNode = document.getElementById(node);
        if (currentHTMLNode.className !== "start" && currentHTMLNode.className !== "target") {
          board.wallsToAnimate.push(currentHTMLNode);
          if (type === "wall") {
            board.nodes[node].status = "wall";
            board.nodes[node].weight = 0;
          } else if (type === "weight") {
            board.nodes[node].status = "unvisited";
            board.nodes[node].weight = board.currentWeightValue;
          }
        }
      }
    });
    if (rowEnd - rowStart > currentCol - 2 - colStart) {
      recursiveDivisionMaze(board, rowStart, rowEnd, colStart, currentCol - 2, "horizontal", surroundingWalls, type);
    } else {
      recursiveDivisionMaze(board, rowStart, rowEnd, colStart, currentCol - 2, orientation, surroundingWalls, type);
    }
    if (rowEnd - rowStart > colEnd - (currentCol + 2)) {
      recursiveDivisionMaze(board, rowStart, rowEnd, currentCol + 2, colEnd, "horizontal", surroundingWalls, type);
    } else {
      recursiveDivisionMaze(board, rowStart, rowEnd, currentCol + 2, colEnd, orientation, surroundingWalls, type);
    }
  }
};

module.exports = recursiveDivisionMaze;

},{}],10:[function(require,module,exports){
function stairDemonstration(board) {
  let currentIdX = board.height - 1;
  let currentIdY = 0;
  let relevantStatuses = ["start", "target"];
  while (currentIdX > 0 && currentIdY < board.width) {
    let currentId = `${currentIdX}-${currentIdY}`;
    let currentNode = board.nodes[currentId];
    let currentHTMLNode = document.getElementById(currentId);
    if (!relevantStatuses.includes(currentNode.status)) {
      currentNode.status = "wall";
      board.wallsToAnimate.push(currentHTMLNode);
    }
    currentIdX--;
    currentIdY++;
  }
  while (currentIdX < board.height - 2 && currentIdY < board.width) {
    let currentId = `${currentIdX}-${currentIdY}`;
    let currentNode = board.nodes[currentId];
    let currentHTMLNode = document.getElementById(currentId);
    if (!relevantStatuses.includes(currentNode.status)) {
      currentNode.status = "wall";
      board.wallsToAnimate.push(currentHTMLNode);
    }
    currentIdX++;
    currentIdY++;
  }
  while (currentIdX > 0 && currentIdY < board.width - 1) {
    let currentId = `${currentIdX}-${currentIdY}`;
    let currentNode = board.nodes[currentId];
    let currentHTMLNode = document.getElementById(currentId);
    if (!relevantStatuses.includes(currentNode.status)) {
      currentNode.status = "wall";
      board.wallsToAnimate.push(currentHTMLNode);
    }
    currentIdX--;
    currentIdY++;
  }
}

module.exports = stairDemonstration;

},{}],11:[function(require,module,exports){
function Node(id, status) {
  this.id = id;
  this.status = status;
  this.previousNode = null;
  this.path = null;
  this.direction = null;
  this.storedDirection = null;
  this.distance = Infinity;
  this.totalDistance = Infinity;
  this.heuristicDistance = null;
  this.weight = 0;

  this.otherid = id;
  this.otherstatus = status;
  this.otherpreviousNode = null;
  this.otherpath = null;
  this.otherdirection = null;
  this.otherstoredDirection = null;
  this.otherdistance = Infinity;
  this.otherweight = 0;
}

module.exports = Node;

},{}],12:[function(require,module,exports){
function astar(nodes, start, target, nodesToAnimate, boardArray, name, heuristic, trace) {
  if (!start || !target || start === target) {
    return false;
  }
  nodes[start].distance = 0;
  nodes[start].totalDistance = 0;
  nodes[start].direction = "up";
  let unvisitedNodes = Object.keys(nodes);
  while (unvisitedNodes.length) {
    let currentNode = closestNode(nodes, unvisitedNodes);
    while (currentNode.status === "wall" && unvisitedNodes.length) {
      currentNode = closestNode(nodes, unvisitedNodes)
    }
    if (currentNode.distance === Infinity) return false;
    if (trace) {
      trace.push({
        t: "select_current",
        step: trace.length,
        current: currentNode.id,
        reason: "min_total_distance",
        metrics: {
          frontierSize: unvisitedNodes.length,
          visitedCount: nodesToAnimate.length
        },
        values: {
          g: currentNode.distance,
          h: currentNode.heuristicDistance || 0,
          f: currentNode.totalDistance
        }
      });
    }
    nodesToAnimate.push(currentNode);
    currentNode.status = "visited";
    if (currentNode.id === target) {
      if (trace) {
        trace.push({
          t: "found_target",
          step: trace.length,
          target: target,
          metrics: {
            visitedCount: nodesToAnimate.length,
            pathCost: currentNode.distance
          }
        });
      }
      return "success!";
    }
    updateNeighbors(nodes, currentNode, boardArray, target, name, start, heuristic, trace);
  }
  if (trace) {
    trace.push({
      t: "no_path",
      step: trace.length,
      reason: "frontier_exhausted"
    });
  }
}

function closestNode(nodes, unvisitedNodes) {
  let currentClosest, index;
  for (let i = 0; i < unvisitedNodes.length; i++) {
    if (!currentClosest || currentClosest.totalDistance > nodes[unvisitedNodes[i]].totalDistance) {
      currentClosest = nodes[unvisitedNodes[i]];
      index = i;
    } else if (currentClosest.totalDistance === nodes[unvisitedNodes[i]].totalDistance) {
      if (currentClosest.heuristicDistance > nodes[unvisitedNodes[i]].heuristicDistance) {
        currentClosest = nodes[unvisitedNodes[i]];
        index = i;
      }
    }
  }
  unvisitedNodes.splice(index, 1);
  return currentClosest;
}

function updateNeighbors(nodes, node, boardArray, target, name, start, heuristic, trace) {
  let neighbors = getNeighbors(node.id, nodes, boardArray);
  if (trace) {
    trace.push({
      t: "evaluating_neighbors",
      step: trace.length,
      current: node.id,
      neighborCount: neighbors.length
    });
    traceWallNeighbors(node, nodes, boardArray, trace);
  }
  for (let neighbor of neighbors) {
    if (target) {
      updateNode(node, nodes[neighbor], nodes[target], name, nodes, nodes[start], heuristic, boardArray, trace);
    } else {
      updateNode(node, nodes[neighbor], null, name, nodes, nodes[start], heuristic, boardArray, trace);
    }
  }
}

function updateNode(currentNode, targetNode, actualTargetNode, name, nodes, actualStartNode, heuristic, boardArray, trace) {
  let distance = getDistance(currentNode, targetNode);
  if (!targetNode.heuristicDistance) targetNode.heuristicDistance = manhattanDistance(targetNode, actualTargetNode);
  let distanceToCompare = currentNode.distance + targetNode.weight + distance[0];
  if (distanceToCompare < targetNode.distance) {
    if (trace) {
      var oldDistance = targetNode.distance;
      var oldTotal = targetNode.totalDistance;
      var turnPenalty = distance[0] - 1;
      var weightValue = targetNode.weight > 0 ? targetNode.weight : 0;
      trace.push({
        t: "relax_neighbor",
        step: trace.length,
        from: currentNode.id,
        to: targetNode.id,
        old: { g: oldDistance, f: oldTotal },
        new: { g: distanceToCompare, f: distanceToCompare + targetNode.heuristicDistance },
        components: {
          base: 1,
          turnPenalty: turnPenalty,
          weight: weightValue
        },
        why: "new_cost_lower"
      });
    }
    targetNode.distance = distanceToCompare;
    targetNode.totalDistance = targetNode.distance + targetNode.heuristicDistance;
    targetNode.previousNode = currentNode.id;
    targetNode.path = distance[1];
    targetNode.direction = distance[2];
  } else if (trace) {
    var reason = targetNode.status === "visited" ? "visited" : "no_improvement";
    trace.push({
      t: "skip_neighbor",
      step: trace.length,
      from: currentNode.id,
      to: targetNode.id,
      reason: reason
    });
  }
}

function getNeighbors(id, nodes, boardArray) {
  let coordinates = id.split("-");
  let x = parseInt(coordinates[0]);
  let y = parseInt(coordinates[1]);
  let neighbors = [];
  let potentialNeighbor;
  if (boardArray[x - 1] && boardArray[x - 1][y]) {
    potentialNeighbor = `${(x - 1).toString()}-${y.toString()}`
    if (nodes[potentialNeighbor].status !== "wall") neighbors.push(potentialNeighbor);
  }
  if (boardArray[x + 1] && boardArray[x + 1][y]) {
    potentialNeighbor = `${(x + 1).toString()}-${y.toString()}`
    if (nodes[potentialNeighbor].status !== "wall") neighbors.push(potentialNeighbor);
  }
  if (boardArray[x][y - 1]) {
    potentialNeighbor = `${x.toString()}-${(y - 1).toString()}`
    if (nodes[potentialNeighbor].status !== "wall") neighbors.push(potentialNeighbor);
  }
  if (boardArray[x][y + 1]) {
    potentialNeighbor = `${x.toString()}-${(y + 1).toString()}`
    if (nodes[potentialNeighbor].status !== "wall") neighbors.push(potentialNeighbor);
  }
  // if (boardArray[x - 1] && boardArray[x - 1][y - 1]) {
  //   potentialNeighbor = `${(x - 1).toString()}-${(y - 1).toString()}`
  //   let potentialWallOne = `${(x - 1).toString()}-${y.toString()}`
  //   let potentialWallTwo = `${x.toString()}-${(y - 1).toString()}`
  //   if (nodes[potentialNeighbor].status !== "wall" && !(nodes[potentialWallOne].status === "wall" && nodes[potentialWallTwo].status === "wall")) neighbors.push(potentialNeighbor);
  // }
  // if (boardArray[x + 1] && boardArray[x + 1][y - 1]) {
  //   potentialNeighbor = `${(x + 1).toString()}-${(y - 1).toString()}`
  //   let potentialWallOne = `${(x + 1).toString()}-${y.toString()}`
  //   let potentialWallTwo = `${x.toString()}-${(y - 1).toString()}`
  //   if (nodes[potentialNeighbor].status !== "wall" && !(nodes[potentialWallOne].status === "wall" && nodes[potentialWallTwo].status === "wall")) neighbors.push(potentialNeighbor);
  // }
  // if (boardArray[x - 1] && boardArray[x - 1][y + 1]) {
  //   potentialNeighbor = `${(x - 1).toString()}-${(y + 1).toString()}`
  //   let potentialWallOne = `${(x - 1).toString()}-${y.toString()}`
  //   let potentialWallTwo = `${x.toString()}-${(y + 1).toString()}`
  //   if (nodes[potentialNeighbor].status !== "wall" && !(nodes[potentialWallOne].status === "wall" && nodes[potentialWallTwo].status === "wall")) neighbors.push(potentialNeighbor);
  // }
  // if (boardArray[x + 1] && boardArray[x + 1][y + 1]) {
  //   potentialNeighbor = `${(x + 1).toString()}-${(y + 1).toString()}`
  //   let potentialWallOne = `${(x + 1).toString()}-${y.toString()}`
  //   let potentialWallTwo = `${x.toString()}-${(y + 1).toString()}`
  //   if (nodes[potentialNeighbor].status !== "wall" && !(nodes[potentialWallOne].status === "wall" && nodes[potentialWallTwo].status === "wall")) neighbors.push(potentialNeighbor);
  // }
  return neighbors;
}

function traceWallNeighbors(node, nodes, boardArray, trace) {
  let coordinates = node.id.split("-");
  let x = parseInt(coordinates[0]);
  let y = parseInt(coordinates[1]);
  let potentialNeighbor;
  if (boardArray[x - 1] && boardArray[x - 1][y]) {
    potentialNeighbor = `${(x - 1).toString()}-${y.toString()}`;
    if (nodes[potentialNeighbor].status === "wall") {
      trace.push({ t: "skip_neighbor", step: trace.length, from: node.id, to: potentialNeighbor, reason: "wall" });
    }
  }
  if (boardArray[x + 1] && boardArray[x + 1][y]) {
    potentialNeighbor = `${(x + 1).toString()}-${y.toString()}`;
    if (nodes[potentialNeighbor].status === "wall") {
      trace.push({ t: "skip_neighbor", step: trace.length, from: node.id, to: potentialNeighbor, reason: "wall" });
    }
  }
  if (boardArray[x][y - 1]) {
    potentialNeighbor = `${x.toString()}-${(y - 1).toString()}`;
    if (nodes[potentialNeighbor].status === "wall") {
      trace.push({ t: "skip_neighbor", step: trace.length, from: node.id, to: potentialNeighbor, reason: "wall" });
    }
  }
  if (boardArray[x][y + 1]) {
    potentialNeighbor = `${x.toString()}-${(y + 1).toString()}`;
    if (nodes[potentialNeighbor].status === "wall") {
      trace.push({ t: "skip_neighbor", step: trace.length, from: node.id, to: potentialNeighbor, reason: "wall" });
    }
  }
}


function getDistance(nodeOne, nodeTwo) {
  let currentCoordinates = nodeOne.id.split("-");
  let targetCoordinates = nodeTwo.id.split("-");
  let x1 = parseInt(currentCoordinates[0]);
  let y1 = parseInt(currentCoordinates[1]);
  let x2 = parseInt(targetCoordinates[0]);
  let y2 = parseInt(targetCoordinates[1]);
  if (x2 < x1 && y1 === y2) {
    if (nodeOne.direction === "up") {
      return [1, ["f"], "up"];
    } else if (nodeOne.direction === "right") {
      return [2, ["l", "f"], "up"];
    } else if (nodeOne.direction === "left") {
      return [2, ["r", "f"], "up"];
    } else if (nodeOne.direction === "down") {
      return [3, ["r", "r", "f"], "up"];
    } else if (nodeOne.direction === "up-right") {
      return [1.5, null, "up"];
    } else if (nodeOne.direction === "down-right") {
      return [2.5, null, "up"];
    } else if (nodeOne.direction === "up-left") {
      return [1.5, null, "up"];
    } else if (nodeOne.direction === "down-left") {
      return [2.5, null, "up"];
    }
  } else if (x2 > x1 && y1 === y2) {
    if (nodeOne.direction === "up") {
      return [3, ["r", "r", "f"], "down"];
    } else if (nodeOne.direction === "right") {
      return [2, ["r", "f"], "down"];
    } else if (nodeOne.direction === "left") {
      return [2, ["l", "f"], "down"];
    } else if (nodeOne.direction === "down") {
      return [1, ["f"], "down"];
    } else if (nodeOne.direction === "up-right") {
      return [2.5, null, "down"];
    } else if (nodeOne.direction === "down-right") {
      return [1.5, null, "down"];
    } else if (nodeOne.direction === "up-left") {
      return [2.5, null, "down"];
    } else if (nodeOne.direction === "down-left") {
      return [1.5, null, "down"];
    }
  }
  if (y2 < y1 && x1 === x2) {
    if (nodeOne.direction === "up") {
      return [2, ["l", "f"], "left"];
    } else if (nodeOne.direction === "right") {
      return [3, ["l", "l", "f"], "left"];
    } else if (nodeOne.direction === "left") {
      return [1, ["f"], "left"];
    } else if (nodeOne.direction === "down") {
      return [2, ["r", "f"], "left"];
    } else if (nodeOne.direction === "up-right") {
      return [2.5, null, "left"];
    } else if (nodeOne.direction === "down-right") {
      return [2.5, null, "left"];
    } else if (nodeOne.direction === "up-left") {
      return [1.5, null, "left"];
    } else if (nodeOne.direction === "down-left") {
      return [1.5, null, "left"];
    }
  } else if (y2 > y1 && x1 === x2) {
    if (nodeOne.direction === "up") {
      return [2, ["r", "f"], "right"];
    } else if (nodeOne.direction === "right") {
      return [1, ["f"], "right"];
    } else if (nodeOne.direction === "left") {
      return [3, ["r", "r", "f"], "right"];
    } else if (nodeOne.direction === "down") {
      return [2, ["l", "f"], "right"];
    } else if (nodeOne.direction === "up-right") {
      return [1.5, null, "right"];
    } else if (nodeOne.direction === "down-right") {
      return [1.5, null, "right"];
    } else if (nodeOne.direction === "up-left") {
      return [2.5, null, "right"];
    } else if (nodeOne.direction === "down-left") {
      return [2.5, null, "right"];
    }
  } /*else if (x2 < x1 && y2 < y1) {
    if (nodeOne.direction === "up") {
      return [1.5, ["f"], "up-left"];
    } else if (nodeOne.direction === "right") {
      return [2.5, ["l", "f"], "up-left"];
    } else if (nodeOne.direction === "left") {
      return [1.5, ["r", "f"], "up-left"];
    } else if (nodeOne.direction === "down") {
      return [2.5, ["r", "r", "f"], "up-left"];
    } else if (nodeOne.direction === "up-right") {
      return [2, null, "up-left"];
    } else if (nodeOne.direction === "down-right") {
      return [3, null, "up-left"];
    } else if (nodeOne.direction === "up-left") {
      return [1, null, "up-left"];
    } else if (nodeOne.direction === "down-left") {
      return [2, null, "up-left"];
    }
  } else if (x2 < x1 && y2 > y1) {
    if (nodeOne.direction === "up") {
      return [1.5, ["f"], "up-right"];
    } else if (nodeOne.direction === "right") {
      return [1.5, ["l", "f"], "up-right"];
    } else if (nodeOne.direction === "left") {
      return [2.5, ["r", "f"], "up-right"];
    } else if (nodeOne.direction === "down") {
      return [2.5, ["r", "r", "f"], "up-right"];
    } else if (nodeOne.direction === "up-right") {
      return [1, null, "up-right"];
    } else if (nodeOne.direction === "down-right") {
      return [2, null, "up-right"];
    } else if (nodeOne.direction === "up-left") {
      return [2, null, "up-right"];
    } else if (nodeOne.direction === "down-left") {
      return [3, null, "up-right"];
    }
  } else if (x2 > x1 && y2 > y1) {
    if (nodeOne.direction === "up") {
      return [2.5, ["f"], "down-right"];
    } else if (nodeOne.direction === "right") {
      return [1.5, ["l", "f"], "down-right"];
    } else if (nodeOne.direction === "left") {
      return [2.5, ["r", "f"], "down-right"];
    } else if (nodeOne.direction === "down") {
      return [1.5, ["r", "r", "f"], "down-right"];
    } else if (nodeOne.direction === "up-right") {
      return [2, null, "down-right"];
    } else if (nodeOne.direction === "down-right") {
      return [1, null, "down-right"];
    } else if (nodeOne.direction === "up-left") {
      return [3, null, "down-right"];
    } else if (nodeOne.direction === "down-left") {
      return [2, null, "down-right"];
    }
  } else if (x2 > x1 && y2 < y1) {
    if (nodeOne.direction === "up") {
      return [2.5, ["f"], "down-left"];
    } else if (nodeOne.direction === "right") {
      return [2.5, ["l", "f"], "down-left"];
    } else if (nodeOne.direction === "left") {
      return [1.5, ["r", "f"], "down-left"];
    } else if (nodeOne.direction === "down") {
      return [1.5, ["r", "r", "f"], "down-left"];
    } else if (nodeOne.direction === "up-right") {
      return [3, null, "down-left"];
    } else if (nodeOne.direction === "down-right") {
      return [2, null, "down-left"];
    } else if (nodeOne.direction === "up-left") {
      return [2, null, "down-left"];
    } else if (nodeOne.direction === "down-left") {
      return [1, null, "down-left"];
    }
  }*/
}

function manhattanDistance(nodeOne, nodeTwo) {
  let nodeOneCoordinates = nodeOne.id.split("-").map(ele => parseInt(ele));
  let nodeTwoCoordinates = nodeTwo.id.split("-").map(ele => parseInt(ele));
  let xOne = nodeOneCoordinates[0];
  let xTwo = nodeTwoCoordinates[0];
  let yOne = nodeOneCoordinates[1];
  let yTwo = nodeTwoCoordinates[1];

  let xChange = Math.abs(xOne - xTwo);
  let yChange = Math.abs(yOne - yTwo);

  return (xChange + yChange);
}



module.exports = astar;

},{}],13:[function(require,module,exports){
const astar = require("./astar");

function bidirectional(nodes, start, target, nodesToAnimate, boardArray, name, heuristic, board, trace) {
  if (name === "astar") return astar(nodes, start, target, nodesToAnimate, boardArray, name, heuristic, trace)
  if (!start || !target || start === target) {
    return false;
  }
  nodes[start].distance = 0;
  nodes[start].direction = "right";
  nodes[target].otherdistance = 0;
  nodes[target].otherdirection = "left";
  let visitedNodes = {};
  let unvisitedNodesOne = Object.keys(nodes);
  let unvisitedNodesTwo = Object.keys(nodes);
  while (unvisitedNodesOne.length && unvisitedNodesTwo.length) {
    let currentNode = closestNode(nodes, unvisitedNodesOne);
    let secondCurrentNode = closestNodeTwo(nodes, unvisitedNodesTwo);
    while ((currentNode.status === "wall" || secondCurrentNode.status === "wall") && unvisitedNodesOne.length && unvisitedNodesTwo.length) {
      if (currentNode.status === "wall") currentNode = closestNode(nodes, unvisitedNodesOne);
      if (secondCurrentNode.status === "wall") secondCurrentNode = closestNodeTwo(nodes, unvisitedNodesTwo);
    }
    if (currentNode.distance === Infinity || secondCurrentNode.otherdistance === Infinity) {
      return false;
    }
    if (trace) {
      trace.push({
        t: "select_current",
        step: trace.length,
        direction: "forward",
        current: currentNode.id,
        reason: "min_distance",
        metrics: {
          frontierSize: unvisitedNodesOne.length,
          visitedCount: nodesToAnimate.length
        },
        values: {
          g: currentNode.distance,
          h: currentNode.heuristicDistance || 0,
          f: currentNode.totalDistance !== undefined && currentNode.totalDistance !== null ?
            currentNode.totalDistance : currentNode.distance
        }
      });
      trace.push({
        t: "select_current",
        step: trace.length,
        direction: "backward",
        current: secondCurrentNode.id,
        reason: "min_distance",
        metrics: {
          frontierSize: unvisitedNodesTwo.length,
          visitedCount: nodesToAnimate.length
        },
        values: {
          g: secondCurrentNode.otherdistance,
          h: secondCurrentNode.heuristicDistance || 0,
          f: secondCurrentNode.otherdistance
        }
      });
    }
    nodesToAnimate.push(currentNode);
    nodesToAnimate.push(secondCurrentNode);
    currentNode.status = "visited";
    secondCurrentNode.status = "visited";
    if (visitedNodes[currentNode.id]) {
      board.middleNode = currentNode.id;
      if (trace) {
        trace.push({
          t: "found_midpoint",
          step: trace.length,
          midpoint: currentNode.id
        });
      }
      return "success";
    } else if (visitedNodes[secondCurrentNode.id]) {
      board.middleNode = secondCurrentNode.id;
      if (trace) {
        trace.push({
          t: "found_midpoint",
          step: trace.length,
          midpoint: secondCurrentNode.id
        });
      }
      return "success";
    } else if (currentNode === secondCurrentNode) {
      board.middleNode = secondCurrentNode.id;
      if (trace) {
        trace.push({
          t: "found_midpoint",
          step: trace.length,
          midpoint: secondCurrentNode.id
        });
      }
      return "success";
    }
    visitedNodes[currentNode.id] = true;
    visitedNodes[secondCurrentNode.id] = true;
    updateNeighbors(nodes, currentNode, boardArray, target, name, start, heuristic, trace, "forward");
    updateNeighborsTwo(nodes, secondCurrentNode, boardArray, start, name, target, heuristic, trace, "backward");
  }
  if (trace) {
    trace.push({
      t: "no_path",
      step: trace.length,
      reason: "frontier_exhausted"
    });
  }
}

function closestNode(nodes, unvisitedNodes) {
  let currentClosest, index;
  for (let i = 0; i < unvisitedNodes.length; i++) {
    if (!currentClosest || currentClosest.distance > nodes[unvisitedNodes[i]].distance) {
      currentClosest = nodes[unvisitedNodes[i]];
      index = i;
    }
  }
  unvisitedNodes.splice(index, 1);
  return currentClosest;
}

function closestNodeTwo(nodes, unvisitedNodes) {
  let currentClosest, index;
  for (let i = 0; i < unvisitedNodes.length; i++) {
    if (!currentClosest || currentClosest.otherdistance > nodes[unvisitedNodes[i]].otherdistance) {
      currentClosest = nodes[unvisitedNodes[i]];
      index = i;
    }
  }
  unvisitedNodes.splice(index, 1);
  return currentClosest;
}

function updateNeighbors(nodes, node, boardArray, target, name, start, heuristic, trace, direction) {
  let neighbors = getNeighbors(node.id, nodes, boardArray);
  if (trace) {
    trace.push({
      t: "evaluating_neighbors",
      step: trace.length,
      direction: direction,
      current: node.id,
      neighborCount: neighbors.length
    });
    traceWallNeighbors(node, nodes, boardArray, trace, direction);
  }
  for (let neighbor of neighbors) {
    updateNode(node, nodes[neighbor], nodes[target], name, nodes, nodes[start], heuristic, boardArray, trace, direction);
  }
}

function updateNeighborsTwo(nodes, node, boardArray, target, name, start, heuristic, trace, direction) {
  let neighbors = getNeighbors(node.id, nodes, boardArray);
  if (trace) {
    trace.push({
      t: "evaluating_neighbors",
      step: trace.length,
      direction: direction,
      current: node.id,
      neighborCount: neighbors.length
    });
    traceWallNeighbors(node, nodes, boardArray, trace, direction);
  }
  for (let neighbor of neighbors) {
    updateNodeTwo(node, nodes[neighbor], nodes[target], name, nodes, nodes[start], heuristic, boardArray, trace, direction);
  }
}

function updateNode(currentNode, targetNode, actualTargetNode, name, nodes, actualStartNode, heuristic, boardArray, trace, direction) {
  let distance = getDistance(currentNode, targetNode);
  let weight = targetNode.weight > 0 ? targetNode.weight : 1;
  let distanceToCompare = currentNode.distance + (weight + distance[0]) * manhattanDistance(targetNode, actualTargetNode);
  if (distanceToCompare < targetNode.distance) {
    if (trace) {
      var oldDistance = targetNode.distance;
      var turnPenalty = distance[0] - 1;
      var weightValue = targetNode.weight > 0 ? targetNode.weight : 0;
      trace.push({
        t: "relax_neighbor",
        step: trace.length,
        direction: direction,
        from: currentNode.id,
        to: targetNode.id,
        old: { g: oldDistance, f: oldDistance },
        new: { g: distanceToCompare, f: distanceToCompare },
        components: {
          base: 1,
          turnPenalty: turnPenalty,
          weight: weightValue
        },
        why: "new_cost_lower"
      });
    }
    targetNode.distance = distanceToCompare;
    targetNode.previousNode = currentNode.id;
    targetNode.path = distance[1];
    targetNode.direction = distance[2];
  } else if (trace) {
    var reason = targetNode.status === "visited" ? "visited" : "no_improvement";
    trace.push({
      t: "skip_neighbor",
      step: trace.length,
      direction: direction,
      from: currentNode.id,
      to: targetNode.id,
      reason: reason
    });
  }
}

function updateNodeTwo(currentNode, targetNode, actualTargetNode, name, nodes, actualStartNode, heuristic, boardArray, trace, direction) {
  let distance = getDistanceTwo(currentNode, targetNode);
  let weight = targetNode.weight > 0 ? targetNode.weight : 1;
  let distanceToCompare = currentNode.otherdistance + (weight + distance[0]) * manhattanDistance(targetNode, actualTargetNode);
  if (distanceToCompare < targetNode.otherdistance) {
    if (trace) {
      var oldDistance = targetNode.otherdistance;
      var turnPenalty = distance[0] - 1;
      var weightValue = targetNode.weight > 0 ? targetNode.weight : 0;
      trace.push({
        t: "relax_neighbor",
        step: trace.length,
        direction: direction,
        from: currentNode.id,
        to: targetNode.id,
        old: { g: oldDistance, f: oldDistance },
        new: { g: distanceToCompare, f: distanceToCompare },
        components: {
          base: 1,
          turnPenalty: turnPenalty,
          weight: weightValue
        },
        why: "new_cost_lower"
      });
    }
    targetNode.otherdistance = distanceToCompare;
    targetNode.otherpreviousNode = currentNode.id;
    targetNode.path = distance[1];
    targetNode.otherdirection = distance[2];
  } else if (trace) {
    var reason = targetNode.status === "visited" ? "visited" : "no_improvement";
    trace.push({
      t: "skip_neighbor",
      step: trace.length,
      direction: direction,
      from: currentNode.id,
      to: targetNode.id,
      reason: reason
    });
  }
}

function getNeighbors(id, nodes, boardArray) {
  let coordinates = id.split("-");
  let x = parseInt(coordinates[0]);
  let y = parseInt(coordinates[1]);
  let neighbors = [];
  let potentialNeighbor;
  if (boardArray[x - 1] && boardArray[x - 1][y]) {
    potentialNeighbor = `${(x - 1).toString()}-${y.toString()}`
    if (nodes[potentialNeighbor].status !== "wall") neighbors.push(potentialNeighbor);
  }
  if (boardArray[x + 1] && boardArray[x + 1][y]) {
    potentialNeighbor = `${(x + 1).toString()}-${y.toString()}`
    if (nodes[potentialNeighbor].status !== "wall") neighbors.push(potentialNeighbor);
  }
  if (boardArray[x][y - 1]) {
    potentialNeighbor = `${x.toString()}-${(y - 1).toString()}`
    if (nodes[potentialNeighbor].status !== "wall") neighbors.push(potentialNeighbor);
  }
  if (boardArray[x][y + 1]) {
    potentialNeighbor = `${x.toString()}-${(y + 1).toString()}`
    if (nodes[potentialNeighbor].status !== "wall") neighbors.push(potentialNeighbor);
  }
  return neighbors;
}

function traceWallNeighbors(node, nodes, boardArray, trace, direction) {
  let coordinates = node.id.split("-");
  let x = parseInt(coordinates[0]);
  let y = parseInt(coordinates[1]);
  let potentialNeighbor;
  if (boardArray[x - 1] && boardArray[x - 1][y]) {
    potentialNeighbor = `${(x - 1).toString()}-${y.toString()}`;
    if (nodes[potentialNeighbor].status === "wall") {
      trace.push({ t: "skip_neighbor", step: trace.length, direction: direction, from: node.id, to: potentialNeighbor, reason: "wall" });
    }
  }
  if (boardArray[x + 1] && boardArray[x + 1][y]) {
    potentialNeighbor = `${(x + 1).toString()}-${y.toString()}`;
    if (nodes[potentialNeighbor].status === "wall") {
      trace.push({ t: "skip_neighbor", step: trace.length, direction: direction, from: node.id, to: potentialNeighbor, reason: "wall" });
    }
  }
  if (boardArray[x][y - 1]) {
    potentialNeighbor = `${x.toString()}-${(y - 1).toString()}`;
    if (nodes[potentialNeighbor].status === "wall") {
      trace.push({ t: "skip_neighbor", step: trace.length, direction: direction, from: node.id, to: potentialNeighbor, reason: "wall" });
    }
  }
  if (boardArray[x][y + 1]) {
    potentialNeighbor = `${x.toString()}-${(y + 1).toString()}`;
    if (nodes[potentialNeighbor].status === "wall") {
      trace.push({ t: "skip_neighbor", step: trace.length, direction: direction, from: node.id, to: potentialNeighbor, reason: "wall" });
    }
  }
}

function getDistance(nodeOne, nodeTwo) {
  let currentCoordinates = nodeOne.id.split("-");
  let targetCoordinates = nodeTwo.id.split("-");
  let x1 = parseInt(currentCoordinates[0]);
  let y1 = parseInt(currentCoordinates[1]);
  let x2 = parseInt(targetCoordinates[0]);
  let y2 = parseInt(targetCoordinates[1]);
  if (x2 < x1) {
    if (nodeOne.direction === "up") {
      return [1, ["f"], "up"];
    } else if (nodeOne.direction === "right") {
      return [2, ["l", "f"], "up"];
    } else if (nodeOne.direction === "left") {
      return [2, ["r", "f"], "up"];
    } else if (nodeOne.direction === "down") {
      return [3, ["r", "r", "f"], "up"];
    }
  } else if (x2 > x1) {
    if (nodeOne.direction === "up") {
      return [3, ["r", "r", "f"], "down"];
    } else if (nodeOne.direction === "right") {
      return [2, ["r", "f"], "down"];
    } else if (nodeOne.direction === "left") {
      return [2, ["l", "f"], "down"];
    } else if (nodeOne.direction === "down") {
      return [1, ["f"], "down"];
    }
  }
  if (y2 < y1) {
    if (nodeOne.direction === "up") {
      return [2, ["l", "f"], "left"];
    } else if (nodeOne.direction === "right") {
      return [3, ["l", "l", "f"], "left"];
    } else if (nodeOne.direction === "left") {
      return [1, ["f"], "left"];
    } else if (nodeOne.direction === "down") {
      return [2, ["r", "f"], "left"];
    }
  } else if (y2 > y1) {
    if (nodeOne.direction === "up") {
      return [2, ["r", "f"], "right"];
    } else if (nodeOne.direction === "right") {
      return [1, ["f"], "right"];
    } else if (nodeOne.direction === "left") {
      return [3, ["r", "r", "f"], "right"];
    } else if (nodeOne.direction === "down") {
      return [2, ["l", "f"], "right"];
    }
  }
}

function getDistanceTwo(nodeOne, nodeTwo) {
  let currentCoordinates = nodeOne.id.split("-");
  let targetCoordinates = nodeTwo.id.split("-");
  let x1 = parseInt(currentCoordinates[0]);
  let y1 = parseInt(currentCoordinates[1]);
  let x2 = parseInt(targetCoordinates[0]);
  let y2 = parseInt(targetCoordinates[1]);
  if (x2 < x1) {
    if (nodeOne.otherdirection === "up") {
      return [1, ["f"], "up"];
    } else if (nodeOne.otherdirection === "right") {
      return [2, ["l", "f"], "up"];
    } else if (nodeOne.otherdirection === "left") {
      return [2, ["r", "f"], "up"];
    } else if (nodeOne.otherdirection === "down") {
      return [3, ["r", "r", "f"], "up"];
    }
  } else if (x2 > x1) {
    if (nodeOne.otherdirection === "up") {
      return [3, ["r", "r", "f"], "down"];
    } else if (nodeOne.otherdirection === "right") {
      return [2, ["r", "f"], "down"];
    } else if (nodeOne.otherdirection === "left") {
      return [2, ["l", "f"], "down"];
    } else if (nodeOne.otherdirection === "down") {
      return [1, ["f"], "down"];
    }
  }
  if (y2 < y1) {
    if (nodeOne.otherdirection === "up") {
      return [2, ["l", "f"], "left"];
    } else if (nodeOne.otherdirection === "right") {
      return [3, ["l", "l", "f"], "left"];
    } else if (nodeOne.otherdirection === "left") {
      return [1, ["f"], "left"];
    } else if (nodeOne.otherdirection === "down") {
      return [2, ["r", "f"], "left"];
    }
  } else if (y2 > y1) {
    if (nodeOne.otherdirection === "up") {
      return [2, ["r", "f"], "right"];
    } else if (nodeOne.otherdirection === "right") {
      return [1, ["f"], "right"];
    } else if (nodeOne.otherdirection === "left") {
      return [3, ["r", "r", "f"], "right"];
    } else if (nodeOne.otherdirection === "down") {
      return [2, ["l", "f"], "right"];
    }
  }
}

function manhattanDistance(nodeOne, nodeTwo) {
  let nodeOneCoordinates = nodeOne.id.split("-").map(ele => parseInt(ele));
  let nodeTwoCoordinates = nodeTwo.id.split("-").map(ele => parseInt(ele));
  let xChange = Math.abs(nodeOneCoordinates[0] - nodeTwoCoordinates[0]);
  let yChange = Math.abs(nodeOneCoordinates[1] - nodeTwoCoordinates[1]);
  return (xChange + yChange);
}

function weightedManhattanDistance(nodeOne, nodeTwo, nodes) {
  let nodeOneCoordinates = nodeOne.id.split("-").map(ele => parseInt(ele));
  let nodeTwoCoordinates = nodeTwo.id.split("-").map(ele => parseInt(ele));
  let xChange = Math.abs(nodeOneCoordinates[0] - nodeTwoCoordinates[0]);
  let yChange = Math.abs(nodeOneCoordinates[1] - nodeTwoCoordinates[1]);

  if (nodeOneCoordinates[0] < nodeTwoCoordinates[0] && nodeOneCoordinates[1] < nodeTwoCoordinates[1]) {

    let additionalxChange = 0,
      additionalyChange = 0;
    for (let currentx = nodeOneCoordinates[0]; currentx <= nodeTwoCoordinates[0]; currentx++) {
      let currentId = `${currentx}-${nodeOne.id.split("-")[1]}`;
      let currentNode = nodes[currentId];
      additionalxChange += currentNode.weight;
    }
    for (let currenty = nodeOneCoordinates[1]; currenty <= nodeTwoCoordinates[1]; currenty++) {
      let currentId = `${nodeTwoCoordinates[0]}-${currenty}`;
      let currentNode = nodes[currentId];
      additionalyChange += currentNode.weight;
    }

    let otherAdditionalxChange = 0,
      otherAdditionalyChange = 0;
    for (let currenty = nodeOneCoordinates[1]; currenty <= nodeTwoCoordinates[1]; currenty++) {
      let currentId = `${nodeOne.id.split("-")[0]}-${currenty}`;
      let currentNode = nodes[currentId];
      additionalyChange += currentNode.weight;
    }
    for (let currentx = nodeOneCoordinates[0]; currentx <= nodeTwoCoordinates[0]; currentx++) {
      let currentId = `${currentx}-${nodeTwoCoordinates[1]}`;
      let currentNode = nodes[currentId];
      additionalxChange += currentNode.weight;
    }

    if (additionalxChange + additionalyChange < otherAdditionalxChange + otherAdditionalyChange) {
      xChange += additionalxChange;
      yChange += additionalyChange;
    } else {
      xChange += otherAdditionalxChange;
      yChange += otherAdditionalyChange;
    }
  } else if (nodeOneCoordinates[0] < nodeTwoCoordinates[0] && nodeOneCoordinates[1] >= nodeTwoCoordinates[1]) {
    let additionalxChange = 0,
      additionalyChange = 0;
    for (let currentx = nodeOneCoordinates[0]; currentx <= nodeTwoCoordinates[0]; currentx++) {
      let currentId = `${currentx}-${nodeOne.id.split("-")[1]}`;
      let currentNode = nodes[currentId];
      additionalxChange += currentNode.weight;
    }
    for (let currenty = nodeOneCoordinates[1]; currenty >= nodeTwoCoordinates[1]; currenty--) {
      let currentId = `${nodeTwoCoordinates[0]}-${currenty}`;
      let currentNode = nodes[currentId];
      additionalyChange += currentNode.weight;
    }

    let otherAdditionalxChange = 0,
      otherAdditionalyChange = 0;
    for (let currenty = nodeOneCoordinates[1]; currenty >= nodeTwoCoordinates[1]; currenty--) {
      let currentId = `${nodeOne.id.split("-")[0]}-${currenty}`;
      let currentNode = nodes[currentId];
      additionalyChange += currentNode.weight;
    }
    for (let currentx = nodeOneCoordinates[0]; currentx <= nodeTwoCoordinates[0]; currentx++) {
      let currentId = `${currentx}-${nodeTwoCoordinates[1]}`;
      let currentNode = nodes[currentId];
      additionalxChange += currentNode.weight;
    }

    if (additionalxChange + additionalyChange < otherAdditionalxChange + otherAdditionalyChange) {
      xChange += additionalxChange;
      yChange += additionalyChange;
    } else {
      xChange += otherAdditionalxChange;
      yChange += otherAdditionalyChange;
    }
  } else if (nodeOneCoordinates[0] >= nodeTwoCoordinates[0] && nodeOneCoordinates[1] < nodeTwoCoordinates[1]) {
    let additionalxChange = 0,
      additionalyChange = 0;
    for (let currentx = nodeOneCoordinates[0]; currentx >= nodeTwoCoordinates[0]; currentx--) {
      let currentId = `${currentx}-${nodeOne.id.split("-")[1]}`;
      let currentNode = nodes[currentId];
      additionalxChange += currentNode.weight;
    }
    for (let currenty = nodeOneCoordinates[1]; currenty <= nodeTwoCoordinates[1]; currenty++) {
      let currentId = `${nodeTwoCoordinates[0]}-${currenty}`;
      let currentNode = nodes[currentId];
      additionalyChange += currentNode.weight;
    }

    let otherAdditionalxChange = 0,
      otherAdditionalyChange = 0;
    for (let currenty = nodeOneCoordinates[1]; currenty <= nodeTwoCoordinates[1]; currenty++) {
      let currentId = `${nodeOne.id.split("-")[0]}-${currenty}`;
      let currentNode = nodes[currentId];
      additionalyChange += currentNode.weight;
    }
    for (let currentx = nodeOneCoordinates[0]; currentx >= nodeTwoCoordinates[0]; currentx--) {
      let currentId = `${currentx}-${nodeTwoCoordinates[1]}`;
      let currentNode = nodes[currentId];
      additionalxChange += currentNode.weight;
    }

    if (additionalxChange + additionalyChange < otherAdditionalxChange + otherAdditionalyChange) {
      xChange += additionalxChange;
      yChange += additionalyChange;
    } else {
      xChange += otherAdditionalxChange;
      yChange += otherAdditionalyChange;
    }
  } else if (nodeOneCoordinates[0] >= nodeTwoCoordinates[0] && nodeOneCoordinates[1] >= nodeTwoCoordinates[1]) {
    let additionalxChange = 0,
      additionalyChange = 0;
    for (let currentx = nodeOneCoordinates[0]; currentx >= nodeTwoCoordinates[0]; currentx--) {
      let currentId = `${currentx}-${nodeOne.id.split("-")[1]}`;
      let currentNode = nodes[currentId];
      additionalxChange += currentNode.weight;
    }
    for (let currenty = nodeOneCoordinates[1]; currenty >= nodeTwoCoordinates[1]; currenty--) {
      let currentId = `${nodeTwoCoordinates[0]}-${currenty}`;
      let currentNode = nodes[currentId];
      additionalyChange += currentNode.weight;
    }

    let otherAdditionalxChange = 0,
      otherAdditionalyChange = 0;
    for (let currenty = nodeOneCoordinates[1]; currenty >= nodeTwoCoordinates[1]; currenty--) {
      let currentId = `${nodeOne.id.split("-")[0]}-${currenty}`;
      let currentNode = nodes[currentId];
      additionalyChange += currentNode.weight;
    }
    for (let currentx = nodeOneCoordinates[0]; currentx >= nodeTwoCoordinates[0]; currentx--) {
      let currentId = `${currentx}-${nodeTwoCoordinates[1]}`;
      let currentNode = nodes[currentId];
      additionalxChange += currentNode.weight;
    }

    if (additionalxChange + additionalyChange < otherAdditionalxChange + otherAdditionalyChange) {
      xChange += additionalxChange;
      yChange += additionalyChange;
    } else {
      xChange += otherAdditionalxChange;
      yChange += otherAdditionalyChange;
    }
  }


  return xChange + yChange;


}

module.exports = bidirectional;

},{"./astar":12}],14:[function(require,module,exports){
function unweightedSearchAlgorithm(nodes, start, target, nodesToAnimate, boardArray, name, trace) {
  if (!start || !target || start === target) {
    return false;
  }
  let structure = [nodes[start]];
  let exploredNodes = {start: true};
  while (structure.length) {
    let currentNode = name === "bfs" ? structure.shift() : structure.pop();
    if (trace) {
      trace.push({
        t: "select_current",
        step: trace.length,
        current: currentNode.id,
        reason: name === "bfs" ? "fifo_queue" : "lifo_stack",
        metrics: {
          frontierSize: structure.length,
          visitedCount: nodesToAnimate.length
        }
      });
    }
    nodesToAnimate.push(currentNode);
    if (name === "dfs") exploredNodes[currentNode.id] = true;
    currentNode.status = "visited";
    if (currentNode.id === target) {
      if (trace) {
        var pathLength = computePathLength(nodes, start, target);
        trace.push({
          t: "found_target",
          step: trace.length,
          target: target,
          metrics: {
            visitedCount: nodesToAnimate.length,
            pathCost: pathLength
          }
        });
      }
      return "success";
    }
    let currentNeighbors = getNeighbors(currentNode.id, nodes, boardArray, name);
    if (trace) {
      traceWallNeighbors(currentNode, nodes, boardArray, trace);
    }
    currentNeighbors.forEach(neighbor => {
      if (!exploredNodes[neighbor]) {
        if (name === "bfs") exploredNodes[neighbor] = true;
        nodes[neighbor].previousNode = currentNode.id;
        structure.push(nodes[neighbor]);
      } else if (trace) {
        trace.push({
          t: "skip_neighbor",
          step: trace.length,
          from: currentNode.id,
          to: neighbor,
          reason: "visited"
        });
      }
    });
  }
  if (trace) {
    trace.push({
      t: "no_path",
      step: trace.length,
      reason: "frontier_exhausted"
    });
  }
  return false;
}

function getNeighbors(id, nodes, boardArray, name) {
  let coordinates = id.split("-");
  let x = parseInt(coordinates[0]);
  let y = parseInt(coordinates[1]);
  let neighbors = [];
  let potentialNeighbor;
  if (boardArray[x - 1] && boardArray[x - 1][y]) {
    potentialNeighbor = `${(x - 1).toString()}-${y.toString()}`
    if (nodes[potentialNeighbor].status !== "wall") {
      if (name === "bfs") {
        neighbors.push(potentialNeighbor);
      } else {
        neighbors.unshift(potentialNeighbor);
      }
    }
  }
  if (boardArray[x][y + 1]) {
    potentialNeighbor = `${x.toString()}-${(y + 1).toString()}`
    if (nodes[potentialNeighbor].status !== "wall") {
      if (name === "bfs") {
        neighbors.push(potentialNeighbor);
      } else {
        neighbors.unshift(potentialNeighbor);
      }
    }
  }
  if (boardArray[x + 1] && boardArray[x + 1][y]) {
    potentialNeighbor = `${(x + 1).toString()}-${y.toString()}`
    if (nodes[potentialNeighbor].status !== "wall") {
      if (name === "bfs") {
        neighbors.push(potentialNeighbor);
      } else {
        neighbors.unshift(potentialNeighbor);
      }
    }
  }
  if (boardArray[x][y - 1]) {
    potentialNeighbor = `${x.toString()}-${(y - 1).toString()}`
    if (nodes[potentialNeighbor].status !== "wall") {
      if (name === "bfs") {
        neighbors.push(potentialNeighbor);
      } else {
        neighbors.unshift(potentialNeighbor);
      }
    }
  }
  return neighbors;
}

function traceWallNeighbors(node, nodes, boardArray, trace) {
  let coordinates = node.id.split("-");
  let x = parseInt(coordinates[0]);
  let y = parseInt(coordinates[1]);
  let potentialNeighbor;
  if (boardArray[x - 1] && boardArray[x - 1][y]) {
    potentialNeighbor = `${(x - 1).toString()}-${y.toString()}`;
    if (nodes[potentialNeighbor].status === "wall") {
      trace.push({ t: "skip_neighbor", step: trace.length, from: node.id, to: potentialNeighbor, reason: "wall" });
    }
  }
  if (boardArray[x][y + 1]) {
    potentialNeighbor = `${x.toString()}-${(y + 1).toString()}`;
    if (nodes[potentialNeighbor].status === "wall") {
      trace.push({ t: "skip_neighbor", step: trace.length, from: node.id, to: potentialNeighbor, reason: "wall" });
    }
  }
  if (boardArray[x + 1] && boardArray[x + 1][y]) {
    potentialNeighbor = `${(x + 1).toString()}-${y.toString()}`;
    if (nodes[potentialNeighbor].status === "wall") {
      trace.push({ t: "skip_neighbor", step: trace.length, from: node.id, to: potentialNeighbor, reason: "wall" });
    }
  }
  if (boardArray[x][y - 1]) {
    potentialNeighbor = `${x.toString()}-${(y - 1).toString()}`;
    if (nodes[potentialNeighbor].status === "wall") {
      trace.push({ t: "skip_neighbor", step: trace.length, from: node.id, to: potentialNeighbor, reason: "wall" });
    }
  }
}

function computePathLength(nodes, start, target) {
  var length = 0;
  var current = nodes[target];
  while (current && current.id !== start) {
    length++;
    current = nodes[current.previousNode];
  }
  if (current && current.id === start) {
    length++;
  }
  return length;
}

module.exports = unweightedSearchAlgorithm;

},{}],15:[function(require,module,exports){
const astar = require("./astar");

function weightedSearchAlgorithm(nodes, start, target, nodesToAnimate, boardArray, name, heuristic, trace) {
  if (name === "astar") return astar(nodes, start, target, nodesToAnimate, boardArray, name, heuristic, trace)
  if (!start || !target || start === target) {
    return false;
  }
  nodes[start].distance = 0;
  nodes[start].direction = "right";
  // Trace-only gScore initialization (does not affect algorithm decisions)
  Object.keys(nodes).forEach(function (id) {
    nodes[id].gScore = Infinity;
  });
  if (nodes[start]) nodes[start].gScore = 0;
  let unvisitedNodes = Object.keys(nodes);
  while (unvisitedNodes.length) {
    let currentNode = closestNode(nodes, unvisitedNodes);
    while (currentNode.status === "wall" && unvisitedNodes.length) {
      currentNode = closestNode(nodes, unvisitedNodes)
    }
    if (currentNode.distance === Infinity) {
      return false;
    }
    if (trace) {
      var gValue = currentNode.distance;
      var hValue = currentNode.heuristicDistance || 0;
      var fValue = name === "dijkstra" ? currentNode.distance :
        (currentNode.totalDistance !== undefined && currentNode.totalDistance !== null ?
          currentNode.totalDistance : currentNode.distance);

      if (name === "CLA") {
        gValue = currentNode.gScore !== undefined ? currentNode.gScore : currentNode.distance;
        hValue = manhattanDistance(currentNode, nodes[target]);
        fValue = gValue + hValue;
      }
      if (name === "greedy") {
        fValue = hValue;
      }
      trace.push({
        t: "select_current",
        step: trace.length,
        current: currentNode.id,
        reason: name === "dijkstra" ? "min_distance" : "min_total_distance",
        metrics: {
          frontierSize: unvisitedNodes.length,
          visitedCount: nodesToAnimate.length
        },
        values: {
          g: gValue,
          h: hValue,
          f: fValue
        }
      });
    }
    nodesToAnimate.push(currentNode);
    currentNode.status = "visited";
    if (currentNode.id === target) {
      if (trace) {
        trace.push({
          t: "found_target",
          step: trace.length,
          target: target,
          metrics: {
            visitedCount: nodesToAnimate.length,
            pathCost: currentNode.distance
          }
        });
      }
      return "success!";
    }
    if (name === "CLA" || name === "greedy") {
      updateNeighbors(nodes, currentNode, boardArray, target, name, start, heuristic, trace);
    } else if (name === "dijkstra") {
      updateNeighbors(nodes, currentNode, boardArray, null, name, start, heuristic, trace);
    }
  }
  if (trace) {
    trace.push({
      t: "no_path",
      step: trace.length,
      reason: "frontier_exhausted"
    });
  }
}

function closestNode(nodes, unvisitedNodes) {
  let currentClosest, index;
  for (let i = 0; i < unvisitedNodes.length; i++) {
    if (!currentClosest || currentClosest.distance > nodes[unvisitedNodes[i]].distance) {
      currentClosest = nodes[unvisitedNodes[i]];
      index = i;
    }
  }
  unvisitedNodes.splice(index, 1);
  return currentClosest;
}

function updateNeighbors(nodes, node, boardArray, target, name, start, heuristic, trace) {
  let neighbors = getNeighbors(node.id, nodes, boardArray);
  if (trace) {
    trace.push({
      t: "evaluating_neighbors",
      step: trace.length,
      current: node.id,
      neighborCount: neighbors.length
    });
    traceWallNeighbors(node, nodes, boardArray, trace);
  }
  for (let neighbor of neighbors) {
    if (target) {
      updateNode(node, nodes[neighbor], nodes[target], name, nodes, nodes[start], heuristic, boardArray, trace);
    } else {
      updateNode(node, nodes[neighbor], null, name, nodes, nodes[start], heuristic, boardArray, trace);
    }
  }
}

function averageNumberOfNodesBetween(currentNode) {
  let num = 0;
  while (currentNode.previousNode) {
    num++;
    currentNode = currentNode.previousNode;
  }
  return num;
}


function updateNode(currentNode, targetNode, actualTargetNode, name, nodes, actualStartNode, heuristic, boardArray, trace) {
  let distance = getDistance(currentNode, targetNode);
  let distanceToCompare;
  if (actualTargetNode && name === "CLA") {
    let weight = targetNode.weight > 0 ? targetNode.weight : 1;
    if (heuristic === "manhattanDistance") {
      distanceToCompare = currentNode.distance + (distance[0] + weight) * manhattanDistance(targetNode, actualTargetNode);
    } else if (heuristic === "poweredManhattanDistance") {
      distanceToCompare = currentNode.distance + targetNode.weight + distance[0] + Math.pow(manhattanDistance(targetNode, actualTargetNode), 2);
    } else if (heuristic === "extraPoweredManhattanDistance") {
      distanceToCompare = currentNode.distance + (distance[0] + weight) * Math.pow(manhattanDistance(targetNode, actualTargetNode), 7);
    }
    let startNodeManhattanDistance = manhattanDistance(actualStartNode, actualTargetNode);
  } else if (actualTargetNode && name === "greedy") {
    distanceToCompare = targetNode.weight + distance[0] + manhattanDistance(targetNode, actualTargetNode);
  } else {
    distanceToCompare = currentNode.distance + targetNode.weight + distance[0];
  }
  if (distanceToCompare < targetNode.distance) {
    if (trace) {
      var oldDistance = targetNode.distance;
      var oldTotal = targetNode.totalDistance !== undefined && targetNode.totalDistance !== null ?
        targetNode.totalDistance : targetNode.distance;
      var turnPenalty = distance[0] - 1;
      var weightValue = targetNode.weight > 0 ? targetNode.weight : 0;
      trace.push({
        t: "relax_neighbor",
        step: trace.length,
        from: currentNode.id,
        to: targetNode.id,
        old: { g: oldDistance, f: oldTotal },
        new: { g: distanceToCompare, f: distanceToCompare },
        components: {
          base: 1,
          turnPenalty: turnPenalty,
          weight: weightValue
        },
        why: "new_cost_lower"
      });
    }
    // Trace-only gScore (base + turn + weight)
    var weightValue = targetNode.weight > 0 ? targetNode.weight : 0;
    var gCandidate = (currentNode.gScore !== undefined ? currentNode.gScore : currentNode.distance) + distance[0] + weightValue;
    targetNode.gScore = gCandidate;

    targetNode.distance = distanceToCompare;
    targetNode.previousNode = currentNode.id;
    targetNode.path = distance[1];
    targetNode.direction = distance[2];
  } else if (trace) {
    var reason = targetNode.status === "visited" ? "visited" : "no_improvement";
    trace.push({
      t: "skip_neighbor",
      step: trace.length,
      from: currentNode.id,
      to: targetNode.id,
      reason: reason
    });
  }
}

function getNeighbors(id, nodes, boardArray) {
  let coordinates = id.split("-");
  let x = parseInt(coordinates[0]);
  let y = parseInt(coordinates[1]);
  let neighbors = [];
  let potentialNeighbor;
  if (boardArray[x - 1] && boardArray[x - 1][y]) {
    potentialNeighbor = `${(x - 1).toString()}-${y.toString()}`
    if (nodes[potentialNeighbor].status !== "wall") neighbors.push(potentialNeighbor);
  }
  if (boardArray[x + 1] && boardArray[x + 1][y]) {
    potentialNeighbor = `${(x + 1).toString()}-${y.toString()}`
    if (nodes[potentialNeighbor].status !== "wall") neighbors.push(potentialNeighbor);
  }
  if (boardArray[x][y - 1]) {
    potentialNeighbor = `${x.toString()}-${(y - 1).toString()}`
    if (nodes[potentialNeighbor].status !== "wall") neighbors.push(potentialNeighbor);
  }
  if (boardArray[x][y + 1]) {
    potentialNeighbor = `${x.toString()}-${(y + 1).toString()}`
    if (nodes[potentialNeighbor].status !== "wall") neighbors.push(potentialNeighbor);
  }
  return neighbors;
}

function traceWallNeighbors(node, nodes, boardArray, trace) {
  let coordinates = node.id.split("-");
  let x = parseInt(coordinates[0]);
  let y = parseInt(coordinates[1]);
  let potentialNeighbor;
  if (boardArray[x - 1] && boardArray[x - 1][y]) {
    potentialNeighbor = `${(x - 1).toString()}-${y.toString()}`;
    if (nodes[potentialNeighbor].status === "wall") {
      trace.push({ t: "skip_neighbor", step: trace.length, from: node.id, to: potentialNeighbor, reason: "wall" });
    }
  }
  if (boardArray[x + 1] && boardArray[x + 1][y]) {
    potentialNeighbor = `${(x + 1).toString()}-${y.toString()}`;
    if (nodes[potentialNeighbor].status === "wall") {
      trace.push({ t: "skip_neighbor", step: trace.length, from: node.id, to: potentialNeighbor, reason: "wall" });
    }
  }
  if (boardArray[x][y - 1]) {
    potentialNeighbor = `${x.toString()}-${(y - 1).toString()}`;
    if (nodes[potentialNeighbor].status === "wall") {
      trace.push({ t: "skip_neighbor", step: trace.length, from: node.id, to: potentialNeighbor, reason: "wall" });
    }
  }
  if (boardArray[x][y + 1]) {
    potentialNeighbor = `${x.toString()}-${(y + 1).toString()}`;
    if (nodes[potentialNeighbor].status === "wall") {
      trace.push({ t: "skip_neighbor", step: trace.length, from: node.id, to: potentialNeighbor, reason: "wall" });
    }
  }
}


function getDistance(nodeOne, nodeTwo) {
  let currentCoordinates = nodeOne.id.split("-");
  let targetCoordinates = nodeTwo.id.split("-");
  let x1 = parseInt(currentCoordinates[0]);
  let y1 = parseInt(currentCoordinates[1]);
  let x2 = parseInt(targetCoordinates[0]);
  let y2 = parseInt(targetCoordinates[1]);
  if (x2 < x1) {
    if (nodeOne.direction === "up") {
      return [1, ["f"], "up"];
    } else if (nodeOne.direction === "right") {
      return [2, ["l", "f"], "up"];
    } else if (nodeOne.direction === "left") {
      return [2, ["r", "f"], "up"];
    } else if (nodeOne.direction === "down") {
      return [3, ["r", "r", "f"], "up"];
    }
  } else if (x2 > x1) {
    if (nodeOne.direction === "up") {
      return [3, ["r", "r", "f"], "down"];
    } else if (nodeOne.direction === "right") {
      return [2, ["r", "f"], "down"];
    } else if (nodeOne.direction === "left") {
      return [2, ["l", "f"], "down"];
    } else if (nodeOne.direction === "down") {
      return [1, ["f"], "down"];
    }
  }
  if (y2 < y1) {
    if (nodeOne.direction === "up") {
      return [2, ["l", "f"], "left"];
    } else if (nodeOne.direction === "right") {
      return [3, ["l", "l", "f"], "left"];
    } else if (nodeOne.direction === "left") {
      return [1, ["f"], "left"];
    } else if (nodeOne.direction === "down") {
      return [2, ["r", "f"], "left"];
    }
  } else if (y2 > y1) {
    if (nodeOne.direction === "up") {
      return [2, ["r", "f"], "right"];
    } else if (nodeOne.direction === "right") {
      return [1, ["f"], "right"];
    } else if (nodeOne.direction === "left") {
      return [3, ["r", "r", "f"], "right"];
    } else if (nodeOne.direction === "down") {
      return [2, ["l", "f"], "right"];
    }
  }
}

function manhattanDistance(nodeOne, nodeTwo) {
  let nodeOneCoordinates = nodeOne.id.split("-").map(ele => parseInt(ele));
  let nodeTwoCoordinates = nodeTwo.id.split("-").map(ele => parseInt(ele));
  let xChange = Math.abs(nodeOneCoordinates[0] - nodeTwoCoordinates[0]);
  let yChange = Math.abs(nodeOneCoordinates[1] - nodeTwoCoordinates[1]);
  return (xChange + yChange);
}

function weightedManhattanDistance(nodeOne, nodeTwo, nodes) {
  let nodeOneCoordinates = nodeOne.id.split("-").map(ele => parseInt(ele));
  let nodeTwoCoordinates = nodeTwo.id.split("-").map(ele => parseInt(ele));
  let xChange = Math.abs(nodeOneCoordinates[0] - nodeTwoCoordinates[0]);
  let yChange = Math.abs(nodeOneCoordinates[1] - nodeTwoCoordinates[1]);

  if (nodeOneCoordinates[0] < nodeTwoCoordinates[0] && nodeOneCoordinates[1] < nodeTwoCoordinates[1]) {
    let additionalxChange = 0,
      additionalyChange = 0;
    for (let currentx = nodeOneCoordinates[0]; currentx <= nodeTwoCoordinates[0]; currentx++) {
      let currentId = `${currentx}-${nodeOne.id.split("-")[1]}`;
      let currentNode = nodes[currentId];
      additionalxChange += currentNode.weight;
    }
    for (let currenty = nodeOneCoordinates[1]; currenty <= nodeTwoCoordinates[1]; currenty++) {
      let currentId = `${nodeTwoCoordinates[0]}-${currenty}`;
      let currentNode = nodes[currentId];
      additionalyChange += currentNode.weight;
    }

    let otherAdditionalxChange = 0,
      otherAdditionalyChange = 0;
    for (let currenty = nodeOneCoordinates[1]; currenty <= nodeTwoCoordinates[1]; currenty++) {
      let currentId = `${nodeOne.id.split("-")[0]}-${currenty}`;
      let currentNode = nodes[currentId];
      additionalyChange += currentNode.weight;
    }
    for (let currentx = nodeOneCoordinates[0]; currentx <= nodeTwoCoordinates[0]; currentx++) {
      let currentId = `${currentx}-${nodeTwoCoordinates[1]}`;
      let currentNode = nodes[currentId];
      additionalxChange += currentNode.weight;
    }

    if (additionalxChange + additionalyChange < otherAdditionalxChange + otherAdditionalyChange) {
      xChange += additionalxChange;
      yChange += additionalyChange;
    } else {
      xChange += otherAdditionalxChange;
      yChange += otherAdditionalyChange;
    }
  } else if (nodeOneCoordinates[0] < nodeTwoCoordinates[0] && nodeOneCoordinates[1] >= nodeTwoCoordinates[1]) {
    let additionalxChange = 0,
      additionalyChange = 0;
    for (let currentx = nodeOneCoordinates[0]; currentx <= nodeTwoCoordinates[0]; currentx++) {
      let currentId = `${currentx}-${nodeOne.id.split("-")[1]}`;
      let currentNode = nodes[currentId];
      additionalxChange += currentNode.weight;
    }
    for (let currenty = nodeOneCoordinates[1]; currenty >= nodeTwoCoordinates[1]; currenty--) {
      let currentId = `${nodeTwoCoordinates[0]}-${currenty}`;
      let currentNode = nodes[currentId];
      additionalyChange += currentNode.weight;
    }

    let otherAdditionalxChange = 0,
      otherAdditionalyChange = 0;
    for (let currenty = nodeOneCoordinates[1]; currenty >= nodeTwoCoordinates[1]; currenty--) {
      let currentId = `${nodeOne.id.split("-")[0]}-${currenty}`;
      let currentNode = nodes[currentId];
      additionalyChange += currentNode.weight;
    }
    for (let currentx = nodeOneCoordinates[0]; currentx <= nodeTwoCoordinates[0]; currentx++) {
      let currentId = `${currentx}-${nodeTwoCoordinates[1]}`;
      let currentNode = nodes[currentId];
      additionalxChange += currentNode.weight;
    }

    if (additionalxChange + additionalyChange < otherAdditionalxChange + otherAdditionalyChange) {
      xChange += additionalxChange;
      yChange += additionalyChange;
    } else {
      xChange += otherAdditionalxChange;
      yChange += otherAdditionalyChange;
    }
  } else if (nodeOneCoordinates[0] >= nodeTwoCoordinates[0] && nodeOneCoordinates[1] < nodeTwoCoordinates[1]) {
    let additionalxChange = 0,
      additionalyChange = 0;
    for (let currentx = nodeOneCoordinates[0]; currentx >= nodeTwoCoordinates[0]; currentx--) {
      let currentId = `${currentx}-${nodeOne.id.split("-")[1]}`;
      let currentNode = nodes[currentId];
      additionalxChange += currentNode.weight;
    }
    for (let currenty = nodeOneCoordinates[1]; currenty <= nodeTwoCoordinates[1]; currenty++) {
      let currentId = `${nodeTwoCoordinates[0]}-${currenty}`;
      let currentNode = nodes[currentId];
      additionalyChange += currentNode.weight;
    }

    let otherAdditionalxChange = 0,
      otherAdditionalyChange = 0;
    for (let currenty = nodeOneCoordinates[1]; currenty <= nodeTwoCoordinates[1]; currenty++) {
      let currentId = `${nodeOne.id.split("-")[0]}-${currenty}`;
      let currentNode = nodes[currentId];
      additionalyChange += currentNode.weight;
    }
    for (let currentx = nodeOneCoordinates[0]; currentx >= nodeTwoCoordinates[0]; currentx--) {
      let currentId = `${currentx}-${nodeTwoCoordinates[1]}`;
      let currentNode = nodes[currentId];
      additionalxChange += currentNode.weight;
    }

    if (additionalxChange + additionalyChange < otherAdditionalxChange + otherAdditionalyChange) {
      xChange += additionalxChange;
      yChange += additionalyChange;
    } else {
      xChange += otherAdditionalxChange;
      yChange += otherAdditionalyChange;
    }
  } else if (nodeOneCoordinates[0] >= nodeTwoCoordinates[0] && nodeOneCoordinates[1] >= nodeTwoCoordinates[1]) {
    let additionalxChange = 0,
      additionalyChange = 0;
    for (let currentx = nodeOneCoordinates[0]; currentx >= nodeTwoCoordinates[0]; currentx--) {
      let currentId = `${currentx}-${nodeOne.id.split("-")[1]}`;
      let currentNode = nodes[currentId];
      additionalxChange += currentNode.weight;
    }
    for (let currenty = nodeOneCoordinates[1]; currenty >= nodeTwoCoordinates[1]; currenty--) {
      let currentId = `${nodeTwoCoordinates[0]}-${currenty}`;
      let currentNode = nodes[currentId];
      additionalyChange += currentNode.weight;
    }

    let otherAdditionalxChange = 0,
      otherAdditionalyChange = 0;
    for (let currenty = nodeOneCoordinates[1]; currenty >= nodeTwoCoordinates[1]; currenty--) {
      let currentId = `${nodeOne.id.split("-")[0]}-${currenty}`;
      let currentNode = nodes[currentId];
      additionalyChange += currentNode.weight;
    }
    for (let currentx = nodeOneCoordinates[0]; currentx >= nodeTwoCoordinates[0]; currentx--) {
      let currentId = `${currentx}-${nodeTwoCoordinates[1]}`;
      let currentNode = nodes[currentId];
      additionalxChange += currentNode.weight;
    }

    if (additionalxChange + additionalyChange < otherAdditionalxChange + otherAdditionalyChange) {
      xChange += additionalxChange;
      yChange += additionalyChange;
    } else {
      xChange += otherAdditionalxChange;
      yChange += otherAdditionalyChange;
    }
  }

  return xChange + yChange;


}

module.exports = weightedSearchAlgorithm;

},{"./astar":12}],16:[function(require,module,exports){
var gridMetrics = require("./gridMetrics");

var ALGORITHM_META = {
  dijkstra: {
    algorithmFamily: "weighted",
    guaranteesOptimal: true,
    usesHeuristic: false,
    selectionRule: "Always picks the node with the lowest total distance from start."
  },
  astar: {
    algorithmFamily: "weighted",
    guaranteesOptimal: true,
    usesHeuristic: true,
    selectionRule: "Picks the node with lowest estimated total cost (distance so far plus guess to target)."
  },
  greedy: {
    algorithmFamily: "weighted",
    guaranteesOptimal: false,
    usesHeuristic: true,
    selectionRule: "Always picks the node that looks closest to the target, ignoring distance traveled."
  },
  CLA: {
    algorithmFamily: "weighted",
    guaranteesOptimal: false,
    usesHeuristic: true,
    selectionRule: "Blends distance traveled with estimated remaining distance."
  },
  bidirectional: {
    algorithmFamily: "weighted",
    guaranteesOptimal: false,
    usesHeuristic: true,
    selectionRule: "Searches from both start and target at the same time, meeting in the middle."
  },
  bfs: {
    algorithmFamily: "unweighted",
    guaranteesOptimal: true,
    usesHeuristic: false,
    selectionRule: "Explores all neighbors at current distance before going further."
  },
  dfs: {
    algorithmFamily: "unweighted",
    guaranteesOptimal: false,
    usesHeuristic: false,
    selectionRule: "Goes as deep as possible in one direction before backtracking."
  }
};

function idToReadable(id) {
  if (!id) return "unknown";
  var parts = id.split("-");
  return "row " + parts[0] + ", col " + parts[1];
}

function buildRunDigest(board, visitedCount, pathLength) {
  var algoKey = board.currentAlgorithm || "dijkstra";
  var meta = ALGORITHM_META[algoKey] || ALGORITHM_META.dijkstra;
  var metrics = gridMetrics.calculateGridMetrics(board);

  var visitedSample = [];
  var visitedNodes = board.nodesToAnimate || [];
  for (var i = 0; i < Math.min(8, visitedNodes.length); i++) {
    if (visitedNodes[i] && visitedNodes[i].id) {
      visitedSample.push(idToReadable(visitedNodes[i].id));
    }
  }

  var pathSample = [];
  var pathNodes = board.shortestPathNodesToAnimate || [];

  if (pathNodes.length <= 6) {
    for (var j = 0; j < pathNodes.length; j++) {
      if (pathNodes[j] && pathNodes[j].id) {
        pathSample.push(idToReadable(pathNodes[j].id));
      }
    }
  } else {
    for (var k = 0; k < 3; k++) {
      if (pathNodes[k] && pathNodes[k].id) {
        pathSample.push(idToReadable(pathNodes[k].id));
      }
    }
    pathSample.push("...");
    for (var m = pathNodes.length - 3; m < pathNodes.length; m++) {
      if (pathNodes[m] && pathNodes[m].id) {
        pathSample.push(idToReadable(pathNodes[m].id));
      }
    }
  }

  if (pathSample.length > 0) {
    pathSample.unshift(idToReadable(board.start));
    pathSample.push(idToReadable(board.target));
  }

  return {
    algorithmKey: algoKey,
    meta: meta,
    start: idToReadable(board.start),
    target: idToReadable(board.target),
    visitedCount: visitedCount,
    pathLength: pathLength,
    wallCount: metrics.wallCount,
    weightCount: metrics.weightCount,
    visitedSample: visitedSample,
    pathSample: pathSample,
    gridSize: metrics.gridSize,
    visitedPercent: metrics.visitedPercent,
    directDistance: metrics.directDistance,
    efficiency: metrics.efficiency,
    detourSteps: metrics.detourSteps,
    weightsInPath: countWeightsInPath(board)
  };
}

function countWeightsInPath(board) {
  var count = 0;
  var path = board.shortestPathNodesToAnimate || [];
  for (var i = 0; i < path.length; i++) {
    var node = path[i];
    if (node && node.weight > 0) count++;
  }
  return count;
}

function requestAIExplanation(board, visitedCount, pathLength) {
  var container = document.getElementById("ai-explanation-container");
  var loading = document.getElementById("ai-explanation-loading");
  var textDiv = document.getElementById("ai-explanation-text");

  if (!loading || !textDiv) {
    console.warn("[AI] Missing DOM elements for AI explanation");
    return;
  }

  if (container) {
    container.classList.remove("hidden");
  }
  loading.classList.remove("hidden");
  textDiv.textContent = "";

  var digest = buildRunDigest(board, visitedCount, pathLength);
  console.log("[AI] Sending digest:", digest);

  fetch("/api/explain", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(digest)
  })
    .then(function (response) {
      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }
      return response.json();
    })
    .then(function (data) {
      loading.classList.add("hidden");
      textDiv.textContent = data.explanation || "No explanation available.";
      console.log("[AI] Explanation received (source: " + data.source + ")");
    })
    .catch(function (error) {
      loading.classList.add("hidden");
      textDiv.textContent = "The algorithm visited " + visitedCount +
        " nodes and found a path of " + pathLength + " steps.";
      console.error("[AI] Error:", error);
    });
}

function hideAIExplanation() {
  var container = document.getElementById("ai-explanation-container");
  var loading = document.getElementById("ai-explanation-loading");
  var textDiv = document.getElementById("ai-explanation-text");
  if (container) {
    container.classList.add("hidden");
  }
  if (loading) {
    loading.classList.add("hidden");
  }
  if (textDiv) {
    textDiv.textContent = "";
  }
}

module.exports = {
  requestAIExplanation: requestAIExplanation,
  hideAIExplanation: hideAIExplanation,
  buildRunDigest: buildRunDigest
};

},{"./gridMetrics":20}],17:[function(require,module,exports){
var descriptions = {
  dijkstra: {
    name: "Dijkstra's Algorithm",
    shortDescription: "Finds the shortest path by always expanding the cheapest unvisited node.",
    category: "weighted",
    guaranteesOptimal: true,
    howItWorks: [
      "1. Set start distance = 0, all others = infinity",
      "2. Pick the unvisited node with the smallest distance",
      "3. Update neighbors if a cheaper path is found",
      "4. Mark the current node as visited",
      "5. Repeat until the target is reached or nodes run out"
    ],
    pseudocode: [
      "dist[start] = 0",
      "while unvisited not empty:",
      "  current = node with MIN dist",
      "  if current == target: DONE",
      "  for each neighbor:",
      "    newCost = dist[current] + edgeCost",
      "    if newCost < dist[neighbor]:",
      "      dist[neighbor] = newCost",
      "      neighbor.prev = current"
    ],
    keyInsight: "Expanding the cheapest node first guarantees the shortest path.",
    characteristics: {
      dataStructure: "Priority queue (current implementation uses a linear scan)",
      timeComplexity: "O(V^2) with array, O((V+E) log V) with heap",
      usesHeuristic: false,
      selectionRule: "Pick the node with the smallest g(n)"
    }
  },
  astar: {
    name: "A* Search",
    shortDescription: "Combines real cost so far with a heuristic estimate to guide the search.",
    category: "weighted",
    guaranteesOptimal: true,
    howItWorks: [
      "1. Set start cost = 0 and heuristic estimate to target",
      "2. Pick the node with the lowest f = g + h",
      "3. Update neighbors if a cheaper path is found",
      "4. Mark the current node as visited",
      "5. Repeat until the target is reached"
    ],
    pseudocode: [
      "g[start] = 0",
      "f[start] = h(start)",
      "while open not empty:",
      "  current = node with MIN f",
      "  if current == target: DONE",
      "  for each neighbor:",
      "    gNew = g[current] + edgeCost",
      "    if gNew < g[neighbor]:",
      "      g[neighbor] = gNew",
      "      f[neighbor] = gNew + h(neighbor)",
      "      neighbor.prev = current"
    ],
    keyInsight: "A* stays optimal when the heuristic never overestimates.",
    characteristics: {
      dataStructure: "Priority queue (open set)",
      timeComplexity: "O((V+E) log V) with heap",
      usesHeuristic: true,
      selectionRule: "Pick the node with the smallest f(n) = g(n) + h(n)"
    }
  },
  greedy: {
    name: "Greedy Best-first Search",
    shortDescription: "Prioritizes nodes that look closest to the target using only h(n).",
    category: "weighted",
    guaranteesOptimal: false,
    howItWorks: [
      "1. Compute heuristic h for nodes",
      "2. Pick the node with the smallest h",
      "3. Expand neighbors and repeat",
      "4. Stop when target is reached"
    ],
    pseudocode: [
      "while open not empty:",
      "  current = node with MIN h",
      "  if current == target: DONE",
      "  add neighbors to open",
      "  mark current visited"
    ],
    keyInsight: "Fast, but can miss the shortest path because it ignores g(n).",
    characteristics: {
      dataStructure: "Priority queue (open set)",
      timeComplexity: "O((V+E) log V) typical",
      usesHeuristic: true,
      selectionRule: "Pick the node with the smallest h(n)"
    }
  },
  swarm: {
    name: "Swarm Algorithm",
    shortDescription: "Blends distance so far with a heuristic to guide the search.",
    category: "weighted",
    guaranteesOptimal: false,
    howItWorks: [
      "1. Compute a combined score from g and h",
      "2. Pick the node with the smallest score",
      "3. Relax neighbors and repeat",
      "4. Stop when target is reached"
    ],
    pseudocode: [
      "score = g + h",
      "while open not empty:",
      "  current = node with MIN score",
      "  if current == target: DONE",
      "  relax neighbors",
      "  mark current visited"
    ],
    keyInsight: "Balances speed and path quality but does not guarantee optimal.",
    characteristics: {
      dataStructure: "Priority queue (open set)",
      timeComplexity: "O((V+E) log V) typical",
      usesHeuristic: true,
      selectionRule: "Pick the node with the smallest blended score"
    }
  },
  convergentSwarm: {
    name: "Convergent Swarm Algorithm",
    shortDescription: "Uses an aggressive heuristic (h^7) to rush toward the target.",
    category: "weighted",
    guaranteesOptimal: false,
    howItWorks: [
      "1. Use a heavily powered heuristic (h^7)",
      "2. Pick the node with the smallest combined score",
      "3. Relax neighbors and repeat quickly toward target"
    ],
    pseudocode: [
      "score = g + h^7",
      "while open not empty:",
      "  current = node with MIN score",
      "  if current == target: DONE",
      "  relax neighbors"
    ],
    keyInsight: "Very fast but can skip better paths due to extreme heuristic bias.",
    characteristics: {
      dataStructure: "Priority queue (open set)",
      timeComplexity: "O((V+E) log V) typical",
      usesHeuristic: true,
      selectionRule: "Pick the node with the smallest g + h^7"
    }
  },
  bidirectional: {
    name: "Bidirectional Swarm Algorithm",
    shortDescription: "Runs two searches from start and target until they meet.",
    category: "weighted",
    guaranteesOptimal: false,
    howItWorks: [
      "1. Start one search from start and one from target",
      "2. Expand nodes from both sides",
      "3. Stop when the frontiers meet"
    ],
    pseudocode: [
      "frontA = {start}, frontB = {target}",
      "while frontA and frontB not empty:",
      "  expand one step from each side",
      "  if frontiers meet: DONE"
    ],
    keyInsight: "Can be faster in open grids but is not guaranteed optimal here.",
    characteristics: {
      dataStructure: "Two frontiers (priority queues)",
      timeComplexity: "Often faster than single-source in practice",
      usesHeuristic: true,
      selectionRule: "Expand from both sides with heuristic guidance"
    }
  },
  bfs: {
    name: "Breadth-first Search",
    shortDescription: "Explores level-by-level from the start using a queue.",
    category: "unweighted",
    guaranteesOptimal: true,
    howItWorks: [
      "1. Put the start node in a queue",
      "2. Pop from the front and expand neighbors",
      "3. Push unvisited neighbors to the back",
      "4. Repeat until target is found"
    ],
    pseudocode: [
      "queue = [start]",
      "while queue not empty:",
      "  current = queue.shift()",
      "  if current == target: DONE",
      "  for each neighbor:",
      "    if unvisited: queue.push(neighbor)"
    ],
    keyInsight: "The first time you reach a node is the shortest path in unweighted grids.",
    characteristics: {
      dataStructure: "Queue",
      timeComplexity: "O(V+E)",
      usesHeuristic: false,
      selectionRule: "FIFO (first-in, first-out)"
    }
  },
  dfs: {
    name: "Depth-first Search",
    shortDescription: "Dives deep along one path before backtracking.",
    category: "unweighted",
    guaranteesOptimal: false,
    howItWorks: [
      "1. Push the start node onto a stack",
      "2. Pop the top node and expand a neighbor",
      "3. Keep going deep until stuck, then backtrack"
    ],
    pseudocode: [
      "stack = [start]",
      "while stack not empty:",
      "  current = stack.pop()",
      "  if current == target: DONE",
      "  for each neighbor:",
      "    if unvisited: stack.push(neighbor)"
    ],
    keyInsight: "DFS is fast but can take long detours and is not optimal.",
    characteristics: {
      dataStructure: "Stack",
      timeComplexity: "O(V+E)",
      usesHeuristic: false,
      selectionRule: "LIFO (last-in, first-out)"
    }
  }
};

function getAlgorithmKey(algorithm, heuristic) {
  if (algorithm === "CLA") {
    if (heuristic === "extraPoweredManhattanDistance") return "convergentSwarm";
    return "swarm";
  }
  return algorithm;
}

module.exports = { descriptions: descriptions, getAlgorithmKey: getAlgorithmKey };

},{}],18:[function(require,module,exports){
var algorithmDescriptions = require("./algorithmDescriptions");

function showAlgorithmInfo(algorithmKey) {
  var data = algorithmDescriptions.descriptions[algorithmKey];
  if (!data) return;

  // Remove old modal if it exists
  var old = document.getElementById("algorithmInfoModal");
  if (old && old.parentNode) old.parentNode.removeChild(old);

  var html = '<div class="modal fade" id="algorithmInfoModal" tabindex="-1">' +
    '<div class="modal-dialog modal-lg">' +
    '<div class="modal-content algo-modal-content">' +
    '<div class="modal-header">' +
    '<button type="button" class="close" data-dismiss="modal">&times;</button>' +
    '<h4 class="modal-title">' + data.name + '</h4>' +
    '<span class="badge">' + data.category + '</span> ' +
    '<span class="badge">' + (data.guaranteesOptimal ? "Optimal" : "Not optimal") + '</span>' +
    '</div>' +
    '<div class="modal-body">' +
    '<p>' + data.shortDescription + '</p>' +
    '<h5>How It Works</h5><ol>' +
    data.howItWorks.map(function (s) { return '<li>' + s + '</li>'; }).join('') +
    '</ol>' +
    '<h5>Pseudocode</h5><pre class="algo-pseudocode">' +
    data.pseudocode.join("\n") +
    '</pre>' +
    '<div class="algo-insight"><strong>Key Insight:</strong> ' + data.keyInsight + '</div>' +
    '<h5>Characteristics</h5>' +
    '<table class="table table-condensed">' +
    '<tr><td>Data Structure</td><td>' + data.characteristics.dataStructure + '</td></tr>' +
    '<tr><td>Time Complexity</td><td>' + data.characteristics.timeComplexity + '</td></tr>' +
    '<tr><td>Uses Heuristic</td><td>' + (data.characteristics.usesHeuristic ? "Yes" : "No") + '</td></tr>' +
    '<tr><td>Selection Rule</td><td>' + data.characteristics.selectionRule + '</td></tr>' +
    '</table>' +
    '</div>' +
    '<div class="modal-footer">' +
    '<button type="button" class="btn btn-default" data-dismiss="modal">Got it!</button>' +
    '</div>' +
    '</div></div></div>';

  var wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  var modal = wrapper.firstChild;
  document.body.appendChild(modal);

  $(modal).modal("show");

  $(modal).on("hidden.bs.modal", function () {
    if (modal.parentNode) modal.parentNode.removeChild(modal);
  });
}

module.exports = { showAlgorithmInfo: showAlgorithmInfo };

},{"./algorithmDescriptions":17}],19:[function(require,module,exports){
function generateExplanation(event, algorithmKey) {
  var templates = {
    select_current: function (e) {
      var coords = idToCoords(e.current);
      var algoContext = "";
      if (algorithmKey === "dijkstra") {
        algoContext = " Dijkstra always picks the cheapest unvisited node — this guarantees the optimal path.";
      } else if (algorithmKey === "astar") {
        algoContext = " A* combines actual cost g(n) with estimated distance h(n) to prioritize nodes likely on the shortest path.";
      } else if (algorithmKey === "greedy") {
        algoContext = " Greedy only looks at h(n) — fast but can miss shorter paths.";
      } else if (algorithmKey === "swarm") {
        algoContext = " Swarm blends g(n) and h(n) with moderate bias toward the target.";
      } else if (algorithmKey === "convergentSwarm") {
        algoContext = " Convergent Swarm uses an extremely aggressive heuristic (h^7) to rush toward the target.";
      } else if (algorithmKey === "bfs") {
        algoContext = " BFS explores level-by-level from start, guaranteeing the shortest path in unweighted grids.";
      } else if (algorithmKey === "dfs") {
        algoContext = " DFS dives as deep as possible before backtracking — fast but does not guarantee shortest path.";
      } else if (algorithmKey === "bidirectional") {
        algoContext = " Bidirectional search runs two simultaneous explorations from start and target.";
      }
      if (e.reason === "min_distance") {
        return "Selected node " + coords + " because it has the lowest distance from start (g=" + e.values.g + ")." + algoContext;
      } else if (e.reason === "min_total_distance") {
        return "Selected node " + coords + " because it has the lowest total cost (f=" + e.values.f + " = g:" + e.values.g + " + h:" + e.values.h + ")." + algoContext;
      } else if (e.reason === "fifo_queue") {
        return "Selected node " + coords + " from the front of the queue (BFS explores level-by-level)." + algoContext;
      } else if (e.reason === "lifo_stack") {
        return "Selected node " + coords + " from the top of the stack (DFS explores depth-first)." + algoContext;
      }
      return "Selected node " + coords + "." + algoContext;
    },

    evaluating_neighbors: function (e) {
      var coords = idToCoords(e.current);
      return "Checking " + e.neighborCount + " neighbors of " + coords + ".";
    },

    relax_neighbor: function (e) {
      var fromCoords = idToCoords(e.from);
      var toCoords = idToCoords(e.to);
      var costBreakdown = "base=" + e.components.base;
      if (e.components.turnPenalty > 0) {
        costBreakdown += " + turn=" + e.components.turnPenalty;
      }
      if (e.components.weight > 0) {
        costBreakdown += " + weight=" + e.components.weight;
      }
      var relaxContext = "";
      if (algorithmKey === "astar") {
        relaxContext = " A* also updates f = g + h, so nodes closer to the target get higher priority.";
      } else if (algorithmKey === "dijkstra") {
        relaxContext = " Dijkstra updates only g (actual cost) — no heuristic involved.";
      }
      return "Found a cheaper route to " + toCoords + " through " + fromCoords + "! New cost: " + e.new.g + " (" + costBreakdown + "). Was: " + e.old.g + "." + relaxContext;
    },

    skip_neighbor: function (e) {
      var toCoords = idToCoords(e.to);
      if (e.reason === "wall") {
        return "Skipped " + toCoords + " because it's a wall.";
      } else if (e.reason === "visited") {
        return "Skipped " + toCoords + " because it's already visited.";
      } else if (e.reason === "no_improvement") {
        return "Skipped " + toCoords + " because the new cost is not better.";
      }
      return "Skipped " + toCoords + ".";
    },

    found_target: function (e) {
      var coords = idToCoords(e.target);
      var visitedCount = e.metrics && e.metrics.visitedCount !== undefined && e.metrics.visitedCount !== null ?
        e.metrics.visitedCount : "—";
      var pathCost = e.metrics && e.metrics.pathCost !== undefined && e.metrics.pathCost !== null ?
        e.metrics.pathCost : "—";
      return "Target " + coords + " reached! Visited " + visitedCount + " nodes. Total path cost: " + pathCost + ".";
    },

    no_path: function (e) {
      return "No path found. The frontier was exhausted without reaching the target.";
    },

    found_midpoint: function (e) {
      var coords = idToCoords(e.midpoint);
      return "Both searches met at " + coords + "! Combining paths.";
    }
  };

  var handler = templates[event.t];
  return handler ? handler(event) : "Step " + event.step;
}

function idToCoords(id) {
  var parts = id.split("-");
  return "(" + parts[0] + "," + parts[1] + ")";
}

module.exports = { generateExplanation: generateExplanation };

},{}],20:[function(require,module,exports){
/**
 * Calculate grid metrics for Feynman explanations
 *
 * @param {Object} board - Board instance
 * @returns {Object} metrics
 */
function calculateGridMetrics(board) {
  var nodes = board && board.nodes ? board.nodes : {};
  var nodeIds = Object.keys(nodes);
  var gridSize = nodeIds.length;

  var wallCount = 0;
  var weightCount = 0;
  var totalWeightValue = 0;

  for (var i = 0; i < nodeIds.length; i++) {
    var node = nodes[nodeIds[i]];
    if (!node) continue;
    if (node.status === "wall") {
      wallCount++;
    }
    if (node.weight > 0) {
      weightCount++;
      totalWeightValue += node.weight;
    }
  }

  var startCoords = parseCoords(board && board.start);
  var targetCoords = parseCoords(board && board.target);
  var directDistance = Math.abs(startCoords[0] - targetCoords[0]) +
    Math.abs(startCoords[1] - targetCoords[1]);

  var pathLength = computePathLengthFromBoard(board);
  var detourSteps = pathLength > 0 ? Math.max(0, pathLength - directDistance) : 0;
  var efficiency = pathLength > 0 && directDistance > 0 ? directDistance / pathLength : 1;

  var visitedCount = 0;
  if (board) {
    if (typeof board.lastVisitedCount === "number" && board.lastVisitedCount > 0) {
      visitedCount = board.lastVisitedCount;
    } else if (board.nodesToAnimate && board.nodesToAnimate.length) {
      visitedCount = board.nodesToAnimate.length;
    }
  }

  var visitedPercent = gridSize > 0 ? Math.round((visitedCount / gridSize) * 100) : 0;
  var wallDensity = gridSize > 0 ? wallCount / gridSize : 0;
  var wallDensityLevel = wallDensity < 0.1 ? "low" :
    wallDensity < 0.25 ? "medium" : "high";

  return {
    gridSize: gridSize,
    wallCount: wallCount,
    weightCount: weightCount,
    totalWeightValue: totalWeightValue,
    directDistance: directDistance,
    pathLength: pathLength,
    efficiency: efficiency,
    detourSteps: detourSteps,
    visitedCount: visitedCount,
    visitedPercent: visitedPercent,
    wallDensityLevel: wallDensityLevel
  };
}

function parseCoords(id) {
  if (!id || typeof id !== "string") return [0, 0];
  var parts = id.split("-");
  var row = parseInt(parts[0], 10);
  var col = parseInt(parts[1], 10);
  return [isNaN(row) ? 0 : row, isNaN(col) ? 0 : col];
}

function computePathLengthFromBoard(board) {
  if (!board) return 0;

  if (board.shortestPathNodesToAnimate && board.shortestPathNodesToAnimate.length) {
    var pathLength = board.shortestPathNodesToAnimate.length;
    var includesStart = false;
    var includesTarget = false;

    for (var i = 0; i < board.shortestPathNodesToAnimate.length; i++) {
      var node = board.shortestPathNodesToAnimate[i];
      if (!node) continue;
      if (node.id === board.start) includesStart = true;
      if (node.id === board.target) includesTarget = true;
    }

    if (!includesStart) pathLength++;
    if (!includesTarget) pathLength++;

    return pathLength;
  }

  if (typeof board.computePathCost === "function") {
    var metrics = board.computePathCost();
    if (metrics && typeof metrics.pathLength === "number") {
      return metrics.pathLength;
    }
  }

  return 0;
}

module.exports = { calculateGridMetrics: calculateGridMetrics };

},{}],21:[function(require,module,exports){
/**
 * History Storage Module
 * Manages run history in localStorage with 5-run limit
 * 
 * @module utils/historyStorage
 */

var STORAGE_KEY = "pfv:runs:v1";
var MAX_RUNS = 5;

function saveRun(run) {
    var runs = loadRuns();

    runs.unshift(run);

    if (runs.length > MAX_RUNS) {
        runs.length = MAX_RUNS;
    }

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
        console.log("[History] Run saved:", run.id);
        console.log("[History] Total runs:", runs.length);
        return true;
    } catch (e) {
        console.error("[History] Failed to save:", e);
        return false;
    }
}

function loadRuns() {
    try {
        var stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error("[History] Failed to load:", e);
        return [];
    }
}

function deleteRun(runId) {
    var runs = loadRuns();
    var filtered = [];

    for (var i = 0; i < runs.length; i++) {
        if (runs[i].id !== runId) {
            filtered.push(runs[i]);
        }
    }

    if (filtered.length === runs.length) {
        return false;
    }

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        console.log("[History] Run deleted:", runId);
        return true;
    } catch (e) {
        console.error("[History] Failed to delete:", e);
        return false;
    }
}

function clearHistory() {
    localStorage.removeItem(STORAGE_KEY);
    console.log("[History] All runs cleared");
}

function getRun(runId) {
    var runs = loadRuns();
    for (var i = 0; i < runs.length; i++) {
        if (runs[i].id === runId) {
            return runs[i];
        }
    }
    return null;
}

module.exports = {
    saveRun: saveRun,
    loadRuns: loadRuns,
    deleteRun: deleteRun,
    clearHistory: clearHistory,
    getRun: getRun,
    STORAGE_KEY: STORAGE_KEY,
    MAX_RUNS: MAX_RUNS
};

},{}],22:[function(require,module,exports){
var historyStorage = require("./historyStorage");

var pendingRun = null;
var pendingRenderScheduled = false;
var pendingRenderTimer = null;
var pendingClearTimer = null;
var lastPendingRenderAt = 0;
var PENDING_RENDER_THROTTLE_MS = 100;
var FAILED_CARD_DURATION_MS = 1200;

function setHistoryLocked(board, locked) {
  var container = document.getElementById("historyList");
  if (!container) return;
  var shouldLock = typeof locked === "boolean" ? locked : !(board && board.buttonsOn);
  container.classList.toggle("history-locked", shouldLock);
  var buttons = container.querySelectorAll("button");
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].disabled = shouldLock;
    buttons[i].classList.toggle("control-disabled", shouldLock);
  }
}

function formatTimestamp(ts) {
  var date = new Date(ts);
  var now = new Date();
  var diffMs = now - date;
  var diffMins = Math.floor(diffMs / 60000);
  var diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return diffMins + " min ago";
  if (diffHours < 24) return diffHours + " hour" + (diffHours > 1 ? "s" : "") + " ago";

  var options = { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" };
  return date.toLocaleDateString("en-US", options);
}

function formatAlgorithmName(algo) {
  var names = {
    dijkstra: "Dijkstra",
    astar: "A*",
    greedy: "Greedy",
    CLA: "Swarm",
    swarm: "Swarm",
    "convergent swarm": "Conv. Swarm",
    bidirectional: "Bidirectional",
    bfs: "BFS",
    dfs: "DFS"
  };
  return names[algo] || algo;
}

function formatPendingAlgorithmName(pending) {
  if (!pending) return "Algorithm";
  if (pending.label) return pending.label;
  if (pending.algorithm === "CLA") {
    if (pending.heuristic === "extraPoweredManhattanDistance") return "Convergent Swarm";
    return "Swarm";
  }
  return formatAlgorithmName(pending.algorithm || "unknown");
}

function formatPendingProgress(prefix, current, total) {
  var safeCurrent = typeof current === "number" ? Math.max(0, current) : 0;
  var safeTotal = typeof total === "number" ? Math.max(0, total) : 0;
  if (safeTotal > 0) {
    if (safeCurrent > safeTotal) safeCurrent = safeTotal;
    return prefix + " " + safeCurrent + "/" + safeTotal;
  }
  return prefix + "...";
}

function getPendingStatusText(pending) {
  if (!pending) return "Running...";
  if (pending.statusText) return pending.statusText;
  if (pending.phase === "path") {
    return formatPendingProgress("Path", pending.current, pending.total);
  }
  if (pending.phase === "finalizing") {
    return "Finalizing run...";
  }
  if (pending.phase === "failed") {
    return "Failed";
  }
  return formatPendingProgress("Exploring", pending.current, pending.total);
}

function createPendingHistoryItem(pending) {
  var item = document.createElement("div");
  item.className = "history-item history-item-pending";

  var header = document.createElement("div");
  header.className = "history-item-header";

  var name = document.createElement("span");
  name.className = "history-item-name";
  var modeSuffix = pending.mode === "replay" ? " (Replay)" : "";
  name.textContent = formatPendingAlgorithmName(pending) + modeSuffix;

  var badge = document.createElement("span");
  badge.className = "history-pending-badge";
  if (pending.phase === "failed") {
    badge.classList.add("history-pending-badge-failed");
    badge.textContent = "Failed";
  } else {
    badge.textContent = "Running";
  }

  var summary = document.createElement("div");
  summary.className = "history-item-summary history-pending-progress";
  summary.textContent = getPendingStatusText(pending);

  header.appendChild(name);
  header.appendChild(badge);
  item.appendChild(header);
  item.appendChild(summary);

  return item;
}

function scheduleHistoryRender(board, immediate) {
  if (immediate) {
    if (pendingRenderTimer) {
      clearTimeout(pendingRenderTimer);
      pendingRenderTimer = null;
    }
    pendingRenderScheduled = false;
    lastPendingRenderAt = Date.now();
    renderHistoryList(board);
    return;
  }

  if (pendingRenderScheduled) return;

  var now = Date.now();
  var elapsed = now - lastPendingRenderAt;
  if (elapsed >= PENDING_RENDER_THROTTLE_MS) {
    lastPendingRenderAt = now;
    renderHistoryList(board);
    return;
  }

  pendingRenderScheduled = true;
  pendingRenderTimer = setTimeout(function () {
    pendingRenderScheduled = false;
    pendingRenderTimer = null;
    lastPendingRenderAt = Date.now();
    renderHistoryList(board);
  }, PENDING_RENDER_THROTTLE_MS - elapsed);
}

function normalizeRunContext(context) {
  var normalized = {
    mode: "visualize",
    sourceRunId: null
  };
  if (!context) return normalized;
  if (context.mode === "replay") normalized.mode = "replay";
  if (context.sourceRunId) normalized.sourceRunId = context.sourceRunId;

  var keys = Object.keys(context);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (key === "mode" || key === "sourceRunId") continue;
    normalized[key] = context[key];
  }

  return normalized;
}

function setRunContext(board, context) {
  if (!board) return null;
  board.runContext = normalizeRunContext(context);
  return board.runContext;
}

function getRunContext(board) {
  if (!board || !board.runContext) return normalizeRunContext();
  return normalizeRunContext(board.runContext);
}

function clearRunContext(board) {
  if (!board) return;
  board.runContext = null;
}

function createRunToken() {
  return "pending-" + Date.now() + "-" + Math.floor(Math.random() * 1000000);
}

function setPendingRun(board, meta) {
  if (pendingClearTimer) {
    clearTimeout(pendingClearTimer);
    pendingClearTimer = null;
  }

  var data = meta || {};
  pendingRun = {
    token: createRunToken(),
    mode: data.mode === "replay" ? "replay" : "visualize",
    sourceRunId: data.sourceRunId || null,
    algorithm: data.algorithm || null,
    heuristic: data.heuristic || null,
    speed: data.speed || null,
    phase: data.phase || "exploring",
    current: typeof data.current === "number" ? data.current : 0,
    total: typeof data.total === "number" ? data.total : 0,
    startedAt: data.startedAt || Date.now(),
    statusText: data.statusText || "",
    persistedRunId: data.persistedRunId || null,
    label: data.label || null
  };

  scheduleHistoryRender(board, true);
  return pendingRun.token;
}

function updatePendingRun(board, token, patch) {
  if (!pendingRun) return false;
  if (token && pendingRun.token !== token) return false;
  if (!patch) return true;

  var keys = Object.keys(patch);
  for (var i = 0; i < keys.length; i++) {
    pendingRun[keys[i]] = patch[keys[i]];
  }

  scheduleHistoryRender(board, false);
  return true;
}

function clearPendingRun(board, token) {
  if (!pendingRun) return false;
  if (token && pendingRun.token !== token) return false;

  if (pendingClearTimer) {
    clearTimeout(pendingClearTimer);
    pendingClearTimer = null;
  }

  pendingRun = null;
  clearRunContext(board);
  scheduleHistoryRender(board, true);
  return true;
}

function resolvePendingRun(board, token, payload) {
  if (!pendingRun) return false;
  if (token && pendingRun.token !== token) return false;

  var data = payload || {};
  var status = data.status || "success";

  if (status === "success") {
    if (data.persistedRunId) pendingRun.persistedRunId = data.persistedRunId;
    pendingRun = null;
    clearRunContext(board);
    scheduleHistoryRender(board, true);
    return true;
  }

  pendingRun.phase = "failed";
  pendingRun.statusText = data.statusText || "Failed";
  scheduleHistoryRender(board, true);
  clearRunContext(board);

  var tokenToClear = pendingRun.token;
  var clearDelayMs = typeof data.clearDelayMs === "number" ? data.clearDelayMs : FAILED_CARD_DURATION_MS;
  if (pendingClearTimer) clearTimeout(pendingClearTimer);
  pendingClearTimer = setTimeout(function () {
    clearPendingRun(board, tokenToClear);
  }, clearDelayMs);

  return true;
}

function renderHistoryList(board) {
  var container = document.getElementById("historyList");
  if (!container) {
    console.warn("[History UI] historyList element not found");
    return;
  }

  var runs = historyStorage.loadRuns();
  var activePending = pendingRun;
  var filteredRuns = [];
  for (var i = 0; i < runs.length; i++) {
    if (activePending && activePending.persistedRunId && runs[i].id === activePending.persistedRunId) {
      continue;
    }
    filteredRuns.push(runs[i]);
  }

  container.innerHTML = "";

  if (activePending) {
    container.appendChild(createPendingHistoryItem(activePending));
  }

  if (filteredRuns.length === 0 && !activePending) {
    var emptyState = document.createElement("div");
    emptyState.className = "history-empty";
    emptyState.textContent = "No saved runs yet. Click 'Visualize!' to create one.";
    container.appendChild(emptyState);
    setHistoryLocked(board);
    return;
  }

  for (var j = 0; j < filteredRuns.length; j++) {
    var run = filteredRuns[j];
    container.appendChild(createHistoryItem(run, board));
  }

  if (filteredRuns.length > 0) {
    var clearAll = document.createElement("div");
    clearAll.className = "history-clear-all";
    clearAll.innerHTML = '<button id="clearAllHistoryBtn" type="button">Clear All History</button>';
    container.appendChild(clearAll);

    var clearBtn = document.getElementById("clearAllHistoryBtn");
    if (clearBtn) {
      clearBtn.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (!board || !board.buttonsOn) return;
        if (confirm("Delete all run history? This cannot be undone.")) {
          historyStorage.clearHistory();
          renderHistoryList(board);
        }
      };
    }
  }

  setHistoryLocked(board);
}

function createHistoryItem(run, board) {
  var item = document.createElement("div");
  item.className = "history-item";

  var algoName = formatAlgorithmName(run.settings ? run.settings.algorithm : "unknown");
  var result = run.result || {};

  var summary;
  if (result.found) {
    summary = "Path: " + (result.pathLength || "?") +
      " | Cost: " + (result.pathCost || "?") +
      " | Visited: " + (result.nodesVisited || "?");
  } else {
    summary = "No path found";
  }

  item.innerHTML =
    '<div class="history-item-header">' +
    '<span class="history-item-name">' + algoName + '</span>' +
    '<span class="history-item-time">' + formatTimestamp(run.timestamp) + '</span>' +
    '</div>' +
    '<div class="history-item-summary">' + summary + '</div>' +
    '<div class="history-item-actions">' +
    '<button class="load-btn" data-run-id="' + run.id + '" type="button">Load</button>' +
    '<button class="replay-btn" data-run-id="' + run.id + '" type="button">Replay</button>' +
    '<button class="delete-btn" data-run-id="' + run.id + '" type="button">Delete</button>' +
    '</div>';

  var loadBtn = item.querySelector(".load-btn");
  var replayBtn = item.querySelector(".replay-btn");
  var deleteBtn = item.querySelector(".delete-btn");

  loadBtn.onclick = function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (!board || !board.buttonsOn) return;
    loadRun(run, board, false);
  };

  replayBtn.onclick = function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (!board || !board.buttonsOn) return;
    loadRun(run, board, true);
  };

  deleteBtn.onclick = function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (!board || !board.buttonsOn) return;
    historyStorage.deleteRun(run.id);
    renderHistoryList(board);
  };

  return item;
}

function loadRun(run, board, autoReplay) {
  if (!board || !board.buttonsOn) return;
  console.log("[History] Loading run:", run.id, "autoReplay:", autoReplay);

  if (autoReplay) {
    setRunContext(board, { mode: "replay", sourceRunId: run.id });
  } else {
    setRunContext(board, { mode: "visualize", sourceRunId: null });
  }

  board.clearPath("clickedButton");
  board.clearWalls();

  var runStart = run.nodes && run.nodes.start;
  var runTarget = run.nodes && run.nodes.target;

  if (runStart && runStart !== board.start && board.nodes[runStart]) {
    document.getElementById(board.start).className = "unvisited";
    board.nodes[board.start].status = "unvisited";

    board.start = runStart;
    board.nodes[runStart].status = "start";
    document.getElementById(runStart).className = "start";
  }

  if (runTarget && runTarget !== board.target && board.nodes[runTarget]) {
    document.getElementById(board.target).className = "unvisited";
    board.nodes[board.target].status = "unvisited";

    board.target = runTarget;
    board.nodes[runTarget].status = "target";
    document.getElementById(runTarget).className = "target";
  }

  var walls = run.walls || [];
  for (var i = 0; i < walls.length; i++) {
    var wallId = walls[i];
    if (board.nodes[wallId] && wallId !== board.start && wallId !== board.target) {
      board.nodes[wallId].status = "wall";
      board.nodes[wallId].weight = 0;
      document.getElementById(wallId).className = "wall";
    }
  }

  var weights = run.weights || [];
  for (var j = 0; j < weights.length; j++) {
    var w = weights[j];
    if (board.nodes[w.id] && w.id !== board.start && w.id !== board.target && board.nodes[w.id].status !== "wall") {
      board.nodes[w.id].status = "unvisited";
      board.nodes[w.id].weight = w.value;
      document.getElementById(w.id).className = "unvisited weight";
    }
  }

  if (run.settings) {
    board.currentAlgorithm = run.settings.algorithm;
    board.currentHeuristic = run.settings.heuristic;
    board.speed = run.settings.speed || "fast";
    board.currentWeightValue = run.settings.weightValue || 15;

    var speedText = board.speed.charAt(0).toUpperCase() + board.speed.slice(1);
    var speedElement = document.getElementById("adjustSpeed");
    if (speedElement) {
      speedElement.innerHTML = "Speed: " + speedText + '<span class="caret"></span>';
    }

    var slider = document.getElementById("weightSlider");
    var valueDisplay = document.getElementById("weightValue");
    if (slider) slider.value = board.currentWeightValue;
    if (valueDisplay) valueDisplay.textContent = board.currentWeightValue;

    board.changeStartNodeImages();
    if (typeof board.syncAlgorithmSelectionUI === "function") {
      board.syncAlgorithmSelectionUI();
    }
  }

  renderHistoryList(board);

  console.log("[History] Run loaded successfully");

  if (autoReplay && board.currentAlgorithm) {
    setTimeout(function () {
      var startBtn = document.getElementById("actualStartButton");
      if (startBtn) {
        startBtn.click();
      } else {
        clearRunContext(board);
      }
    }, 300);
  }
}

function initHistoryUI(board) {
  renderHistoryList(board);
  console.log("[History UI] Initialized");
}

module.exports = {
  initHistoryUI: initHistoryUI,
  renderHistoryList: renderHistoryList,
  renderHistoryDropdown: renderHistoryList,
  loadRun: loadRun,
  setHistoryLocked: setHistoryLocked,
  setRunContext: setRunContext,
  getRunContext: getRunContext,
  clearRunContext: clearRunContext,
  setPendingRun: setPendingRun,
  updatePendingRun: updatePendingRun,
  resolvePendingRun: resolvePendingRun,
  clearPendingRun: clearPendingRun
};

},{"./historyStorage":21}],23:[function(require,module,exports){
const recursiveDivisionMaze = require("../mazeAlgorithms/recursiveDivisionMaze");
const otherMaze = require("../mazeAlgorithms/otherMaze");
const otherOtherMaze = require("../mazeAlgorithms/otherOtherMaze");
const stairDemonstration = require("../mazeAlgorithms/stairDemonstration");
const mazeGenerationAnimations = require("../animations/mazeGenerationAnimations");

const MAZE_OPTIONS = [
  {
    id: "recursive",
    name: "Recursive Division",
    description: "Classic divide-and-conquer maze with elegant corridors and rooms.",
    icon: "╬"
  },
  {
    id: "vertical",
    name: "Recursive Division (Vertical Skew)",
    description: "Favors vertical passages. Great for testing horizontal pathfinding.",
    icon: "║"
  },
  {
    id: "horizontal",
    name: "Recursive Division (Horizontal Skew)",
    description: "Favors horizontal passages. Tests vertical movement strategies.",
    icon: "═"
  },
  {
    id: "randomWall",
    name: "Basic Random Maze",
    description: "Scattered random walls. Simple and unpredictable.",
    icon: "▒"
  },
  {
    id: "randomWeight",
    name: "Basic Weight Maze",
    description: "Weighted nodes only. Great for cost-based algorithms.",
    icon: "⚖"
  },
  {
    id: "stair",
    name: "Simple Stair Pattern",
    description: "Diagonal staircase pattern that forces frequent turns.",
    icon: "╱"
  },
  {
    id: "free",
    name: "Free (Blank Grid)",
    description: "Start empty and draw your own walls and weights.",
    icon: "✨"
  }
];

function getOptionById(mazeId) {
  for (let i = 0; i < MAZE_OPTIONS.length; i++) {
    if (MAZE_OPTIONS[i].id === mazeId) {
      return MAZE_OPTIONS[i];
    }
  }
  return null;
}

function setButtonsState(board, shouldEnable) {
  if (shouldEnable && !board.buttonsOn) {
    board.toggleButtons();
  } else if (!shouldEnable && board.buttonsOn) {
    board.toggleButtons();
  }
}

function updateSidebarLabel(mazeId) {
  const label = document.getElementById("currentMazeLabel");
  if (!label) return;
  const option = getOptionById(mazeId);
  label.textContent = option ? option.name : "None";
}

function runAnimatedMaze(board, generator, done) {
  setButtonsState(board, false);
  try {
    generator();
  } catch (error) {
    setButtonsState(board, true);
    if (typeof done === "function") done();
    throw error;
  }

  mazeGenerationAnimations(board, function () {
    setButtonsState(board, true);
    if (typeof done === "function") done();
  });
}

function applyMaze(board, mazeId, done) {
  const safeDone = typeof done === "function" ? done : function () { };
  const option = getOptionById(mazeId) || getOptionById("free");
  const selectedId = option.id;

  board.clearWalls();
  updateSidebarLabel(selectedId);

  if (selectedId === "free") {
    setButtonsState(board, true);
    safeDone();
    return;
  }

  if (selectedId === "randomWall") {
    board.createMazeOne("wall");
    setButtonsState(board, true);
    safeDone();
    return;
  }

  if (selectedId === "randomWeight") {
    board.createMazeOne("weight");
    setButtonsState(board, true);
    safeDone();
    return;
  }

  if (selectedId === "recursive") {
    runAnimatedMaze(board, function () {
      recursiveDivisionMaze(board, 2, board.height - 3, 2, board.width - 3, "horizontal", false, "wall");
    }, safeDone);
    return;
  }

  if (selectedId === "vertical") {
    runAnimatedMaze(board, function () {
      otherMaze(board, 2, board.height - 3, 2, board.width - 3, "vertical", false);
    }, safeDone);
    return;
  }

  if (selectedId === "horizontal") {
    runAnimatedMaze(board, function () {
      otherOtherMaze(board, 2, board.height - 3, 2, board.width - 3, "horizontal", false);
    }, safeDone);
    return;
  }

  if (selectedId === "stair") {
    runAnimatedMaze(board, function () {
      stairDemonstration(board);
    }, safeDone);
    return;
  }

  setButtonsState(board, true);
  safeDone();
}

function showOnboardingModal(board, onComplete) {
  const overlay = document.getElementById("mazeOnboardingOverlay");
  const complete = typeof onComplete === "function" ? onComplete : function () { };

  if (!overlay) {
    applyMaze(board, "free", function () {
      complete(board);
    });
    return;
  }

  const grid = overlay.querySelector(".maze-card-grid");
  if (!grid) {
    applyMaze(board, "free", function () {
      complete(board);
    });
    return;
  }

  grid.innerHTML = "";

  MAZE_OPTIONS.forEach(function (option) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "maze-card" + (option.id === "free" ? " maze-card-free" : "");
    card.setAttribute("data-maze-id", option.id);
    card.innerHTML =
      '<div class="maze-card-icon">' + option.icon + "</div>" +
      '<div class="maze-card-name">' + option.name + "</div>" +
      '<div class="maze-card-desc">' + option.description + "</div>";
    card.onclick = function () {
      overlay.classList.add("hidden");
      applyMaze(board, option.id, function () {
        complete(board);
      });
    };
    grid.appendChild(card);
  });

  overlay.classList.remove("hidden");
}

function initSidebarMazeDropup(board) {
  const menu = document.getElementById("mazeDropupMenu");
  if (!menu) return;
  const mazeBtn = document.getElementById("sidebarMazeBtn");
  if (mazeBtn) mazeBtn.disabled = !board.buttonsOn;

  menu.innerHTML = "";
  MAZE_OPTIONS.forEach(function (option) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = "#";
    a.textContent = option.name;
    a.onclick = function (event) {
      event.preventDefault();
      if (!board.buttonsOn) return;
      applyMaze(board, option.id);
      const parentDropup = document.getElementById("sidebarMazeBtn");
      if (parentDropup && parentDropup.parentNode) {
        parentDropup.parentNode.classList.remove("open");
      }
    };
    li.appendChild(a);
    menu.appendChild(li);
  });
}

module.exports = {
  MAZE_OPTIONS: MAZE_OPTIONS,
  setButtonsState: setButtonsState,
  showOnboardingModal: showOnboardingModal,
  applyMaze: applyMaze,
  initSidebarMazeDropup: initSidebarMazeDropup,
  updateSidebarLabel: updateSidebarLabel
};

},{"../animations/mazeGenerationAnimations":4,"../mazeAlgorithms/otherMaze":7,"../mazeAlgorithms/otherOtherMaze":8,"../mazeAlgorithms/recursiveDivisionMaze":9,"../mazeAlgorithms/stairDemonstration":10}],24:[function(require,module,exports){
/**
 * Run Serializer Module
 * Converts board state to a portable JSON-serializable object
 * 
 * @module utils/runSerializer
 */

function serializeRun(board, success, visitedCount) {
    var timestamp = Date.now();
    var id = "run-" + timestamp;

    return {
        id: id,
        timestamp: timestamp,
        version: "1.0",

        grid: {
            height: board.height,
            width: board.width
        },

        nodes: {
            start: board.start,
            target: board.target
        },

        walls: extractWalls(board),
        weights: extractWeights(board),

        settings: {
            algorithm: board.currentAlgorithm,
            heuristic: board.currentHeuristic,
            speed: board.speed,
            weightValue: board.currentWeightValue
        },

        result: {
            found: success === "success!" || success === "success" || success === true,
            pathLength: success ? computePathLength(board) : null,
            pathCost: success ? computePathCost(board) : null,
            nodesVisited: visitedCount
        }
    };
}

function extractWalls(board) {
    var walls = [];
    var ids = Object.keys(board.nodes);
    for (var i = 0; i < ids.length; i++) {
        var id = ids[i];
        if (board.nodes[id].status === "wall") {
            walls.push(id);
        }
    }
    return walls;
}

function extractWeights(board) {
    var weights = [];
    var ids = Object.keys(board.nodes);
    for (var i = 0; i < ids.length; i++) {
        var id = ids[i];
        var node = board.nodes[id];
        if (node.weight > 0 && node.status !== "wall") {
            weights.push({ id: id, value: node.weight });
        }
    }
    return weights;
}

function computePathLength(board) {
    if (board.currentAlgorithm === "bidirectional" &&
        board.shortestPathNodesToAnimate &&
        board.shortestPathNodesToAnimate.length) {
        var length = 0;
        var includesStart = false;
        var includesTarget = false;

        for (var i = 0; i < board.shortestPathNodesToAnimate.length; i++) {
            var node = board.shortestPathNodesToAnimate[i];
            if (node.id === board.start) includesStart = true;
            if (node.id === board.target) includesTarget = true;
            length++;
        }

        if (!includesStart) length++;
        if (!includesTarget) length++;

        return length;
    }

    var length = 0;
    var currentId = board.target;

    while (currentId && currentId !== board.start) {
        length++;
        currentId = board.nodes[currentId].previousNode;
    }

    return currentId === board.start ? length + 1 : 0;
}

function computePathCost(board) {
    if (board.currentAlgorithm === "bidirectional" &&
        board.shortestPathNodesToAnimate &&
        board.shortestPathNodesToAnimate.length) {
        var cost = 0;
        var includesStart = false;
        var includesTarget = false;

        for (var i = 0; i < board.shortestPathNodesToAnimate.length; i++) {
            var node = board.shortestPathNodesToAnimate[i];
            if (node.id === board.start) includesStart = true;
            if (node.id === board.target) includesTarget = true;
            cost += node.weight > 0 ? node.weight : 1;
        }

        if (!includesStart) cost += 1;
        if (!includesTarget) cost += 1;

        return cost;
    }

    var cost = 0;
    var currentId = board.target;

    while (currentId && currentId !== board.start) {
        var node = board.nodes[currentId];
        cost += node.weight > 0 ? node.weight : 1;
        currentId = node.previousNode;
    }

    if (currentId === board.start) {
        cost += 1;
    }

    return cost;
}

module.exports = serializeRun;

},{}],25:[function(require,module,exports){
const gridMetrics = require("./gridMetrics");

/**
 * Analyze weight impact on path decisions
 *
 * Input:
 *   - board: Board instance with completed algorithm
 *
 * Output:
 *   - { weightNodesInPath, totalWeightCost, baseCost, turnPenaltyCost, metrics, explanation }
 */
function analyzeWeightImpact(board) {
  var metrics = gridMetrics.calculateGridMetrics(board);
  var result = {
    weightNodesInPath: [],
    totalWeightCost: 0,
    baseCost: 0,
    turnPenaltyCost: 0,
    metrics: metrics,
    explanation: ""
  };

  var path = reconstructPath(board);
  if (!path.length) {
    result.explanation = "No path found, so there is no cost to explain.";
    return result;
  }

  for (var i = 0; i < path.length; i++) {
    var nodeId = path[i];
    var node = board.nodes[nodeId];
    if (node && node.weight > 0) {
      result.weightNodesInPath.push(nodeId);
      result.totalWeightCost += node.weight;
    }
    result.baseCost += 1;
  }

  result.explanation = generateDetailedExplanation(
    result.weightNodesInPath,
    result.totalWeightCost,
    result.baseCost,
    metrics
  );

  return result;
}

function generateDetailedExplanation(weightNodes, weightCost, baseCost, metrics) {
  var lines = [];
  var pathLength = metrics.pathLength || baseCost;
  var directDistance = metrics.directDistance || 0;
  var detourSteps = metrics.detourSteps || 0;

  if (directDistance > 0 && pathLength > 0) {
    if (directDistance === pathLength) {
      lines.push("The path takes " + pathLength + " steps, which is the straight-line distance. " +
        "This is the shortest possible route.");
    } else {
      lines.push("The path takes " + pathLength + " steps; a straight line would take " +
        directDistance + " steps.");
    }
  } else {
    lines.push("The path takes " + pathLength + " steps.");
  }

  if (detourSteps > 0) {
    if (metrics.wallCount > 0) {
      lines.push("The extra " + detourSteps + " steps are detours around " +
        metrics.wallCount + " wall(s) blocking the direct path.");
    } else if (weightNodes.length > 0) {
      lines.push("The path is longer to balance distance and weight cost.");
    } else {
      lines.push("The path is longer than the straight-line distance due to the search order.");
    }
  } else {
    lines.push("There are no detours beyond the straight-line distance.");
  }

  if (weightNodes.length === 0 && metrics.weightCount > 0) {
    lines.push("The path avoids all " + metrics.weightCount + " weight node(s) on the grid.");
  } else if (weightNodes.length > 0) {
    lines.push("The path crosses " + weightNodes.length + " weight node(s), adding " +
      weightCost + " extra cost.");
  } else {
    lines.push("There are no weight nodes, so cost is just steps.");
  }

  if (metrics.wallCount > 0 && detourSteps > 0) {
    lines.push("If there were no walls, the path would be " + detourSteps +
      " steps shorter.");
  } else if (weightNodes.length === 0 && metrics.weightCount > 0) {
    var avgWeight = metrics.weightCount > 0 ? Math.round(metrics.totalWeightValue / metrics.weightCount) : 0;
    lines.push("If the path went through weights, it would cost about " +
      (metrics.weightCount * avgWeight) + " more even if shorter.");
  } else if (weightNodes.length > 0) {
    lines.push("If the path avoided those weights, it would add about " +
      estimateDetourCost(weightNodes) + " extra steps.");
  } else {
    lines.push("If the start and target were closer, the path would be shorter.");
  }

  var effPercent = Math.round((metrics.efficiency || 1) * 100);
  if (effPercent >= 95) {
    lines.push("Path efficiency: " + effPercent + "% — nearly optimal.");
  } else if (effPercent >= 70) {
    lines.push("Path efficiency: " + effPercent + "% — good route given obstacles.");
  } else {
    lines.push("Path efficiency: " + effPercent + "% — significant detours were required.");
  }

  return lines.join("\n");
}

function estimateDetourCost(weightNodes) {
  return weightNodes.length * 3;
}

function reconstructPath(board) {
  if (board.shortestPathNodesToAnimate && board.shortestPathNodesToAnimate.length) {
    var pathFromNodes = board.shortestPathNodesToAnimate.map(function (node) {
      return node.id;
    });
    if (board.start && pathFromNodes[0] !== board.start) {
      pathFromNodes.unshift(board.start);
    }
    if (board.target && pathFromNodes[pathFromNodes.length - 1] !== board.target) {
      pathFromNodes.push(board.target);
    }
    return pathFromNodes;
  }

  var path = [];
  var currentId = board.target;
  while (currentId && currentId !== board.start) {
    path.unshift(currentId);
    currentId = board.nodes[currentId].previousNode;
  }
  if (currentId === board.start) {
    path.unshift(board.start);
  }
  return path;
}

module.exports = { analyzeWeightImpact: analyzeWeightImpact };

},{"./gridMetrics":20}]},{},[5]);
