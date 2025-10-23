import fs from "fs";
import path from "path";

const JSON_PATH = path.join(process.cwd(), "user_queries.json");

// --- Helper functions ---
function loadUsers() {
  if (fs.existsSync(JSON_PATH)) {
    return JSON.parse(fs.readFileSync(JSON_PATH, "utf-8"));
  }
  return {};
}

function saveUsers(users) {
  fs.writeFileSync(JSON_PATH, JSON.stringify(users, null, 2));
}

function canQuery(userId) {
  const users = loadUsers();
  const user = users[userId];
  return user && user.used_queries < user.max_queries;
}

function recordQuery(userId) {
  const users = loadUsers();
  if (!users[userId] || users[userId].used_queries >= users[userId].max_queries) return false;
  users[userId].used_queries += 1;
  saveUsers(users);
  return true;
}

function addUser(userId, tier = "Starter") {
  const tierLimits = { Starter: 0, Pro: 0, Team: 0 }; // all start with 0 queries
  const users = loadUsers();
  if (!users[userId]) {
    users[userId] = {
      tier,
      max_queries: tierLimits[tier] || 0,
      used_queries: 0
    };
    saveUsers(users);
  }
}

// --- API handler ---
export default async function handler(req, res) {
  const { query, user_id } = req.body; // user_id required
  if (!user_id) return res.status(400).json({ error: "user_id is required." });

  addUser(user_id); // auto-add if new user with 0 queries

  if (!canQuery(user_id)) {
    return res.status(403).json({ 
      error: "No queries available. Please upgrade your plan." 
    });
  }

  const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
  const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

  try {
    // --- Tavily search ---
    const tavilyResponse = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TAVILY_API_KEY}`
      },
      body: JSON.stringify({ query, max_results: 5 })
    });
    const tavilyData = await tavilyResponse.json();
    const results = tavilyData.results || [];

    // --- Context for Claude ---
    const contextText = results.length
      ? results.map((r, i) => `${i + 1}) ${r.title}\n${r.content}\nSource: ${r.url}`).join("\n\n")
      : "No relevant Tavily results found.";

    // --- Prompt for Claude ---
    const prompt = `
System: You are an expert AI engineering assistant.
Tone rules: confident, concise, direct.
Respond using ONLY the sources listed in 'evidence'.
Output only valid JSON with keys: intent, confidence, tldr, short, why, implementation, test, alternatives, caveats, cost, sources, nextSteps.

CONTEXT:
${contextText}

QUESTION: ${query}
`;

    // --- Claude call ---
    let answer = {};
    try {
      const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": CLAUDE_API_KEY,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 1500,
          messages: [{ role: "user", content: prompt }]
        })
      });

      const claudeData = await claudeResponse.json();
      const rawText = claudeData?.content?.[0]?.text || "{}";
      try { answer = JSON.parse(rawText); } 
      catch { answer = { tldr: rawText || "Claude response parse failed." }; }
    } catch (e) {
      console.error("Claude API error:", e);
      answer = { tldr: "Claude summary unavailable." };
    }

    // --- Record query usage ---
    recordQuery(user_id);

    res.status(200).json({ results, answer });

  } catch (err) {
    console.error("Tavily fetch error:", err);
    res.status(500).json({ error: "Server error." });
  }
}


