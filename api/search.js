export default async function handler(req, res) {
  const { query, mode = "applied", visualize = "none" } = req.body;
  const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
  const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

  try {
    // Tavily search
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

    // Mode-specific prompt
    const modeInstruction =
      mode === "beginner"
        ? "Explain step-by-step as if teaching a new developer. Focus on clarity and basics."
        : mode === "applied"
        ? "Explain practical implementation and optimization details."
        : "Provide a deep, research-oriented explanation with citations and emerging insights.";

    const visInstruction =
      visualize === "metrics"
        ? "Include key real-world metrics or benchmarks if relevant."
        : visualize === "diagram"
        ? "Describe conceptual relationships using simple diagrammatic text."
        : "";

    // Claude prompt
    const prompt = `
System: You are an expert AI assistant for software engineers.
You produce structured, clear, and accurate answers based on the user's mode and visualization type.

Mode: ${mode}
Visualization: ${visualize}
Instructions: ${modeInstruction} ${visInstruction}

Use only the sources below to answer.

Return JSON strictly in this format:
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

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const claudeData = await claudeResponse.json();
    const rawText = claudeData?.content?.[0]?.text || "{}";

    let answer = {};
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) answer = JSON.parse(jsonMatch[0]);
      else answer = { tldr: rawText };
    } catch (err) {
      console.error("Parse error:", err);
      answer = { tldr: rawText };
    }

    res.status(200).json({ results, answer });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Server error occurred." });
  }
}

