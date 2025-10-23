export default async function handler(req, res) {
  try {
    const { query, user_id } = req.body;

    if (!query) return res.status(400).json({ error: "Missing query." });
    if (!user_id) return res.status(400).json({ error: "Missing user_id." });

    const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
    const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

    if (!TAVILY_API_KEY || !CLAUDE_API_KEY) {
      return res.status(500).json({ error: "Missing API keys." });
    }

    // 🔹 1. Tavily Search
    const tavilyResponse = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TAVILY_API_KEY}`,
      },
      body: JSON.stringify({
        query,
        max_results: 5,
      }),
    });

    if (!tavilyResponse.ok) {
      const text = await tavilyResponse.text();
      console.error("Tavily error:", text);
      throw new Error("Tavily search failed");
    }

    const tavilyData = await tavilyResponse.json();
    const results = tavilyData.results || [];

    // 🔹 2. Context for Claude
    const contextText = results.length
      ? results
          .map(
            (r, i) =>
              `${i + 1}) ${r.title}\n${r.content}\nSource: ${r.url}`
          )
          .join("\n\n")
      : "No relevant Tavily results found.";

    // 🔹 3. Claude prompt
    const prompt = `
You are an expert AI assistant.
Base your reasoning ONLY on the context below.

CONTEXT:
${contextText}

QUESTION: ${query}
`;

    // 🔹 4. Claude API call
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!claudeResponse.ok) {
      const text = await claudeResponse.text();
      console.error("Claude error:", text);
      throw new Error("Claude API failed");
    }

    const claudeData = await claudeResponse.json();
    const answer = claudeData?.content?.[0]?.text || "No answer returned.";

    // 🔹 5. Return everything
    res.status(200).json({ results, answer });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Server error occurred." });
  }
}

