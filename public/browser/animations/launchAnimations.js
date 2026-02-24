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
