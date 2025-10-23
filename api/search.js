import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  const { query, user_id } = req.body;

  if (!query || !user_id) {
    return res.status(400).json({ error: "Missing query or user_id." });
  }

  // Path to your user_queries.json
  const filePath = path.join(process.cwd(), "user_queries.json");
  let userQueries;

  try {
    const fileData = fs.readFileSync(filePath, "utf8");
    userQueries = JSON.parse(fileData);
  } catch {
    return res.status(500).json({ error: "Failed to read user data." });
  }

  // Check user
  const user = userQueries[user_id];
  if (!user) {
    return res.status(403).json({ error: "User ID not found." });
  }

  if (user.used_queries >= user.max_queries) {
    return res.status(403).json({ error: "Query limit reached." });
  }

  const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
  const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

  try {
    // Tavily Search
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

    const contextText = results.length
      ? results.map((r, i) => `${i + 1}) ${r.title}\n${r.content}\nSource: ${r.url}`).join("\n\n")
      : "No relevant Tavily results found.";

    // Claude prompt
    const prompt = `
System: You are an expert AI engineering assistant.
Respond using ONLY the sources listed below.

CONTEXT:
${contextText}

QUESTION: ${query}
`;

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const claudeData = await claudeResponse.json();
    const answer = claudeData?.content?.[0]?.text || "No answer from Claude.";

    // ✅ Update user usage
    user.used_queries += 1;
    fs.writeFileSync(filePath, JSON.stringify(userQueries, null, 2));

    res.status(200).json({ results, answer, used: user.used_queries, max: user.max_queries });

  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Server error occurred." });
  }
}

