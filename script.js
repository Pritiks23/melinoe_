import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { query, user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: "User ID required" });
  }

  // Load user queries
  const filePath = path.join(process.cwd(), "user_queries.json");
  let userQueries = {};
  try {
    userQueries = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    console.error("Error reading user_queries.json:", err);
    return res.status(500).json({ error: "Server error" });
  }

  // Check user existence and remaining queries
  const user = userQueries[user_id];
  if (!user) {
    return res.status(403).json({ error: "Invalid User ID" });
  }
  if (user.used_queries >= user.max_queries) {
    return res.status(403).json({ error: "❌ You have reached your query limit. Please upgrade to continue." });
  }

  // Environment keys
  const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
  const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

  try {
    // 1️⃣ Tavily search
    const tavilyResponse = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TAVILY_API_KEY}`,
      },
      body: JSON.stringify({ query, max_results: 5 }),
    });

    const tavilyData = await tavilyResponse.json();
    const results = tavilyData.results || [];

    // 2️⃣ Context for Claude
    const contextText = results.length
      ? results.map((r, i) => `${i + 1}) ${r.title}\n${r.content}\nSource: ${r.url}`).join("\n\n")
      : "No relevant Tavily results found.";

    // 3️⃣ Prompt for Claude
    const prompt = `
System: You are an expert AI engineering assistant.
Tone rules: confident, concise, direct. Use active voice.
If uncertain about a fact, quantify uncertainty and give a short plan to verify.

Respond using ONLY the sources listed in 'evidence' unless explicitly marked speculation.
Output must match this exact JSON schema:
Output only valid JSON. Do not wrap the JSON in markdown, code fences, or strings. Each key must be top-level.
{
  "intent": "string",
  "confidence": "string",
  "tldr": "string",
  "short": "string",
  "why": "string",
  "implementation": "string",
  "test": "string",
  "alternatives": ["string"],
  "caveats": ["string"],
  "cost": "string",
  "sources": [{"title":"", "url":"", "note":""}],
  "nextSteps": ["string"]
}

CONTEXT:
${contextText}

QUESTION: ${query}
`;

    // 4️⃣ Claude call
    let answer = {};
    try {
      const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": CLAUDE_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 1500,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const claudeData = await claudeResponse.json();
      const rawText = claudeData?.content?.[0]?.text || "{}";

      try {
        answer = JSON.parse(rawText);
      } catch {
        answer = { tldr: rawText || "Claude response parse failed." };
      }
    } catch (e) {
      console.error("Claude API error:", e);
      answer = { tldr: "Claude summary unavailable." };
    }

    // 5️⃣ Update user queries
    user.used_queries += 1;
    try {
      fs.writeFileSync(filePath, JSON.stringify(userQueries, null, 2), "utf8");
    } catch (err) {
      console.error("Error updating user_queries.json:", err);
    }

    res.status(200).json({ results, answer });

  } catch (err) {
    console.error("Tavily fetch error:", err);
    res.status(500).json({ error: "Server error." });
  }
}

