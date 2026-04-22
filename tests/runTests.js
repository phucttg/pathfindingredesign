const path = require("path");
const { spawnSync } = require("child_process");

const TEST_FILES = [
  "pathfindingAlgorithmsBehavior.test.js",
  "animationController.test.js",
  "runPersistence.test.js",
  "aiExplainFallback.test.js",
  "weightImpactAnalyzer.test.js",
  "algorithmDescriptionsSchema.test.js"
];

function normalizeTarget(raw) {
  if (!raw) {
    return null;
  }

  let candidate = String(raw).trim().replace(/\\/g, "/");
  if (!candidate) {
    return null;
  }

  if (candidate.indexOf("/") !== -1) {
    candidate = candidate.split("/").pop();
  }

  if (!candidate.endsWith(".test.js")) {
    candidate += ".test.js";
  }

  return candidate;
}

function printUsageError(message) {
  console.error(message);
  console.error("Allowed test files:");
  TEST_FILES.forEach(function (file) {
    console.error(" - " + file);
  });
}

function resolveTargets(args) {
  if (args.length === 0) {
    return TEST_FILES.slice();
  }

  if (args.length > 1) {
    printUsageError("Please provide at most one test file.");
    process.exit(1);
  }

  const normalized = normalizeTarget(args[0]);
  if (!normalized || TEST_FILES.indexOf(normalized) === -1) {
    printUsageError("Unknown test file: " + args[0]);
    process.exit(1);
  }

  return [normalized];
}

function runTestFile(file) {
  const filePath = path.join(__dirname, file);
  const result = spawnSync(process.execPath, [filePath], {
    stdio: "inherit"
  });

  if (result.error) {
    throw result.error;
  }

  return result.status === 0;
}

function main() {
  const targets = resolveTargets(process.argv.slice(2));
  let passed = 0;

  if (targets.length === 1) {
    console.log("Running 1 test file: " + targets[0]);
  } else {
    console.log("Running " + targets.length + " test files...");
  }

  targets.forEach(function (file, index) {
    console.log("");
    console.log("=== " + file + " ===");

    const ok = runTestFile(file);
    if (!ok) {
      console.error("");
      console.error("Stopped after failure in " + file + ".");
      console.error("Completed: " + passed + "/" + targets.length + " files passed.");
      process.exit(1);
    }

    passed++;

    if (index === targets.length - 1) {
      console.log("");
    }
  });

  console.log("Completed: " + passed + "/" + targets.length + " files passed.");
}

main();
