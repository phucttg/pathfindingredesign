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
