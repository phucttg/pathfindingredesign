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
const historyStorage = require("../utils/historyStorage");
const historyUI = require("../utils/historyUI");
const serializeRun = require("../utils/runSerializer");

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

  function onExploreFrame(index) {
    if (progressEl) {
      var progressIndex = nodes.length ? Math.min(index + 1, nodes.length) : 0;
      progressEl.textContent = "Exploring " + progressIndex + "/" + nodes.length;
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
    if (board.activateInsightTab) board.activateInsightTab();

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
      var runSummary = serializeRun(board, success, visitedCount);
      historyStorage.saveRun(runSummary);
      if (historyUI.renderHistoryList) historyUI.renderHistoryList(board);
      console.log("[Run Complete]", runSummary);
      return;
    }

    console.log("Failure.");
    board.reset();
    if (controls) controls.classList.add("hidden");
    if (progressEl) progressEl.textContent = "";
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

},{"../utils/historyStorage":23,"../utils/historyUI":24,"../utils/runSerializer":25}],3:[function(require,module,exports){
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

},{"../pathfindingAlgorithms/unweightedSearchAlgorithm":16,"../pathfindingAlgorithms/weightedSearchAlgorithm":17}],4:[function(require,module,exports){
function mazeGenerationAnimations(board) {
  let nodes = board.wallsToAnimate.slice(0);
  let speed = board.speed === "fast" ?
    5 : board.speed === "average" ?
      25 : 75;
  function timeout(index) {
    setTimeout(function () {
      if (index === nodes.length) {
        board.wallsToAnimate = [];
        board.toggleButtons();
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
const mazeGenerationAnimations = require("./animations/mazeGenerationAnimations");
const weightedSearchAlgorithm = require("./pathfindingAlgorithms/weightedSearchAlgorithm");
const unweightedSearchAlgorithm = require("./pathfindingAlgorithms/unweightedSearchAlgorithm");
const recursiveDivisionMaze = require("./mazeAlgorithms/recursiveDivisionMaze");
const otherMaze = require("./mazeAlgorithms/otherMaze");
const otherOtherMaze = require("./mazeAlgorithms/otherOtherMaze");
const astar = require("./pathfindingAlgorithms/astar");
const stairDemonstration = require("./mazeAlgorithms/stairDemonstration");
const weightsDemonstration = require("./mazeAlgorithms/weightsDemonstration");
const simpleDemonstration = require("./mazeAlgorithms/simpleDemonstration");
const explanationTemplates = require("./utils/explanationTemplates");
const bidirectional = require("./pathfindingAlgorithms/bidirectional");
const getDistance = require("./getDistance");
const aiExplain = require("./utils/aiExplain");
const historyUI = require("./utils/historyUI");
const weightImpactAnalyzer = require("./utils/weightImpactAnalyzer");
const algorithmDescriptions = require("./utils/algorithmDescriptions");
const algorithmModal = require("./utils/algorithmModal");
const AnimationController = require("./animations/animationController");

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
}

Board.prototype.initialise = function () {
  this.createGrid();
  this.addEventListeners();
  this.initSidebar();
  historyUI.initHistoryUI(this);
  this.toggleTutorialButtons();
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
      var clearPathButton = document.getElementById("startButtonClearPath");
      if (clearPathButton && typeof clearPathButton.onclick === "function") {
        clearPathButton.onclick();
      }
    });
  }

  if (sidebarClearWalls) {
    sidebarClearWalls.addEventListener("click", function () {
      var clearWallsButton = document.getElementById("startButtonClearWalls");
      if (clearWallsButton && typeof clearWallsButton.onclick === "function") {
        clearWallsButton.onclick();
      }
    });
  }

  if (sidebarClearBoard) {
    sidebarClearBoard.addEventListener("click", function () {
      var clearBoardButton = document.getElementById("startButtonClearBoard");
      if (clearBoardButton && typeof clearBoardButton.onclick === "function") {
        clearBoardButton.onclick();
      }
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
    if (progressEl) {
      var progressIndex = Math.min(index + 1, totalPathFrames + 1);
      progressEl.textContent = "Path " + progressIndex + "/" + (totalPathFrames + 1);
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
    board.toggleButtons();
    board.activateInsightTab();
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

    board.displayPathCost(visitedCount);

    if (visitedCount > 0 && pathLength > 0) {
      aiExplain.requestAIExplanation(board, visitedCount, pathLength);
    }

    var impactText = document.getElementById("weightImpactText");
    if (impactText) {
      var impact = weightImpactAnalyzer.analyzeWeightImpact(board);
      impactText.textContent = impact.explanation;
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
  document.getElementById("pathCost").textContent = metrics.cost;
  document.getElementById("pathLength").textContent = metrics.pathLength;
  document.getElementById("visitedCount").textContent = visitedCount;
  document.getElementById("resultsBar").classList.remove("hidden");
};

Board.prototype.hidePathCost = function () {
  document.getElementById("resultsBar").classList.add("hidden");
};

Board.prototype.clearPath = function (clickedButton) {
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
  this.updateRunningStateUI(false);
  var impactText = document.getElementById("weightImpactText");
  if (impactText) impactText.textContent = "";
  if (clickedButton) {
    this.hidePathCost();
    aiExplain.hideAIExplanation();
    this.activateControlsTab();
    let start = this.nodes[this.start];
    let target = this.nodes[this.target];
    start.status = "start";
    document.getElementById(start.id).className = "start";
    target.status = "target";
    document.getElementById(target.id).className = "target";
  }

  document.getElementById("startButtonStart").onclick = () => {
    if (!this.currentAlgorithm) {
      document.getElementById("startButtonStart").innerHTML = '<button id="actualStartButton" class="btn btn-primary navbar-btn" type="button">Pick an Algorithm!</button>'
    } else {
      this.clearPath("clickedButton");
      this.toggleButtons();
      this.activateInsightTab();
      let weightedAlgorithms = ["dijkstra", "CLA", "greedy"];
      let unweightedAlgorithms = ["dfs", "bfs"];
      let success;
      if (this.currentAlgorithm === "bidirectional") {
        success = bidirectional(this.nodes, this.start, this.target, this.nodesToAnimate, this.boardArray, this.currentAlgorithm, this.currentHeuristic, this, this.currentTrace);
        launchAnimations(this, success, "weighted");
        this.algoDone = true;
      } else if (this.currentAlgorithm === "astar") {
        success = weightedSearchAlgorithm(this.nodes, this.start, this.target, this.nodesToAnimate, this.boardArray, this.currentAlgorithm, this.currentHeuristic, this.currentTrace);
        launchAnimations(this, success, "weighted");
        this.algoDone = true;
      } else if (weightedAlgorithms.includes(this.currentAlgorithm)) {
        success = weightedSearchAlgorithm(this.nodes, this.start, this.target, this.nodesToAnimate, this.boardArray, this.currentAlgorithm, this.currentHeuristic, this.currentTrace);
        launchAnimations(this, success, "weighted");
        this.algoDone = true;
      } else if (unweightedAlgorithms.includes(this.currentAlgorithm)) {
        success = unweightedSearchAlgorithm(this.nodes, this.start, this.target, this.nodesToAnimate, this.boardArray, this.currentAlgorithm, this.currentTrace);
        launchAnimations(this, success, "unweighted");
        this.algoDone = true;
      }
    }
  }

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
    document.getElementById("weightLegend").className = "strikethrough";
    for (let i = 0; i < 14; i++) {
      let j = i.toString();
      let backgroundImage = document.styleSheets["1"].rules[j].style.backgroundImage;
      document.styleSheets["1"].rules[j].style.backgroundImage = backgroundImage.replace("triangle", "spaceship");
    }
  } else {
    if (this.currentAlgorithm === "greedy" || this.currentAlgorithm === "CLA") {
      document.getElementById("algorithmDescriptor").innerHTML = `${name} is <i><b>weighted</b></i> and <i><b>does not guarantee</b></i> the shortest path!`;
    }
    document.getElementById("weightLegend").className = "";
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

let counter = 1;
Board.prototype.toggleTutorialButtons = function () {

  document.getElementById("skipButton").onclick = () => {
    document.getElementById("tutorial").style.display = "none";
    this.toggleButtons();
  }

  if (document.getElementById("nextButton")) {
    document.getElementById("nextButton").onclick = () => {
      if (counter < 8) counter++;
      nextPreviousClick();
      this.toggleTutorialButtons();
    }
  }

  document.getElementById("previousButton").onclick = () => {
    if (counter > 1) counter--;
    nextPreviousClick();
    this.toggleTutorialButtons()
  }

  let board = this;
  function nextPreviousClick() {
    if (counter === 1) {
      document.getElementById("tutorial").innerHTML = `<h3>Welcome to Pathfinding Visualizer!</h3><h6>This short tutorial will walk you through all of the features of this application.</h6><p>If you want to dive right in, feel free to press the "Skip Tutorial" button below. Otherwise, press "Next"!</p><div id="tutorialCounter">1/9</div><img id="mainTutorialImage" src="public/styling/c_icon.png"><button id="nextButton" class="btn btn-default navbar-btn" type="button">Next</button><button id="previousButton" class="btn btn-default navbar-btn" type="button">Previous</button><button id="skipButton" class="btn btn-default navbar-btn" type="button">Skip Tutorial</button>`
    } else if (counter === 2) {
      document.getElementById("tutorial").innerHTML = `<h3>What is a pathfinding algorithm?</h3><h6>At its core, a pathfinding algorithm seeks to find the shortest path between two points. This application visualizes various pathfinding algorithms in action, and more!</h6><p>All of the algorithms on this application are adapted for a 2D grid, where 90 degree turns have a "cost" of 1 and movements from a node to another have a "cost" of 1.</p><div id="tutorialCounter">${counter}/9</div><img id="mainTutorialImage" src="public/styling/path.png"><button id="nextButton" class="btn btn-default navbar-btn" type="button">Next</button><button id="previousButton" class="btn btn-default navbar-btn" type="button">Previous</button><button id="skipButton" class="btn btn-default navbar-btn" type="button">Skip Tutorial</button>`
    } else if (counter === 3) {
      document.getElementById("tutorial").innerHTML = `<h3>Picking an algorithm</h3><h6>Choose an algorithm from the "Algorithms" drop-down menu.</h6><p>Note that some algorithms are <i><b>unweighted</b></i>, while others are <i><b>weighted</b></i>. Unweighted algorithms do not take turns or weight nodes into account, whereas weighted ones do. Additionally, not all algorithms guarantee the shortest path. </p><img id="secondTutorialImage" src="public/styling/algorithms.png"><div id="tutorialCounter">${counter}/9</div><button id="nextButton" class="btn btn-default navbar-btn" type="button">Next</button><button id="previousButton" class="btn btn-default navbar-btn" type="button">Previous</button><button id="skipButton" class="btn btn-default navbar-btn" type="button">Skip Tutorial</button>`
      document.getElementById("tutorial").innerHTML = `<h3>Picking an algorithm</h3><h6>Choose an algorithm from the "Algorithms" drop-down menu.</h6><p>Note that some algorithms are <i><b>unweighted</b></i>, while others are <i><b>weighted</b></i>. Unweighted algorithms do not take turns or weight nodes into account, whereas weighted ones do. Additionally, not all algorithms guarantee the shortest path. </p><img id="secondTutorialImage" src="public/styling/algorithms.png"><div id="tutorialCounter">${counter}/8</div><button id="nextButton" class="btn btn-default navbar-btn" type="button">Next</button><button id="previousButton" class="btn btn-default navbar-btn" type="button">Previous</button><button id="skipButton" class="btn btn-default navbar-btn" type="button">Skip Tutorial</button>`
    } else if (counter === 4) {
      document.getElementById("tutorial").innerHTML = `<h3>Meet the algorithms</h3><h6>Not all algorithms are created equal.</h6><ul><li><b>Dijkstra's Algorithm</b> (weighted): the father of pathfinding algorithms; guarantees the shortest path</li><li><b>A* Search</b> (weighted): arguably the best pathfinding algorithm; uses heuristics to guarantee the shortest path much faster than Dijkstra's Algorithm</li><li><b>Greedy Best-first Search</b> (weighted): a faster, more heuristic-heavy version of A*; does not guarantee the shortest path</li><li><b>Swarm Algorithm</b> (weighted): a mixture of Dijkstra's Algorithm and A*; does not guarantee the shortest-path</li><li><b>Convergent Swarm Algorithm</b> (weighted): the faster, more heuristic-heavy version of Swarm; does not guarantee the shortest path</li><li><b>Bidirectional Swarm Algorithm</b> (weighted): Swarm from both sides; does not guarantee the shortest path</li><li><b>Breath-first Search</b> (unweighted): a great algorithm; guarantees the shortest path</li><li><b>Depth-first Search</b> (unweighted): a very bad algorithm for pathfinding; does not guarantee the shortest path</li></ul><div id="tutorialCounter">${counter}/8</div><button id="nextButton" class="btn btn-default navbar-btn" type="button">Next</button><button id="previousButton" class="btn btn-default navbar-btn" type="button">Previous</button><button id="skipButton" class="btn btn-default navbar-btn" type="button">Skip Tutorial</button>`
    } else if (counter === 5) {
      document.getElementById("tutorial").innerHTML = `<h3>Adding walls and weights</h3><h6>Click on the grid to add a wall. Click on the grid while pressing W to add a weight. Generate mazes and patterns from the "Mazes & Patterns" drop-down menu.</h6><p>Walls are impenetrable, meaning that a path cannot cross through them. Weights are not impassable, they just cost more. Each step has a base cost of 1. Turning adds extra cost (90-degree turn +1, 180-degree turn +2). Weights add the slider value (0-50). Set weight to 0 to make a normal node.</p><img id="secondTutorialImage" src="public/styling/walls.gif"><div id="tutorialCounter">${counter}/8</div><button id="nextButton" class="btn btn-default navbar-btn" type="button">Next</button><button id="previousButton" class="btn btn-default navbar-btn" type="button">Previous</button><button id="skipButton" class="btn btn-default navbar-btn" type="button">Skip Tutorial</button>`
    } else if (counter === 6) {
      document.getElementById("tutorial").innerHTML = `<h3>Dragging nodes</h3><h6>Click and drag the start and target nodes to move them.</h6><p>Note that you can drag nodes even after an algorithm has finished running. This will allow you to instantly see different paths.</p><img src="public/styling/dragging.gif"><div id="tutorialCounter">${counter}/8</div><button id="nextButton" class="btn btn-default navbar-btn" type="button">Next</button><button id="previousButton" class="btn btn-default navbar-btn" type="button">Previous</button><button id="skipButton" class="btn btn-default navbar-btn" type="button">Skip Tutorial</button>`
    } else if (counter === 7) {
      document.getElementById("tutorial").innerHTML = `<h3>Visualizing and more</h3><h6>Use the navbar buttons to visualize algorithms and to do other stuff!</h6><p>You can clear the current path, clear walls and weights, clear the entire board, and adjust the visualization speed, all from the navbar. If you want to access this tutorial again, click on "Pathfinding Visualizer" in the top left corner of your screen.</p><img id="secondTutorialImage" src="public/styling/navbar.png"><div id="tutorialCounter">${counter}/8</div><button id="nextButton" class="btn btn-default navbar-btn" type="button">Next</button><button id="previousButton" class="btn btn-default navbar-btn" type="button">Previous</button><button id="skipButton" class="btn btn-default navbar-btn" type="button">Skip Tutorial</button>`
    } else if (counter === 8) {
      document.getElementById("tutorial").innerHTML = `<h3>Enjoy!</h3><h6>I hope you have just as much fun playing around with this visualization tool as I had building it!</h6><p>If you want to see the source code for this application, check out my <a href="https://github.com/clementmihailescu/Pathfinding-Visualizer">github</a>.</p><div id="tutorialCounter">${counter}/8</div><button id="finishButton" class="btn btn-default navbar-btn" type="button">Finish</button><button id="previousButton" class="btn btn-default navbar-btn" type="button">Previous</button><button id="skipButton" class="btn btn-default navbar-btn" type="button">Skip Tutorial</button>`
      document.getElementById("finishButton").onclick = () => {
        document.getElementById("tutorial").style.display = "none";
        board.toggleButtons();
      }
    }
  }

};

Board.prototype.toggleButtons = function () {
  document.getElementById("refreshButton").onclick = () => {
    window.location.reload(true);
  }

  if (!this.buttonsOn) {
    this.buttonsOn = true;
    this.updateRunningStateUI(false);

    document.getElementById("startButtonStart").onclick = () => {
      if (!this.currentAlgorithm) {
        document.getElementById("startButtonStart").innerHTML = '<button id="actualStartButton" class="btn btn-primary navbar-btn" type="button">Pick an Algorithm!</button>'
      } else {
        this.clearPath("clickedButton");
        this.toggleButtons();
        this.activateInsightTab();
        let weightedAlgorithms = ["dijkstra", "CLA", "CLA", "greedy"];
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
      }
    }

    document.getElementById("adjustFast").onclick = () => {
      this.speed = "fast";
      document.getElementById("adjustSpeed").innerHTML = 'Speed: Fast<span class="caret"></span>';
    }

    document.getElementById("adjustAverage").onclick = () => {
      this.speed = "average";
      document.getElementById("adjustSpeed").innerHTML = 'Speed: Average<span class="caret"></span>';
    }

    document.getElementById("adjustSlow").onclick = () => {
      this.speed = "slow";
      document.getElementById("adjustSpeed").innerHTML = 'Speed: Slow<span class="caret"></span>';
    }

    // Weight slider listener
    document.getElementById("weightSlider").oninput = (e) => {
      this.currentWeightValue = parseInt(e.target.value);
      document.getElementById("weightValue").textContent = this.currentWeightValue;
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

    document.getElementById("startStairDemonstration").onclick = () => {
      this.clearWalls();
      this.clearPath("clickedButton");
      this.toggleButtons();
      stairDemonstration(this);
      mazeGenerationAnimations(this);
    }


    document.getElementById("startButtonBidirectional").onclick = () => {
      document.getElementById("startButtonStart").innerHTML = '<button id="actualStartButton" class="btn btn-primary navbar-btn" type="button">Visualize Bidirectional Swarm!</button>'
      this.currentAlgorithm = "bidirectional";
      this.currentHeuristic = "manhattanDistance";
      this.clearPath("clickedButton");
      algorithmModal.showAlgorithmInfo(algorithmDescriptions.getAlgorithmKey("bidirectional"));
      this.changeStartNodeImages();
    }

    document.getElementById("startButtonDijkstra").onclick = () => {
      document.getElementById("startButtonStart").innerHTML = '<button id="actualStartButton" class="btn btn-primary navbar-btn" type="button">Visualize Dijkstra\'s!</button>'
      this.currentAlgorithm = "dijkstra";
      algorithmModal.showAlgorithmInfo(algorithmDescriptions.getAlgorithmKey("dijkstra"));
      this.changeStartNodeImages();
    }

    document.getElementById("startButtonAStar").onclick = () => {
      document.getElementById("startButtonStart").innerHTML = '<button id="actualStartButton" class="btn btn-primary navbar-btn" type="button">Visualize Swarm!</button>'
      this.currentAlgorithm = "CLA";
      this.currentHeuristic = "manhattanDistance"
      algorithmModal.showAlgorithmInfo(algorithmDescriptions.getAlgorithmKey("CLA", "manhattanDistance"));
      this.changeStartNodeImages();
    }

    document.getElementById("startButtonAStar2").onclick = () => {
      document.getElementById("startButtonStart").innerHTML = '<button id="actualStartButton" class="btn btn-primary navbar-btn" type="button">Visualize A*!</button>'
      this.currentAlgorithm = "astar";
      this.currentHeuristic = "poweredManhattanDistance"
      algorithmModal.showAlgorithmInfo(algorithmDescriptions.getAlgorithmKey("astar"));
      this.changeStartNodeImages();
    }

    document.getElementById("startButtonAStar3").onclick = () => {
      document.getElementById("startButtonStart").innerHTML = '<button id="actualStartButton" class="btn btn-primary navbar-btn" type="button">Visualize Convergent Swarm!</button>'
      this.currentAlgorithm = "CLA";
      this.currentHeuristic = "extraPoweredManhattanDistance"
      algorithmModal.showAlgorithmInfo(algorithmDescriptions.getAlgorithmKey("CLA", "extraPoweredManhattanDistance"));
      this.changeStartNodeImages();
    }

    document.getElementById("startButtonGreedy").onclick = () => {
      document.getElementById("startButtonStart").innerHTML = '<button id="actualStartButton" class="btn btn-primary navbar-btn" type="button">Visualize Greedy!</button>'
      this.currentAlgorithm = "greedy";
      algorithmModal.showAlgorithmInfo(algorithmDescriptions.getAlgorithmKey("greedy"));
      this.changeStartNodeImages();
    }

    document.getElementById("startButtonBFS").onclick = () => {
      document.getElementById("startButtonStart").innerHTML = '<button id="actualStartButton" class="btn btn-primary navbar-btn" type="button">Visualize BFS!</button>'
      this.currentAlgorithm = "bfs";
      this.clearWeights();
      algorithmModal.showAlgorithmInfo(algorithmDescriptions.getAlgorithmKey("bfs"));
      this.changeStartNodeImages();
    }

    document.getElementById("startButtonDFS").onclick = () => {
      document.getElementById("startButtonStart").innerHTML = '<button id="actualStartButton" class="btn btn-primary navbar-btn" type="button">Visualize DFS!</button>'
      this.currentAlgorithm = "dfs";
      this.clearWeights();
      algorithmModal.showAlgorithmInfo(algorithmDescriptions.getAlgorithmKey("dfs"));
      this.changeStartNodeImages();
    }

    document.getElementById("startButtonCreateMazeOne").onclick = () => {
      this.clearWalls();
      this.clearPath("clickedButton");
      this.createMazeOne("wall");
    }

    document.getElementById("startButtonCreateMazeTwo").onclick = () => {
      this.clearWalls();
      this.clearPath("clickedButton");
      this.toggleButtons();
      recursiveDivisionMaze(this, 2, this.height - 3, 2, this.width - 3, "horizontal", false, "wall");
      mazeGenerationAnimations(this);
    }

    document.getElementById("startButtonCreateMazeWeights").onclick = () => {
      this.clearWalls();
      this.clearPath("clickedButton");
      this.createMazeOne("weight");
    }

    document.getElementById("startButtonClearBoard").onclick = () => {
      if (this.animationController) this.animationController.stop();
      var controls = document.getElementById("animationControls");
      if (controls) controls.classList.add("hidden");
      var progressEl = document.getElementById("animationProgress");
      if (progressEl) progressEl.textContent = "";
      this.currentTrace = [];
      this.updateExplanationPanel(null);
      this.updateRunningStateUI(false);
      this.hidePathCost();
      aiExplain.hideAIExplanation();
      var impactText = document.getElementById("weightImpactText");
      if (impactText) impactText.textContent = "";
      this.activateControlsTab();
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
    }

    document.getElementById("startButtonClearWalls").onclick = () => {
      this.clearWalls();
    }

    document.getElementById("startButtonClearPath").onclick = () => {
      this.clearPath("clickedButton");
    }

    document.getElementById("startButtonCreateMazeThree").onclick = () => {
      this.clearWalls();
      this.clearPath("clickedButton");
      this.toggleButtons();
      otherMaze(this, 2, this.height - 3, 2, this.width - 3, "vertical", false);
      mazeGenerationAnimations(this);
    }

    document.getElementById("startButtonCreateMazeFour").onclick = () => {
      this.clearWalls();
      this.clearPath("clickedButton");
      this.toggleButtons();
      otherOtherMaze(this, 2, this.height - 3, 2, this.width - 3, "horizontal", false);
      mazeGenerationAnimations(this);
    }


    document.getElementById("startButtonClearPath").className = "navbar-inverse navbar-nav";
    document.getElementById("startButtonClearWalls").className = "navbar-inverse navbar-nav";
    document.getElementById("startButtonClearBoard").className = "navbar-inverse navbar-nav";
    document.getElementById("startButtonCreateMazeOne").className = "navbar-inverse navbar-nav";
    document.getElementById("startButtonCreateMazeTwo").className = "navbar-inverse navbar-nav";
    document.getElementById("startButtonCreateMazeThree").className = "navbar-inverse navbar-nav";
    document.getElementById("startButtonCreateMazeFour").className = "navbar-inverse navbar-nav";
    document.getElementById("startButtonCreateMazeWeights").className = "navbar-inverse navbar-nav";
    document.getElementById("startStairDemonstration").className = "navbar-inverse navbar-nav";
    document.getElementById("startButtonDFS").className = "navbar-inverse navbar-nav";
    document.getElementById("startButtonBFS").className = "navbar-inverse navbar-nav";
    document.getElementById("startButtonDijkstra").className = "navbar-inverse navbar-nav";
    document.getElementById("startButtonAStar").className = "navbar-inverse navbar-nav";
    document.getElementById("startButtonAStar2").className = "navbar-inverse navbar-nav";
    document.getElementById("startButtonAStar3").className = "navbar-inverse navbar-nav";
    document.getElementById("adjustFast").className = "navbar-inverse navbar-nav";
    document.getElementById("adjustAverage").className = "navbar-inverse navbar-nav";
    document.getElementById("adjustSlow").className = "navbar-inverse navbar-nav";
    document.getElementById("startButtonBidirectional").className = "navbar-inverse navbar-nav";
    document.getElementById("startButtonGreedy").className = "navbar-inverse navbar-nav";
    document.getElementById("actualStartButton").style.backgroundColor = "";

  } else {
    this.buttonsOn = false;
    this.updateRunningStateUI(true);
    document.getElementById("startButtonDFS").onclick = null;
    document.getElementById("startButtonBFS").onclick = null;
    document.getElementById("startButtonDijkstra").onclick = null;
    document.getElementById("startButtonAStar").onclick = null;
    document.getElementById("startButtonGreedy").onclick = null;
    document.getElementById("startButtonAStar2").onclick = null;
    document.getElementById("startButtonAStar3").onclick = null;
    document.getElementById("startButtonBidirectional").onclick = null;
    document.getElementById("startButtonCreateMazeOne").onclick = null;
    document.getElementById("startButtonCreateMazeTwo").onclick = null;
    document.getElementById("startButtonCreateMazeThree").onclick = null;
    document.getElementById("startButtonCreateMazeFour").onclick = null;
    document.getElementById("startButtonCreateMazeWeights").onclick = null;
    document.getElementById("startStairDemonstration").onclick = null;
    document.getElementById("startButtonClearPath").onclick = null;
    document.getElementById("startButtonClearWalls").onclick = null;
    document.getElementById("startButtonClearBoard").onclick = null;
    document.getElementById("startButtonStart").onclick = null;
    document.getElementById("adjustFast").onclick = null;
    document.getElementById("adjustAverage").onclick = null;
    document.getElementById("adjustSlow").onclick = null;

    document.getElementById("adjustFast").className = "navbar-inverse navbar-nav disabledA";
    document.getElementById("adjustAverage").className = "navbar-inverse navbar-nav disabledA";
    document.getElementById("adjustSlow").className = "navbar-inverse navbar-nav disabledA";
    document.getElementById("startButtonClearPath").className = "navbar-inverse navbar-nav disabledA";
    document.getElementById("startButtonClearWalls").className = "navbar-inverse navbar-nav disabledA";
    document.getElementById("startButtonClearBoard").className = "navbar-inverse navbar-nav disabledA";
    document.getElementById("startButtonCreateMazeOne").className = "navbar-inverse navbar-nav disabledA";
    document.getElementById("startButtonCreateMazeTwo").className = "navbar-inverse navbar-nav disabledA";
    document.getElementById("startButtonCreateMazeThree").className = "navbar-inverse navbar-nav disabledA";
    document.getElementById("startButtonCreateMazeFour").className = "navbar-inverse navbar-nav disabledA";
    document.getElementById("startButtonCreateMazeWeights").className = "navbar-inverse navbar-nav disabledA";
    document.getElementById("startStairDemonstration").className = "navbar-inverse navbar-nav disabledA";
    document.getElementById("startButtonDFS").className = "navbar-inverse navbar-nav disabledA";
    document.getElementById("startButtonBFS").className = "navbar-inverse navbar-nav disabledA";
    document.getElementById("startButtonDijkstra").className = "navbar-inverse navbar-nav disabledA";
    document.getElementById("startButtonAStar").className = "navbar-inverse navbar-nav disabledA";
    document.getElementById("startButtonGreedy").className = "navbar-inverse navbar-nav disabledA";
    document.getElementById("startButtonAStar2").className = "navbar-inverse navbar-nav disabledA";
    document.getElementById("startButtonAStar3").className = "navbar-inverse navbar-nav disabledA";
    document.getElementById("startButtonBidirectional").className = "navbar-inverse navbar-nav disabledA";

    document.getElementById("actualStartButton").style.backgroundColor = "rgb(185, 15, 15)";
  }


}

function getInitialBoardDimensions() {
  let navbarHeight = document.getElementById("navbarDiv").clientHeight || 50;
  let legendHeight = document.getElementById("legendBar") ? document.getElementById("legendBar").clientHeight : 28;
  let availableHeight = Math.max(280, document.documentElement.clientHeight - navbarHeight - legendHeight - 6);
  let gridArea = document.getElementById("gridArea");
  let availableWidth = Math.max(300, gridArea ? gridArea.clientWidth : document.documentElement.clientWidth);

  return {
    height: Math.max(10, Math.floor(availableHeight / 28)),
    width: Math.max(10, Math.floor(availableWidth / 25))
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

},{"./animations/animationController":1,"./animations/launchAnimations":2,"./animations/launchInstantAnimations":3,"./animations/mazeGenerationAnimations":4,"./getDistance":6,"./mazeAlgorithms/otherMaze":7,"./mazeAlgorithms/otherOtherMaze":8,"./mazeAlgorithms/recursiveDivisionMaze":9,"./mazeAlgorithms/simpleDemonstration":10,"./mazeAlgorithms/stairDemonstration":11,"./mazeAlgorithms/weightsDemonstration":12,"./node":13,"./pathfindingAlgorithms/astar":14,"./pathfindingAlgorithms/bidirectional":15,"./pathfindingAlgorithms/unweightedSearchAlgorithm":16,"./pathfindingAlgorithms/weightedSearchAlgorithm":17,"./utils/aiExplain":18,"./utils/algorithmDescriptions":19,"./utils/algorithmModal":20,"./utils/explanationTemplates":21,"./utils/historyUI":24,"./utils/weightImpactAnalyzer":26}],6:[function(require,module,exports){
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
function simpleDemonstration(board) {
  let currentIdY = board.width - 10;
  for (let counter = 0; counter < 7; counter++) {
    let currentIdXOne = Math.floor(board.height / 2) - counter;
    let currentIdXTwo = Math.floor(board.height / 2) + counter;
    let currentIdOne = `${currentIdXOne}-${currentIdY}`;
    let currentIdTwo = `${currentIdXTwo}-${currentIdY}`;
    let currentElementOne = document.getElementById(currentIdOne);
    let currentElementTwo = document.getElementById(currentIdTwo);
    board.wallsToAnimate.push(currentElementOne);
    board.wallsToAnimate.push(currentElementTwo);
    let currentNodeOne = board.nodes[currentIdOne];
    let currentNodeTwo = board.nodes[currentIdTwo];
    currentNodeOne.status = "wall";
    currentNodeOne.weight = 0;
    currentNodeTwo.status = "wall";
    currentNodeTwo.weight = 0;
  }
}

module.exports = simpleDemonstration;

},{}],11:[function(require,module,exports){
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

},{}],12:[function(require,module,exports){
function weightsDemonstration(board) {
  let currentIdX = board.height - 1;
  let currentIdY = 35;
  while (currentIdX > 5) {
    let currentId = `${currentIdX}-${currentIdY}`;
    let currentElement = document.getElementById(currentId);
    board.wallsToAnimate.push(currentElement);
    let currentNode = board.nodes[currentId];
    currentNode.status = "wall";
    currentNode.weight = 0;
    currentIdX--;
  }
  for (let currentIdX = board.height - 2; currentIdX > board.height - 11; currentIdX--) {
    for (let currentIdY = 1; currentIdY < 35; currentIdY++) {
      let currentId = `${currentIdX}-${currentIdY}`;
      let currentElement = document.getElementById(currentId);
      board.wallsToAnimate.push(currentElement);
      let currentNode = board.nodes[currentId];
      if (currentIdX === board.height - 2 && currentIdY < 35 && currentIdY > 26) {
        currentNode.status = "wall";
        currentNode.weight = 0;
      } else {
        currentNode.status = "unvisited";
        currentNode.weight = board.currentWeightValue;
      }
    }
  }
}

module.exports = weightsDemonstration;

},{}],13:[function(require,module,exports){
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

},{}],14:[function(require,module,exports){
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

},{}],15:[function(require,module,exports){
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

},{"./astar":14}],16:[function(require,module,exports){
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

},{}],17:[function(require,module,exports){
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

},{"./astar":14}],18:[function(require,module,exports){
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
  var loading = document.getElementById("ai-explanation-loading");
  var textDiv = document.getElementById("ai-explanation-text");

  if (!loading || !textDiv) {
    console.warn("[AI] Missing DOM elements for AI explanation");
    return;
  }

  loading.classList.remove("hidden");
  textDiv.textContent = "";
  if (board && board.activateInsightTab) board.activateInsightTab();

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
      if (board && board.activateInsightTab) board.activateInsightTab();
      console.log("[AI] Explanation received (source: " + data.source + ")");
    })
    .catch(function (error) {
      loading.classList.add("hidden");
      textDiv.textContent = "The algorithm visited " + visitedCount +
        " nodes and found a path of " + pathLength + " steps.";
      if (board && board.activateInsightTab) board.activateInsightTab();
      console.error("[AI] Error:", error);
    });
}

function hideAIExplanation() {
  var loading = document.getElementById("ai-explanation-loading");
  var textDiv = document.getElementById("ai-explanation-text");
  if (loading) loading.classList.add("hidden");
  if (textDiv) textDiv.textContent = "";
}

module.exports = {
  requestAIExplanation: requestAIExplanation,
  hideAIExplanation: hideAIExplanation,
  buildRunDigest: buildRunDigest
};

},{"./gridMetrics":22}],19:[function(require,module,exports){
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

},{}],20:[function(require,module,exports){
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

},{"./algorithmDescriptions":19}],21:[function(require,module,exports){
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

},{}],22:[function(require,module,exports){
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

},{}],23:[function(require,module,exports){
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

},{}],24:[function(require,module,exports){
var historyStorage = require("./historyStorage");

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

function renderHistoryList(board) {
  var container = document.getElementById("historyList");
  if (!container) {
    console.warn("[History UI] historyList element not found");
    return;
  }

  var runs = historyStorage.loadRuns();
  container.innerHTML = "";

  if (runs.length === 0) {
    var emptyState = document.createElement("div");
    emptyState.className = "history-empty";
    emptyState.textContent = "No saved runs yet. Click 'Visualize!' to create one.";
    container.appendChild(emptyState);
    return;
  }

  for (var i = 0; i < runs.length; i++) {
    var run = runs[i];
    container.appendChild(createHistoryItem(run, board));
  }

  var clearAll = document.createElement("div");
  clearAll.className = "history-clear-all";
  clearAll.innerHTML = '<button id="clearAllHistoryBtn" type="button">Clear All History</button>';
  container.appendChild(clearAll);

  var clearBtn = document.getElementById("clearAllHistoryBtn");
  if (clearBtn) {
    clearBtn.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (confirm("Delete all run history? This cannot be undone.")) {
        historyStorage.clearHistory();
        renderHistoryList(board);
      }
    };
  }
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
    loadRun(run, board, false);
  };

  replayBtn.onclick = function (e) {
    e.preventDefault();
    e.stopPropagation();
    loadRun(run, board, true);
  };

  deleteBtn.onclick = function (e) {
    e.preventDefault();
    e.stopPropagation();
    historyStorage.deleteRun(run.id);
    renderHistoryList(board);
  };

  return item;
}

function loadRun(run, board, autoReplay) {
  console.log("[History] Loading run:", run.id, "autoReplay:", autoReplay);

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
  }

  renderHistoryList(board);

  console.log("[History] Run loaded successfully");

  if (autoReplay && board.currentAlgorithm) {
    setTimeout(function () {
      var startBtn = document.getElementById("actualStartButton");
      if (startBtn) {
        startBtn.click();
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
  loadRun: loadRun
};

},{"./historyStorage":23}],25:[function(require,module,exports){
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

},{}],26:[function(require,module,exports){
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

},{"./gridMetrics":22}]},{},[5]);
