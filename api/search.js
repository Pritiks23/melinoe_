export default async function handler(req, res) {
  const { query, mode } = req.body;
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
      body: JSON.stringify({
        query,
        max_results: 5,
        mode
      }),
    });

    const tavilyData = await tavilyResponse.json();
    const results = tavilyData.results || [];

    // 2️⃣ Build context for Claude
    const contextText = results.length
      ? results.map((r, i) => `${i + 1}) ${r.title}\n${r.content}\nSource: ${r.url}`).join("\n\n")
      : "No relevant Tavily results found.";

    // 3️⃣ Claude prompt — STRICT JSON STRUCTURE
    const prompt = `
System: You are an expert AI engineering assistant.
Tone: Confident, concise, structured, direct. Use active voice.
If uncertain, state uncertainty and propose how to verify.

Knowledge mode: ${mode || "Applied"}

Always return every field in the schema below. If something is unknown, infer a likely answer instead of writing "N/A".

Whenever it helps explain something, create **static conceptual ASCII diagrams** that describe flows, architectures, or relationships. Return them as plain text (no Markdown, Mermaid, or Graphviz).

OUTPUT REQUIREMENTS:
Return ONLY valid JSON, no markdown fences, no prose outside JSON. Output must strictly follow this schema:

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
  "sources": [{"title": "string", "url": "string", "note": "string"}],
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

      const claudeData = await claudeResponse.json();
      const rawText = claudeData?.content?.[0]?.text || "{}";

      // ✅ Extract and parse JSON safely
      try {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
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

    res.status(200).json({ results, answer, mode });
  } catch (err) {
    console.error("Tavily fetch error:", err);
    res.status(500).json({ error: "Server error." });
  }
}

