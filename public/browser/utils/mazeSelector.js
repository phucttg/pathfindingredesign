const recursiveDivisionMaze = require("../mazeAlgorithms/recursiveDivisionMaze");
const otherMaze = require("../mazeAlgorithms/otherMaze");
const otherOtherMaze = require("../mazeAlgorithms/otherOtherMaze");
const stairDemonstration = require("../mazeAlgorithms/stairDemonstration");
const mazeGenerationAnimations = require("../animations/mazeGenerationAnimations");

const MAZE_OPTIONS = [
  {
    id: "recursive",
    name: "Recursive Division",
    description: "Classic divide-and-conquer maze with elegant corridors and rooms.",
    icon: "╬"
  },
  {
    id: "vertical",
    name: "Recursive Division (Vertical Skew)",
    description: "Favors vertical passages. Great for testing horizontal pathfinding.",
    icon: "║"
  },
  {
    id: "horizontal",
    name: "Recursive Division (Horizontal Skew)",
    description: "Favors horizontal passages. Tests vertical movement strategies.",
    icon: "═"
  },
  {
    id: "randomWall",
    name: "Basic Random Maze",
    description: "Scattered random walls. Simple and unpredictable.",
    icon: "▒"
  },
  {
    id: "randomWeight",
    name: "Basic Weight Maze",
    description: "Weighted nodes only. Great for cost-based algorithms.",
    icon: "⚖"
  },
  {
    id: "stair",
    name: "Simple Stair Pattern",
    description: "Diagonal staircase pattern that forces frequent turns.",
    icon: "╱"
  },
  {
    id: "free",
    name: "Free (Blank Grid)",
    description: "Start empty and draw your own walls and weights.",
    icon: "✨"
  }
];

function getOptionById(mazeId) {
  for (let i = 0; i < MAZE_OPTIONS.length; i++) {
    if (MAZE_OPTIONS[i].id === mazeId) {
      return MAZE_OPTIONS[i];
    }
  }
  return null;
}

function setButtonsState(board, shouldEnable) {
  if (shouldEnable && !board.buttonsOn) {
    board.toggleButtons();
  } else if (!shouldEnable && board.buttonsOn) {
    board.toggleButtons();
  }
}

function updateSidebarLabel(mazeId) {
  const label = document.getElementById("currentMazeLabel");
  if (!label) return;
  const option = getOptionById(mazeId);
  label.textContent = option ? option.name : "None";
}

function runAnimatedMaze(board, generator, done) {
  setButtonsState(board, false);
  try {
    generator();
  } catch (error) {
    setButtonsState(board, true);
    if (typeof done === "function") done();
    throw error;
  }

  mazeGenerationAnimations(board, function () {
    setButtonsState(board, true);
    if (typeof done === "function") done();
  });
}

function applyMaze(board, mazeId, done) {
  const safeDone = typeof done === "function" ? done : function () { };
  const option = getOptionById(mazeId) || getOptionById("free");
  const selectedId = option.id;

  board.clearWalls();
  updateSidebarLabel(selectedId);

  if (selectedId === "free") {
    setButtonsState(board, true);
    safeDone();
    return;
  }

  if (selectedId === "randomWall") {
    board.createMazeOne("wall");
    setButtonsState(board, true);
    safeDone();
    return;
  }

  if (selectedId === "randomWeight") {
    board.createMazeOne("weight");
    setButtonsState(board, true);
    safeDone();
    return;
  }

  if (selectedId === "recursive") {
    runAnimatedMaze(board, function () {
      recursiveDivisionMaze(board, 2, board.height - 3, 2, board.width - 3, "horizontal", false, "wall");
    }, safeDone);
    return;
  }

  if (selectedId === "vertical") {
    runAnimatedMaze(board, function () {
      otherMaze(board, 2, board.height - 3, 2, board.width - 3, "vertical", false);
    }, safeDone);
    return;
  }

  if (selectedId === "horizontal") {
    runAnimatedMaze(board, function () {
      otherOtherMaze(board, 2, board.height - 3, 2, board.width - 3, "horizontal", false);
    }, safeDone);
    return;
  }

  if (selectedId === "stair") {
    runAnimatedMaze(board, function () {
      stairDemonstration(board);
    }, safeDone);
    return;
  }

  setButtonsState(board, true);
  safeDone();
}

function showOnboardingModal(board, onComplete) {
  const overlay = document.getElementById("mazeOnboardingOverlay");
  const complete = typeof onComplete === "function" ? onComplete : function () { };

  if (!overlay) {
    applyMaze(board, "free", function () {
      complete(board);
    });
    return;
  }

  const grid = overlay.querySelector(".maze-card-grid");
  if (!grid) {
    applyMaze(board, "free", function () {
      complete(board);
    });
    return;
  }

  grid.innerHTML = "";

  MAZE_OPTIONS.forEach(function (option) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "maze-card" + (option.id === "free" ? " maze-card-free" : "");
    card.setAttribute("data-maze-id", option.id);
    card.innerHTML =
      '<div class="maze-card-icon">' + option.icon + "</div>" +
      '<div class="maze-card-name">' + option.name + "</div>" +
      '<div class="maze-card-desc">' + option.description + "</div>";
    card.onclick = function () {
      overlay.classList.add("hidden");
      applyMaze(board, option.id, function () {
        complete(board);
      });
    };
    grid.appendChild(card);
  });

  overlay.classList.remove("hidden");
}

function initSidebarMazeDropup(board) {
  const menu = document.getElementById("mazeDropupMenu");
  if (!menu) return;
  const mazeBtn = document.getElementById("sidebarMazeBtn");
  if (mazeBtn) mazeBtn.disabled = !board.buttonsOn;

  menu.innerHTML = "";
  MAZE_OPTIONS.forEach(function (option) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = "#";
    a.textContent = option.name;
    a.onclick = function (event) {
      event.preventDefault();
      if (!board.buttonsOn) return;
      applyMaze(board, option.id);
      const parentDropup = document.getElementById("sidebarMazeBtn");
      if (parentDropup && parentDropup.parentNode) {
        parentDropup.parentNode.classList.remove("open");
      }
    };
    li.appendChild(a);
    menu.appendChild(li);
  });
}

module.exports = {
  MAZE_OPTIONS: MAZE_OPTIONS,
  setButtonsState: setButtonsState,
  showOnboardingModal: showOnboardingModal,
  applyMaze: applyMaze,
  initSidebarMazeDropup: initSidebarMazeDropup,
  updateSidebarLabel: updateSidebarLabel
};
