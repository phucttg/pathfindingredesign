const assert = require("assert");
const AnimationController = require("../public/browser/animations/animationController");
const { runScenarioAsync } = require("./testHelpers");

function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

async function testPauseStepAndResume() {
  const controller = new AnimationController();
  const frames = [];
  let completed = 0;
  let resolveFirstFrame;
  const firstFramePromise = new Promise(function (resolve) {
    resolveFirstFrame = resolve;
  });

  controller.start(
    2,
    20,
    function (index) {
      frames.push(index);
      if (index === 0 && resolveFirstFrame) {
        resolveFirstFrame();
        resolveFirstFrame = null;
      }
    },
    function () {
      completed++;
    },
    "exploring"
  );

  assert.strictEqual(controller.speed, 20, "Controller should store the configured playback speed");

  await firstFramePromise;
  controller.pause();

  assert.deepStrictEqual(frames, [0], "The first frame should fire before pause is applied");
  assert.strictEqual(controller.isPaused, true, "Controller should enter paused state");

  await sleep(35);
  assert.deepStrictEqual(frames, [0], "No additional frames should run while paused");

  controller.stepForward();
  assert.deepStrictEqual(frames, [0, 1], "Step forward should advance exactly one frame");
  assert.strictEqual(controller.isPaused, true, "Step forward should keep the controller paused");

  controller.resume();
  await sleep(40);

  assert.deepStrictEqual(frames, [0, 1, 2], "Resume should continue playback until the final frame");
  assert.strictEqual(completed, 1, "Completion callback should fire exactly once");
  assert.strictEqual(controller.phase, "done", "Controller should finish in done state");
}

async function run() {
  await runScenarioAsync("Pause, step, resume, and complete playback", testPauseStepAndResume);
  console.log("Completed animationController.test.js");
}

run().catch(function (error) {
  console.error(error);
  process.exit(1);
});
