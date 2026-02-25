/**
 * Run Serializer Module
 * Converts board state to a portable JSON-serializable object
 * 
 * @module utils/runSerializer
 */
var algorithmDescriptions = require("./algorithmDescriptions");

function serializeRun(board, success, visitedCount) {
    var timestamp = Date.now();
    var id = "run-" + timestamp;

    return {
        id: id,
        timestamp: timestamp,
        version: "1.0",

        grid: {
            height: board.height,
            width: board.width
        },

        nodes: {
            start: board.start,
            target: board.target
        },

        walls: extractWalls(board),
        weights: extractWeights(board),

        settings: {
            algorithm: board.currentAlgorithm,
            algorithmInternal: board.currentAlgorithm,
            algorithmKey: algorithmDescriptions.getAlgorithmKey(board.currentAlgorithm, board.currentHeuristic),
            heuristic: board.currentHeuristic,
            speed: board.speed,
            weightValue: board.currentWeightValue
        },

        result: {
            found: success === "success!" || success === "success" || success === true,
            pathLength: success ? computePathLength(board) : null,
            pathCost: success ? computePathCost(board) : null,
            nodesVisited: visitedCount
        }
    };
}

function extractWalls(board) {
    var walls = [];
    var ids = Object.keys(board.nodes);
    for (var i = 0; i < ids.length; i++) {
        var id = ids[i];
        if (board.nodes[id].status === "wall") {
            walls.push(id);
        }
    }
    return walls;
}

function extractWeights(board) {
    var weights = [];
    var ids = Object.keys(board.nodes);
    for (var i = 0; i < ids.length; i++) {
        var id = ids[i];
        var node = board.nodes[id];
        if (node.weight > 0 && node.status !== "wall") {
            weights.push({ id: id, value: node.weight });
        }
    }
    return weights;
}

function computePathLength(board) {
    if (board.currentAlgorithm === "bidirectional" &&
        board.shortestPathNodesToAnimate &&
        board.shortestPathNodesToAnimate.length) {
        var length = 0;
        var includesStart = false;
        var includesTarget = false;

        for (var i = 0; i < board.shortestPathNodesToAnimate.length; i++) {
            var node = board.shortestPathNodesToAnimate[i];
            if (node.id === board.start) includesStart = true;
            if (node.id === board.target) includesTarget = true;
            length++;
        }

        if (!includesStart) length++;
        if (!includesTarget) length++;

        return length;
    }

    var length = 0;
    var currentId = board.target;

    while (currentId && currentId !== board.start) {
        length++;
        currentId = board.nodes[currentId].previousNode;
    }

    return currentId === board.start ? length + 1 : 0;
}

function computePathCost(board) {
    if (board.currentAlgorithm === "bidirectional" &&
        board.shortestPathNodesToAnimate &&
        board.shortestPathNodesToAnimate.length) {
        var cost = 0;
        var includesStart = false;
        var includesTarget = false;

        for (var i = 0; i < board.shortestPathNodesToAnimate.length; i++) {
            var node = board.shortestPathNodesToAnimate[i];
            if (node.id === board.start) includesStart = true;
            if (node.id === board.target) includesTarget = true;
            cost += node.weight > 0 ? node.weight : 1;
        }

        if (!includesStart) cost += 1;
        if (!includesTarget) cost += 1;

        return cost;
    }

    var cost = 0;
    var currentId = board.target;

    while (currentId && currentId !== board.start) {
        var node = board.nodes[currentId];
        cost += node.weight > 0 ? node.weight : 1;
        currentId = node.previousNode;
    }

    if (currentId === board.start) {
        cost += 1;
    }

    return cost;
}

module.exports = serializeRun;
