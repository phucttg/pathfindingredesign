const assert = require("assert");
const serializeRun = require("../public/browser/utils/runSerializer");
const historyStorage = require("../public/browser/utils/historyStorage");
const { runScenario, withMutedConsole } = require("./testHelpers");

function makeLocalStorage() {
  const store = {};
  return {
    getItem: function (key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem: function (key, value) {
      store[key] = String(value);
    },
    removeItem: function (key) {
      delete store[key];
    }
  };
}

function buildBoard() {
  return {
    height: 2,
    width: 3,
    start: "0-0",
    target: "0-2",
    currentAlgorithm: "dijkstra",
    currentHeuristic: null,
    speed: "slow",
    currentWeightValue: 7,
    shortestPathNodesToAnimate: [],
    nodes: {
      "0-0": { id: "0-0", status: "start", weight: 0, previousNode: null },
      "0-1": { id: "0-1", status: "visited", weight: 3, previousNode: "0-0" },
      "0-2": { id: "0-2", status: "target", weight: 0, previousNode: "0-1" },
      "1-0": { id: "1-0", status: "unvisited", weight: 0, previousNode: null },
      "1-1": { id: "1-1", status: "wall", weight: 0, previousNode: null },
      "1-2": { id: "1-2", status: "unvisited", weight: 0, previousNode: null }
    }
  };
}

function testSerializeRunIncludesReplayMetadata() {
  const originalNow = Date.now;
  Date.now = function () {
    return 1700000000000;
  };

  try {
    const board = buildBoard();
    const run = serializeRun(board, "success!", 4);

    assert.strictEqual(run.id, "run-1700000000000", "Run id should be derived from the timestamp");
    assert.strictEqual(run.settings.algorithm, "dijkstra", "Algorithm should be serialized");
    assert.strictEqual(run.settings.algorithmKey, "dijkstra", "Algorithm key should be serialized for replay metadata");
    assert.strictEqual(run.settings.speed, "slow", "Playback speed should be serialized");
    assert.strictEqual(run.result.found, true, "Successful runs should be marked as found");
    assert.strictEqual(run.result.pathLength, 3, "Serialized path length should include start, middle, and target");
    assert.strictEqual(run.result.pathCost, 5, "Serialized path cost should reflect the weighted route");
    assert.strictEqual(run.result.nodesVisited, 4, "Visited count should be preserved");
    assert.deepStrictEqual(run.walls, ["1-1"], "Wall ids should be extracted for replay");
    assert.deepStrictEqual(run.weights, [{ id: "0-1", value: 3 }], "Weight metadata should be extracted for replay");
  } finally {
    Date.now = originalNow;
  }
}

function testHistoryStorageMaintainsFiveNewestRuns() {
  global.localStorage = makeLocalStorage();
  historyStorage.clearHistory();

  for (let i = 1; i <= 6; i++) {
    const saved = historyStorage.saveRun({ id: "run-" + i, order: i });
    assert.strictEqual(saved, true, "Runs should save successfully into localStorage");
  }

  let runs = historyStorage.loadRuns();
  assert.strictEqual(runs.length, 5, "History should keep only the five most recent runs");
  assert.deepStrictEqual(
    runs.map(function (run) { return run.id; }),
    ["run-6", "run-5", "run-4", "run-3", "run-2"],
    "History should keep the most recent runs in newest-first order"
  );
  assert.strictEqual(historyStorage.getRun("run-4").id, "run-4", "Saved runs should be retrievable by id");
  assert.strictEqual(historyStorage.getRun("run-1"), null, "Runs trimmed by the five-run limit should no longer be retrievable");

  assert.strictEqual(historyStorage.deleteRun("run-4"), true, "Existing runs should be deletable");
  assert.strictEqual(historyStorage.getRun("run-4"), null, "Deleted runs should no longer be retrievable");
  assert.strictEqual(historyStorage.deleteRun("missing-run"), false, "Deleting a missing run should report false");

  historyStorage.clearHistory();
  runs = historyStorage.loadRuns();
  assert.deepStrictEqual(runs, [], "Clearing history should remove all stored runs");
}

function run() {
  runScenario("serializeRun includes replay metadata", function () {
    withMutedConsole(["log", "error"], function () {
      testSerializeRunIncludesReplayMetadata();
    });
  });

  runScenario("historyStorage keeps five newest runs and supports get/delete/clear", function () {
    withMutedConsole(["log", "error"], function () {
      testHistoryStorageMaintainsFiveNewestRuns();
    });
  });

  console.log("Completed runPersistence.test.js");
}

run();
