const assert = require("assert");
const aiExplain = require("../public/browser/utils/aiExplain");
const { runScenario, runScenarioAsync, withMutedConsole } = require("./testHelpers");

function flushAsync() {
  return new Promise(function (resolve) {
    setTimeout(resolve, 0);
  });
}

function createClassList(initialClasses) {
  const values = {};
  (initialClasses || []).forEach(function (name) {
    values[name] = true;
  });
  return {
    add: function (name) {
      values[name] = true;
    },
    remove: function (name) {
      delete values[name];
    },
    contains: function (name) {
      return !!values[name];
    }
  };
}

function createElement(initialClasses) {
  return {
    textContent: "",
    classList: createClassList(initialClasses)
  };
}

function createDocument(elements) {
  return {
    getElementById: function (id) {
      return elements[id] || null;
    }
  };
}

function buildBoard() {
  const nodes = {
    "0-0": { id: "0-0", status: "start", weight: 0, previousNode: null },
    "0-1": { id: "0-1", status: "visited", weight: 0, previousNode: "0-0" },
    "0-2": { id: "0-2", status: "target", weight: 0, previousNode: "0-1" },
    "1-0": { id: "1-0", status: "visited", weight: 0, previousNode: null },
    "1-1": { id: "1-1", status: "unvisited", weight: 0, previousNode: null },
    "1-2": { id: "1-2", status: "unvisited", weight: 0, previousNode: null }
  };

  return {
    currentAlgorithm: "dijkstra",
    currentHeuristic: null,
    start: "0-0",
    target: "0-2",
    nodes: nodes,
    nodesToAnimate: [nodes["0-0"], nodes["0-1"], nodes["1-0"]],
    shortestPathNodesToAnimate: [nodes["0-1"], nodes["0-2"]]
  };
}

async function testRejectedFetchFallsBackToDeterministicText() {
  const elements = {
    "ai-explanation-container": createElement(["hidden"]),
    "ai-explanation-loading": createElement(["hidden"]),
    "ai-explanation-text": createElement([])
  };

  global.document = createDocument(elements);
  global.fetch = function () {
    return Promise.reject(new Error("network failed"));
  };

  aiExplain.requestAIExplanation(buildBoard(), 6, 4);
  await flushAsync();
  await flushAsync();

  assert.strictEqual(
    elements["ai-explanation-text"].textContent,
    "The algorithm visited 6 nodes and found a path of 4 steps.",
    "Rejected fetch should produce deterministic fallback text"
  );
  assert.strictEqual(
    elements["ai-explanation-loading"].classList.contains("hidden"),
    true,
    "Loading indicator should be hidden after fallback rendering"
  );
}

async function testNonOkResponseAlsoFallsBackSafely() {
  const elements = {
    "ai-explanation-container": createElement(["hidden"]),
    "ai-explanation-loading": createElement(["hidden"]),
    "ai-explanation-text": createElement([])
  };

  global.document = createDocument(elements);
  global.fetch = function () {
    return Promise.resolve({ ok: false, status: 500 });
  };

  aiExplain.requestAIExplanation(buildBoard(), 5, 3);
  await flushAsync();
  await flushAsync();

  assert.strictEqual(
    elements["ai-explanation-text"].textContent,
    "The algorithm visited 5 nodes and found a path of 3 steps.",
    "Non-OK responses should also fall back to deterministic text"
  );
}

function testMissingDomElementsFailSafely() {
  let warnings = 0;
  const originalWarn = console.warn;
  console.warn = function () {
    warnings++;
  };

  try {
    global.document = createDocument({});
    global.fetch = function () {
      throw new Error("fetch should not be called when DOM is missing");
    };

    aiExplain.requestAIExplanation(buildBoard(), 1, 1);
    assert.strictEqual(warnings, 1, "Missing DOM elements should trigger a warning rather than a crash");
  } finally {
    console.warn = originalWarn;
  }
}

async function run() {
  const originalDocument = global.document;
  const originalFetch = global.fetch;

  try {
    await runScenarioAsync("Rejected fetch falls back to deterministic text", function () {
      return withMutedConsole(["log", "error"], function () {
        return testRejectedFetchFallsBackToDeterministicText();
      });
    });

    await runScenarioAsync("Non-OK response also falls back safely", function () {
      return withMutedConsole(["log", "error"], function () {
        return testNonOkResponseAlsoFallsBackSafely();
      });
    });

    runScenario("Missing DOM elements fail safely", testMissingDomElementsFailSafely);
    console.log("Completed aiExplainFallback.test.js");
  } finally {
    global.document = originalDocument;
    global.fetch = originalFetch;
  }
}

run().catch(function (error) {
  console.error(error);
  process.exit(1);
});
