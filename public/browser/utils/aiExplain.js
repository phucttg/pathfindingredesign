var gridMetrics = require("./gridMetrics");
var algorithmDescriptions = require("./algorithmDescriptions");

var ALGORITHM_META = {
  dijkstra: {
    algorithmFamily: "weighted",
    guaranteesOptimal: true,
    complete: true,
    usesHeuristic: false,
    selectionRule: "Always picks the unvisited node with the lowest known path cost g(n).",
    bestFor: "Weighted shortest-path problems that require guaranteed optimality.",
    weakness: "Can explore many unnecessary nodes on large open maps."
  },
  astar: {
    algorithmFamily: "weighted",
    guaranteesOptimal: true,
    complete: true,
    usesHeuristic: true,
    selectionRule: "Picks the node with the lowest estimated total cost f(n) = g(n) + h(n).",
    bestFor: "Fast optimal routing when the heuristic is admissible.",
    weakness: "A weak heuristic can degrade toward Dijkstra-level exploration."
  },
  greedy: {
    algorithmFamily: "weighted",
    guaranteesOptimal: false,
    complete: true,
    usesHeuristic: true,
    selectionRule: "Always picks the node that appears closest to the target using h(n) only.",
    bestFor: "Quick approximate pathfinding when response time is the main goal.",
    weakness: "Can return expensive detours because it ignores path cost-so-far."
  },
  swarm: {
    algorithmFamily: "weighted",
    guaranteesOptimal: false,
    complete: true,
    usesHeuristic: true,
    selectionRule: "Blends traveled cost and heuristic guidance into one ranking score.",
    bestFor: "Balanced visual performance in interactive demos.",
    weakness: "Score tuning can produce unstable path quality across maps."
  },
  convergentSwarm: {
    algorithmFamily: "weighted",
    guaranteesOptimal: false,
    complete: true,
    usesHeuristic: true,
    selectionRule: "Uses an aggressively powered heuristic to converge toward target quickly.",
    bestFor: "Fast visual convergence when strict optimality is not required.",
    weakness: "Strong heuristic bias can cross costly regions and miss lower-cost routes."
  },
  bidirectional: {
    algorithmFamily: "weighted",
    guaranteesOptimal: false,
    complete: "variant-dependent",
    usesHeuristic: true,
    selectionRule: "Expands from start and target simultaneously and merges at a meeting node.",
    bestFor: "Large maps where meeting in the middle reduces search depth.",
    weakness: "Merge quality and scoring asymmetry can reduce final path quality."
  },
  bfs: {
    algorithmFamily: "unweighted",
    guaranteesOptimal: true,
    complete: true,
    usesHeuristic: false,
    selectionRule: "Explores all nodes at depth d before exploring depth d+1.",
    bestFor: "Shortest path by steps on unweighted grids.",
    weakness: "Not suitable for weighted cost optimization."
  },
  dfs: {
    algorithmFamily: "unweighted",
    guaranteesOptimal: false,
    complete: true,
    usesHeuristic: false,
    selectionRule: "Follows one branch as deep as possible before backtracking.",
    bestFor: "Reachability checks and structure traversal.",
    weakness: "Path quality is highly order-dependent and often non-optimal."
  },
  CLA: {
    algorithmFamily: "weighted",
    guaranteesOptimal: false,
    complete: true,
    usesHeuristic: true,
    selectionRule: "Blends traveled cost and heuristic guidance into one ranking score.",
    bestFor: "Legacy fallback for Swarm variants.",
    weakness: "Use canonical swarm keys for precise behavior labels."
  }
};

function idToReadable(id) {
  if (!id) return "unknown";
  var parts = id.split("-");
  return "row " + parts[0] + ", col " + parts[1];
}

function buildRunDigest(board, visitedCount, pathLength) {
  var algoInternal = board.currentAlgorithm || "dijkstra";
  var algoKey = algorithmDescriptions.getAlgorithmKey(algoInternal, board.currentHeuristic);
  var meta = ALGORITHM_META[algoKey] || ALGORITHM_META[algoInternal] || ALGORITHM_META.dijkstra;
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
    algorithmInternal: algoInternal,
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
