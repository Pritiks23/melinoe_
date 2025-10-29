export default async function handler(req, res) {
  const { query, mode } = req.body; // <-- Added mode
  const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
  const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

  if (!query) {
    return res.status(400).json({ error: "Missing query." });
  }

  if (!TAVILY_API_KEY) console.warn("⚠️ Missing Tavily API key");
  if (!CLAUDE_API_KEY) console.warn("⚠️ Missing Claude API key");

  try {
    // 1️⃣ Tavily search
    const tavilyResponse = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TAVILY_API_KEY}`,
      },
      body: JSON.stringify({
        query,
        max_results: 5,
        mode, // <-- pass mode to Tavily if supported
      }),
    });

    if (!tavilyResponse.ok) {
      console.error("Tavily API returned status:", tavilyResponse.status);
      throw new Error("Tavily API error");
    }

    const tavilyData = await tavilyResponse.json();
    const results = tavilyData.results || [];

    // 2️⃣ Build context for Claude
    const contextText = results.length
      ? results.map(
          (r, i) => `${i + 1}) ${r.title}\n${r.content}\nSource: ${r.url}`
        ).join("\n\n")
      : "No relevant Tavily results found.";

    // 3️⃣ Prompt for Claude
    const prompt = `
System: You are an expert AI engineering assistant.
Tone rules: confident, concise, direct. Use active voice.
If uncertain about a fact, quantify uncertainty and give a short plan to verify.
Knowledge mode: ${mode || "Applied"}

Whenever it makes sense, create **static conceptual diagrams** that explain processes, flows, or structures.
Use **ASCII style diagrams** (like ChatGPT) with lines, boxes, and arrows. Do not use numeric or time-varying data.
Do not use Mermaid or Graphviz syntax.

Return the diagram(s) in the "diagrams" field as an array of strings.

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
  "nextSteps": ["string"],
  "diagrams": ["string"]
}

CONTEXT:
${contextText}

QUESTION: ${query}
`;

    // 4️⃣ Claude API call
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
          max_tokens: 2000,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!claudeResponse.ok) {
        console.error("Claude API returned status:", claudeResponse.status);
        throw new Error("Claude API error");
      }

      const claudeData = await claudeResponse.json();
      const rawText = claudeData?.content?.[0]?.text || "{}";

      // ✅ Extract JSON from raw text
      try {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/); // Grab JSON block
        if (jsonMatch) {
          answer = JSON.parse(jsonMatch[0]);
        } else {
          answer = { tldr: rawText };
        }
      } catch (e) {
        console.error("Claude JSON parse error:", e);
        answer = { tldr: rawText };
      }
    } catch (e) {
      console.error("Claude API error:", e);
      answer = { tldr: "Claude summary unavailable." };
    }

    // 5️⃣ Return results
    res.status(200).json({ results, answer, mode });

  } catch (err) {
    console.error("Tavily fetch error:", err);
    res.status(500).json({ error: err.message || "Server error." });
  }
}


