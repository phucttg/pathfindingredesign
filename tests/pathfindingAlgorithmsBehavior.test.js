const assert = require("assert");
const unweightedSearchAlgorithm = require("../public/browser/pathfindingAlgorithms/unweightedSearchAlgorithm");
const weightedSearchAlgorithm = require("../public/browser/pathfindingAlgorithms/weightedSearchAlgorithm");
const { runScenario } = require("./testHelpers");

function makeBoardArray(rows, cols) {
  return Array.from({ length: rows }, function () {
    return Array.from({ length: cols }, function () {
      return true;
    });
  });
}

function makeNodes(rows, cols, options) {
  const walls = (options && options.walls) || {};
  const weights = (options && options.weights) || {};
  const nodes = {};

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const id = row + "-" + col;
      nodes[id] = {
        id: id,
        status: walls[id] ? "wall" : "unvisited",
        weight: weights[id] || 0,
        previousNode: null,
        distance: Infinity,
        totalDistance: Infinity,
        heuristicDistance: null,
        direction: "up"
      };
    }
  }

  return nodes;
}

function extractPath(nodes, start, target) {
  const path = [];
  const seen = {};
  let currentId = target;

  while (currentId) {
    if (seen[currentId]) {
      throw new Error("Cycle detected while reconstructing path at " + currentId);
    }
    seen[currentId] = true;
    path.push(currentId);
    if (currentId === start) {
      return path.reverse();
    }
    currentId = nodes[currentId] && nodes[currentId].previousNode;
  }

  return [];
}

function testBfsFindsShortestPathBySteps() {
  const nodes = makeNodes(2, 3);
  const boardArray = makeBoardArray(2, 3);
  const nodesToAnimate = [];
  const trace = [];

  const result = unweightedSearchAlgorithm(
    nodes,
    "0-0",
    "0-2",
    nodesToAnimate,
    boardArray,
    "bfs",
    trace
  );

  const path = extractPath(nodes, "0-0", "0-2");

  assert.strictEqual(result, "success", "BFS should find a path on an unweighted grid");
  assert.deepStrictEqual(
    path,
    ["0-0", "0-1", "0-2"],
    "BFS should return the shortest path by steps on the simple grid"
  );
  assert.ok(nodesToAnimate.length >= 3, "BFS should visit at least the nodes on the final path");
}

function testDijkstraPrefersLowerCostWeightedRoute() {
  const nodes = makeNodes(2, 3, {
    weights: {
      "0-1": 9
    }
  });
  const boardArray = makeBoardArray(2, 3);
  const nodesToAnimate = [];
  const trace = [];

  const result = weightedSearchAlgorithm(
    nodes,
    "0-0",
    "0-2",
    nodesToAnimate,
    boardArray,
    "dijkstra",
    null,
    trace
  );

  const path = extractPath(nodes, "0-0", "0-2");

  assert.strictEqual(result, "success!", "Dijkstra should find a weighted path successfully");
  assert.deepStrictEqual(
    path,
    ["0-0", "1-0", "1-1", "1-2", "0-2"],
    "Dijkstra should avoid the expensive weighted shortcut and choose the lower-cost route"
  );
  assert.ok(path.length > 3, "The lower-cost weighted route should be longer by steps than the direct shortcut");
  assert.ok(path.indexOf("0-1") === -1, "The chosen route should avoid the weighted shortcut node");
}

function run() {
  runScenario("BFS finds the shortest path by steps", testBfsFindsShortestPathBySteps);
  runScenario("Dijkstra prefers the lower-cost weighted route", testDijkstraPrefersLowerCostWeightedRoute);
  console.log("Completed pathfindingAlgorithmsBehavior.test.js");
}

run();
