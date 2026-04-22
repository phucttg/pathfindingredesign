const assert = require("assert");
const { descriptions } = require("../public/browser/utils/algorithmDescriptions");
const { runScenario } = require("./testHelpers");

const REQUIRED_ALGORITHMS = [
  "dijkstra",
  "astar",
  "greedy",
  "swarm",
  "convergentSwarm",
  "bidirectional",
  "bfs",
  "dfs"
];

const REQUIRED_FIELDS = [
  "name",
  "shortDescription",
  "category",
  "guaranteesOptimal",
  "complete",
  "howItWorks",
  "pseudocode",
  "keyInsight",
  "pitfalls",
  "visualBehavior",
  "characteristics"
];

const REQUIRED_CHARACTERISTICS = [
  "dataStructure",
  "timeComplexity",
  "spaceComplexity",
  "usesHeuristic",
  "selectionRule",
  "bestFor",
  "weakness",
  "notesOnGridWeights"
];

function validateAlgorithmObject(key) {
  const data = descriptions[key];
  assert.ok(data, `Missing algorithm object: ${key}`);

  REQUIRED_FIELDS.forEach((field) => {
    assert.ok(Object.prototype.hasOwnProperty.call(data, field), `Missing field '${field}' in ${key}`);
  });

  assert.ok(Array.isArray(data.howItWorks), `${key}.howItWorks must be an array`);
  assert.ok(Array.isArray(data.pseudocode), `${key}.pseudocode must be an array`);
  assert.ok(Array.isArray(data.pitfalls), `${key}.pitfalls must be an array`);
  assert.ok(Array.isArray(data.visualBehavior), `${key}.visualBehavior must be an array`);
  assert.ok(typeof data.characteristics === "object" && data.characteristics !== null, `${key}.characteristics must be an object`);

  REQUIRED_CHARACTERISTICS.forEach((field) => {
    assert.ok(
      Object.prototype.hasOwnProperty.call(data.characteristics, field),
      `Missing characteristics field '${field}' in ${key}`
    );
  });
}

function run() {
  runScenario("All required algorithm objects and fields are present", function () {
    REQUIRED_ALGORITHMS.forEach(validateAlgorithmObject);
  });
  console.log("Completed algorithmDescriptionsSchema.test.js");
}

run();
