const assert = require("assert");
const { analyzeWeightImpact } = require("../public/browser/utils/weightImpactAnalyzer");
const { runScenario } = require("./testHelpers");

function makeNode(id, weight, previousNode) {
  return { id: id, weight: weight || 0, previousNode: previousNode || null };
}

function buildBoard(nodes, start, target, shortestPathNodesToAnimate) {
  return {
    nodes: nodes,
    start: start,
    target: target,
    shortestPathNodesToAnimate: shortestPathNodesToAnimate || []
  };
}

function testNoWeights() {
  const nodes = {
    "0-0": makeNode("0-0", 0, null),
    "0-1": makeNode("0-1", 0, "0-0"),
    "0-2": makeNode("0-2", 0, "0-1")
  };
  const board = buildBoard(nodes, "0-0", "0-2");
  const result = analyzeWeightImpact(board);

  assert.strictEqual(result.weightNodesInPath.length, 0, "No weights expected");
  assert.strictEqual(result.totalWeightCost, 0, "Total weight cost should be 0");
  assert.strictEqual(result.baseCost, 3, "Base cost should include start + target");
  assert.ok(result.metrics, "Metrics should be included");
  assert.ok(result.explanation.split("\n").length >= 4, "Explanation should be multi-line");
}

function testWeightsInPath() {
  const nodes = {
    "0-0": makeNode("0-0", 0, null),
    "0-1": makeNode("0-1", 5, "0-0"),
    "0-2": makeNode("0-2", 0, "0-1")
  };
  const board = buildBoard(nodes, "0-0", "0-2");
  const result = analyzeWeightImpact(board);

  assert.strictEqual(result.weightNodesInPath.length, 1, "One weight node expected");
  assert.strictEqual(result.totalWeightCost, 5, "Weight cost should equal node weight");
  assert.strictEqual(result.baseCost, 3, "Base cost should include start + target");
  assert.ok(result.explanation.split("\n").length >= 4, "Explanation should be multi-line");
}

function testUsesShortestPathNodesToAnimate() {
  const nodes = {
    "0-0": makeNode("0-0", 0, null),
    "0-1": makeNode("0-1", 7, "0-0"),
    "0-2": makeNode("0-2", 0, "0-1")
  };
  const board = buildBoard(nodes, "0-0", "0-2", [nodes["0-1"]]);
  const result = analyzeWeightImpact(board);

  assert.strictEqual(result.baseCost, 3, "Base cost should include start + target");
  assert.strictEqual(result.totalWeightCost, 7, "Weight cost should use shortestPathNodesToAnimate");
  assert.ok(result.explanation.split("\n").length >= 4, "Explanation should be multi-line");
}

function run() {
  runScenario("No weights in the path", testNoWeights);
  runScenario("Weights in the path are counted correctly", testWeightsInPath);
  runScenario("shortestPathNodesToAnimate is used as the path source", testUsesShortestPathNodesToAnimate);
  console.log("Completed weightImpactAnalyzer.test.js");
}

run();
