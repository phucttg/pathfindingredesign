require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const app = express();
const LANGUAGE_POLICY = "english";

// === SECURITY HEADERS ===
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "https://ajax.googleapis.com",
        "https://maxcdn.bootstrapcdn.com"
      ],
      styleSrc: [
        "'self'",
        "https://maxcdn.bootstrapcdn.com",
        "'unsafe-inline'"
      ],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://maxcdn.bootstrapcdn.com"],
      objectSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// === RATE LIMITING ===
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    error: "Too many requests. Please wait before requesting another explanation.",
    retryAfter: "15 minutes"
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    console.warn("[Rate Limit] IP exceeded limit:", req.ip);
    res.status(options.statusCode).json(options.message);
  }
});

// === BODY PARSING ===
app.use(express.json());
app.use("/public", express.static(__dirname + "/public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.post("/api/explain", apiLimiter, async (req, res) => {
  const digest = req.body;

  if (!digest || !digest.algorithmKey || typeof digest.visitedCount !== "number") {
    console.error("[AI Explain] Invalid digest received:", digest);
    return res.status(400).json({
      error: "Invalid digest: missing algorithmKey or visitedCount",
      explanation: null
    });
  }

  console.log("[AI Explain] Received digest for:", digest.algorithmKey);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "sk-your-api-key-here") {
    console.warn("[AI Explain] No valid OPENAI_API_KEY found, using fallback");
    return res.json({
      explanation: generateFallback(digest),
      source: "fallback"
    });
  }

  try {
    const explanation = await callOpenAI(apiKey, digest);
    console.log("[AI Explain] Successfully generated explanation");
    res.json({ explanation: explanation, source: "ai" });
  } catch (error) {
    console.error("[AI Explain] OpenAI API error:", error.message);
    res.json({
      explanation: generateFallback(digest),
      source: "fallback"
    });
  }
});

async function callOpenAI(apiKey, digest) {
  const prompt = buildPrompt(digest);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + apiKey
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: buildSystemPrompt()
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 150
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || "HTTP " + response.status;
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

function buildPrompt(digest) {
  const algoName = formatAlgorithmName(digest.algorithmKey);
  const meta = digest.meta || {};

  let prompt = "Summarize this pathfinding run in exactly 5 sentences. " +
    "Include one sentence that starts with 'If' and describes a counterfactual. " +
    "You must mention visited count, grid coverage percent, path length, straight-line distance, detour steps (or say no detour), wall count, weight nodes on grid, and weight nodes in the final path.\n\n";

  prompt += "Language policy: " + LANGUAGE_POLICY + "\n";

  prompt += "Algorithm: " + algoName + "\n";
  prompt += "Algorithm type: " + (meta.algorithmFamily || "unknown") + "\n";
  prompt += "Guarantees shortest path: " + (meta.guaranteesOptimal ? "yes" : "no") + "\n";
  if (meta.complete !== undefined && meta.complete !== null) {
    prompt += "Complete: " + formatComplete(meta.complete) + "\n";
  }

  if (meta.selectionRule) {
    prompt += "How it picks nodes: " + meta.selectionRule + "\n";
  }
  if (meta.bestFor) {
    prompt += "Best use case: " + meta.bestFor + "\n";
  }
  if (meta.weakness) {
    prompt += "Known weakness: " + meta.weakness + "\n";
  }

  prompt += "\n";
  prompt += "Start position: " + digest.start + "\n";
  prompt += "Target position: " + digest.target + "\n";
  prompt += "Total nodes checked: " + digest.visitedCount + "\n";
  prompt += "Final path length: " + digest.pathLength + " steps\n";

  if (typeof digest.directDistance === "number") {
    prompt += "Straight-line distance: " + digest.directDistance + " steps\n";
  }

  if (typeof digest.detourSteps === "number") {
    prompt += "Detour steps: " + digest.detourSteps + "\n";
  }

  if (typeof digest.visitedPercent === "number") {
    prompt += "Grid coverage: " + digest.visitedPercent + "% of cells checked\n";
  }

  if (digest.wallCount > 0) {
    prompt += "Walls blocking the way: " + digest.wallCount + "\n";
  }

  if (typeof digest.weightCount === "number") {
    prompt += "Weight nodes on grid: " + digest.weightCount + "\n";
    prompt += "Weight nodes in final path: " + (digest.weightsInPath || 0) + "\n";
  }

  if (digest.pathSample && digest.pathSample.length > 0) {
    prompt += "\nPath taken: " + digest.pathSample.join(" → ") + "\n";
  }

  return prompt;
}

function formatAlgorithmName(key) {
  const names = {
    dijkstra: "Dijkstra's Algorithm",
    astar: "A* Search",
    greedy: "Greedy Best-first Search",
    CLA: "Swarm Algorithm",
    swarm: "Swarm Algorithm",
    convergentSwarm: "Convergent Swarm Algorithm",
    "convergent swarm": "Convergent Swarm Algorithm",
    bidirectional: "Bidirectional Swarm",
    bfs: "Breadth-first Search",
    dfs: "Depth-first Search"
  };
  return names[key] || key;
}

function formatComplete(value) {
  if (value === true) return "yes";
  if (value === false) return "no";
  return "variant-dependent";
}

function buildSystemPrompt() {
  if (LANGUAGE_POLICY !== "english") {
    return "You are an educational assistant explaining pathfinding algorithms to beginners.\n\nSTRICT RULES:\n1. Output EXACTLY 5 sentences.\n2. One sentence must start with \"If\" and describe a counterfactual.\n3. Use plain beginner-friendly wording and avoid heavy jargon.\n4. ONLY use facts from the provided digest. Never invent numbers or steps.\n5. Describe what happened in THIS run, not how the algorithm works in general.\n6. Do NOT give advice, tips, or suggestions.\n7. Start with what the algorithm did, then describe the result.\n8. You MUST explicitly mention these numbers: visited count, grid coverage percent, path length, straight-line distance, detour steps (or say no detour), wall count, weight nodes on grid, and weight nodes in the final path.";
  }
  return "You are an educational assistant explaining pathfinding algorithms to beginners.\n\nSTRICT RULES:\n1. Output EXACTLY 5 sentences.\n2. One sentence must start with \"If\" and describe a counterfactual.\n3. Use simple English (Feynman-level). NO jargon like \"heuristic\", \"priority queue\", \"relaxation\", \"frontier\".\n4. ONLY use facts from the provided digest. Never invent numbers or steps.\n5. Describe what happened in THIS run, not how the algorithm works in general.\n6. Do NOT give advice, tips, or suggestions.\n7. Start with what the algorithm did, then describe the result.\n8. You MUST explicitly mention these numbers: visited count, grid coverage percent, path length, straight-line distance, detour steps (or say no detour), wall count, weight nodes on grid, and weight nodes in the final path.";
}

function generateFallback(digest) {
  const algoName = formatAlgorithmName(digest.algorithmKey);
  const lines = [];

  const visitedPercentText = typeof digest.visitedPercent === "number"
    ? digest.visitedPercent
    : 0;

  const directDistance = typeof digest.directDistance === "number" ? digest.directDistance : 0;
  const detourSteps = typeof digest.detourSteps === "number"
    ? digest.detourSteps
    : Math.max(0, digest.pathLength - directDistance);

  lines.push("The " + algoName + " explored " + digest.visitedCount +
    " cells (" + visitedPercentText + "% of the grid) before finding the target.");

  lines.push("The final path uses " + digest.pathLength + " steps, while a straight line would take " +
    directDistance + " steps, so the detour is " + detourSteps + " steps.");

  lines.push("There are " + digest.wallCount + " wall(s) and " + digest.weightCount +
    " weight node(s) on the grid.");

  lines.push("The final path goes through " + (digest.weightsInPath || 0) + " weight node(s).");

  lines.push("If walls or weights were removed, the path would be shorter or cheaper.");

  return lines.join(" ");
}

const PORT = process.env.PORT || 1337;

app.listen(PORT, () => {
  console.log("=".repeat(50));
  console.log("Pathfinding Visualizer Server");
  console.log("=".repeat(50));
  console.log("Server running at: http://localhost:" + PORT);
  console.log("");

  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "sk-your-api-key-here") {
    console.log("✓ OPENAI_API_KEY detected — AI explanations enabled");
  } else {
    console.log("⚠ No OPENAI_API_KEY — fallback explanations only");
    console.log("  To enable AI: Add your key to .env file");
  }

  console.log("=".repeat(50));
});
