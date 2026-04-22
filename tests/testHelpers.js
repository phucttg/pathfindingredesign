function logPass(name) {
  console.log("[PASS] " + name);
}

function logFail(name, error) {
  console.error("[FAIL] " + name);
  if (error && error.stack) {
    console.error(error.stack);
  } else if (error) {
    console.error(String(error));
  }
}

function runScenario(name, fn) {
  try {
    fn();
    logPass(name);
  } catch (error) {
    logFail(name, error);
    throw error;
  }
}

async function runScenarioAsync(name, fn) {
  try {
    await fn();
    logPass(name);
  } catch (error) {
    logFail(name, error);
    throw error;
  }
}

function withMutedConsole(methods, fn) {
  var names = methods || ["log", "error"];
  var originals = {};

  names.forEach(function (name) {
    originals[name] = console[name];
    console[name] = function () {};
  });

  function restore() {
    names.forEach(function (name) {
      console[name] = originals[name];
    });
  }

  try {
    var result = fn();
    if (result && typeof result.then === "function") {
      return result.then(
        function (value) {
          restore();
          return value;
        },
        function (error) {
          restore();
          throw error;
        }
      );
    }
    restore();
    return result;
  } catch (error) {
    restore();
    throw error;
  }
}

module.exports = {
  runScenario: runScenario,
  runScenarioAsync: runScenarioAsync,
  withMutedConsole: withMutedConsole
};
