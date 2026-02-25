var algorithmDescriptions = require("./algorithmDescriptions");

function escapeHTML(value) {
  return String(value === undefined || value === null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function completeLabel(value) {
  if (value === true) return "Complete";
  if (value === false) return "Incomplete";
  return "Variant dependent";
}

function yesNoLabel(value) {
  return value ? "Yes" : "No";
}

function renderListItems(items, normalizeStepPrefix) {
  if (!items || !items.length) {
    return '<li>No items available.</li>';
  }
  return items.map(function (item) {
    var text = String(item);
    if (normalizeStepPrefix) {
      text = text.replace(/^\s*\d+\.\s*/, "");
    }
    return "<li>" + escapeHTML(text) + "</li>";
  }).join("");
}

function showAlgorithmInfo(algorithmKey) {
  var data = algorithmDescriptions.descriptions[algorithmKey];
  if (!data) return;

  // Remove old modal if it exists
  var old = document.getElementById("algorithmInfoModal");
  if (old && old.parentNode) old.parentNode.removeChild(old);

  var characteristics = data.characteristics || {};
  var html = '<div class="modal fade dark-stage" id="algorithmInfoModal" tabindex="-1">' +
    '<div class="modal-dialog modal-lg">' +
    '<div class="modal-content algo-modal-content">' +
    '<div class="modal-header">' +
    '<button type="button" class="close" data-dismiss="modal">&times;</button>' +
    '<h4 class="modal-title">' + escapeHTML(data.name) + '</h4>' +
    '<div class="algo-modal-meta">' +
    '<span class="badge">' + escapeHTML(data.category === "weighted" ? "Weighted" : "Unweighted") + '</span>' +
    '<span class="badge">' + (data.guaranteesOptimal ? "Shortest path guaranteed" : "No shortest-path guarantee") + '</span>' +
    '<span class="badge">' + completeLabel(data.complete) + '</span>' +
    '<span class="badge">' + (characteristics.usesHeuristic ? "Heuristic" : "No heuristic") + '</span>' +
    '</div>' +
    '<div class="algo-modal-divider" aria-hidden="true"></div>' +
    '</div>' +
    '<div class="modal-body">' +
    '<p>' + escapeHTML(data.shortDescription) + '</p>' +
    '<h5>How It Works</h5><ol>' +
    renderListItems(data.howItWorks || [], true) +
    '</ol>' +
    '<h5>Pseudocode</h5><pre class="algo-pseudocode">' +
    (data.pseudocode || []).map(escapeHTML).join("\n") +
    '</pre>' +
    '<div class="algo-insight"><strong>Key Insight:</strong> ' + escapeHTML(data.keyInsight) + '</div>' +
    '<h5>Characteristics</h5>' +
    '<table class="table table-condensed">' +
    '<tr><td>Data Structure</td><td>' + escapeHTML(characteristics.dataStructure) + '</td></tr>' +
    '<tr><td>Time Complexity</td><td>' + escapeHTML(characteristics.timeComplexity) + '</td></tr>' +
    '<tr><td>Space Complexity</td><td>' + escapeHTML(characteristics.spaceComplexity) + '</td></tr>' +
    '<tr><td>Uses Heuristic</td><td>' + yesNoLabel(characteristics.usesHeuristic) + '</td></tr>' +
    '<tr><td>Selection Rule</td><td>' + escapeHTML(characteristics.selectionRule) + '</td></tr>' +
    '<tr><td>Best For</td><td>' + escapeHTML(characteristics.bestFor) + '</td></tr>' +
    '<tr><td>Weakness</td><td>' + escapeHTML(characteristics.weakness) + '</td></tr>' +
    '<tr><td>Grid Weight Notes</td><td>' + escapeHTML(characteristics.notesOnGridWeights) + '</td></tr>' +
    '</table>' +
    '<h5>Common Pitfalls</h5>' +
    '<ul class="algo-pitfalls">' + renderListItems(data.pitfalls) + '</ul>' +
    '<h5>Visual Behavior</h5>' +
    '<ul class="algo-visual-behavior">' + renderListItems(data.visualBehavior) + '</ul>' +
    '</div>' +
    '<div class="modal-footer">' +
    '<button type="button" class="btn btn-default" data-dismiss="modal">Got it!</button>' +
    '</div>' +
    '</div></div></div>';

  var wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  var modal = wrapper.firstChild;
  document.body.appendChild(modal);

  $(modal).modal("show");

  $(modal).on("hidden.bs.modal", function () {
    if (modal.parentNode) modal.parentNode.removeChild(modal);
  });
}

module.exports = { showAlgorithmInfo: showAlgorithmInfo };
