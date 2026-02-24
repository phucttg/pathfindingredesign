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

let counter = 1;
Board.prototype.toggleTutorialButtons = function () {

  document.getElementById("skipButton").onclick = () => {
    document.getElementById("tutorial").style.display = "none";
    mazeSelector.showOnboardingModal(this);
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
      document.getElementById("tutorial").innerHTML = `<h3>Adding walls and weights</h3><h6>Click on the grid to add a wall. Click on the grid while pressing W to add a weight. Generate mazes and patterns from the Maze section in the left sidebar.</h6><p>Walls are impenetrable, meaning that a path cannot cross through them. Weights are not impassable, they just cost more. Each step has a base cost of 1. Turning adds extra cost (90-degree turn +1, 180-degree turn +2). Weights add the slider value (0-50). Set weight to 0 to make a normal node.</p><img id="secondTutorialImage" src="public/styling/walls.gif"><div id="tutorialCounter">${counter}/8</div><button id="nextButton" class="btn btn-default navbar-btn" type="button">Next</button><button id="previousButton" class="btn btn-default navbar-btn" type="button">Previous</button><button id="skipButton" class="btn btn-default navbar-btn" type="button">Skip Tutorial</button>`
    } else if (counter === 6) {
      document.getElementById("tutorial").innerHTML = `<h3>Dragging nodes</h3><h6>Click and drag the start and target nodes to move them.</h6><p>Note that you can drag nodes even after an algorithm has finished running. This will allow you to instantly see different paths.</p><img src="public/styling/dragging.gif"><div id="tutorialCounter">${counter}/8</div><button id="nextButton" class="btn btn-default navbar-btn" type="button">Next</button><button id="previousButton" class="btn btn-default navbar-btn" type="button">Previous</button><button id="skipButton" class="btn btn-default navbar-btn" type="button">Skip Tutorial</button>`
    } else if (counter === 7) {
      document.getElementById("tutorial").innerHTML = `<h3>Visualizing and more</h3><h6>Use the navbar buttons to visualize algorithms and to do other stuff!</h6><p>You can clear the current path, clear walls and weights, clear the entire board, and adjust the visualization speed, all from the navbar. If you want to access this tutorial again, click on "Pathfinding Visualizer" in the top left corner of your screen.</p><img id="secondTutorialImage" src="public/styling/navbar.png"><div id="tutorialCounter">${counter}/8</div><button id="nextButton" class="btn btn-default navbar-btn" type="button">Next</button><button id="previousButton" class="btn btn-default navbar-btn" type="button">Previous</button><button id="skipButton" class="btn btn-default navbar-btn" type="button">Skip Tutorial</button>`
    } else if (counter === 8) {
      document.getElementById("tutorial").innerHTML = `<h3>Enjoy!</h3><h6>I hope you have just as much fun playing around with this visualization tool as I had building it!</h6><p>If you want to see the source code for this application, check out my <a href="https://github.com/clementmihailescu/Pathfinding-Visualizer">github</a>.</p><div id="tutorialCounter">${counter}/8</div><button id="finishButton" class="btn btn-default navbar-btn" type="button">Finish</button><button id="previousButton" class="btn btn-default navbar-btn" type="button">Previous</button><button id="skipButton" class="btn btn-default navbar-btn" type="button">Skip Tutorial</button>`
      document.getElementById("finishButton").onclick = () => {
        document.getElementById("tutorial").style.display = "none";
        mazeSelector.showOnboardingModal(board);
      }
    }
  }

};

Board.prototype.toggleButtons = function () {
  var refreshButton = document.getElementById("refreshButton");
  if (refreshButton) {
    refreshButton.onclick = () => {
      window.location.reload(true);
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
