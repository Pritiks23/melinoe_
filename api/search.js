// api/search.js
export default async function handler(req, res) {
  const { query, mode } = req.body; // <-- includes mode
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
        mode // <-- pass mode if Tavily supports it
      }),
    });

    const tavilyData = await tavilyResponse.json();
    const results = tavilyData.results || [];

    // 2️⃣ Build context for Claude
    const contextText = results.length
      ? results.map((r, i) => `${i + 1}) ${r.title}\n${r.content}\nSource: ${r.url}`).join("\n\n")
      : "No relevant Tavily results found.";

    // 3️⃣ Prompt for Claude (⬅️ fixed version)
    const prompt = `
System: You are an expert AI engineering assistant.
Tone rules: confident, concise, direct. Use active voice.
If uncertain about a fact, quantify uncertainty and give a short plan to verify.
Knowledge mode: ${mode || "Applied"}

Whenever it makes sense, create **static conceptual diagrams** that explain processes, flows, or structures.
Use **ASCII style diagrams** (like ChatGPT) with lines, boxes, and arrows. Do not use numeric or time-varying data.
Do not use Mermaid or Graphviz syntax.

Return the diagram(s) in the "diagrams" field as an array of strings.

Fill each field based on the question and retrieved context:
- "intent": classify what kind of query this is (e.g., concept_explanation, comparison, implementation, workflow, design, evaluation, or other).
- "confidence": estimate confidence level (High, Medium, Low).
- "tldr": 1-sentence summary of the core answer.
- "short": 2–3 sentence concise answer.
- "why": explain why that answer is true.
- "implementation": describe how to implement or apply the concept.
- "test": how to verify or test it quickly.
- "alternatives": list other valid approaches or perspectives.
- "caveats": note assumptions, risks, or limitations.
- "cost": summarize performance, time, or financial cost implications.
- "sources": fill with 2–3 short structured entries summarizing context sources.
- "nextSteps": list follow-up actions or learning paths.
- "diagrams": include ASCII-style conceptual diagrams if applicable.

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

      // 🧩 Safety net fallback
      if (!answer.intent || answer.intent === "Unknown") {
        answer.intent = "general_explanation";
        answer.confidence = "Medium";
      }

    } catch (e) {
      console.error("Claude API error:", e);
      answer = { tldr: "Claude summary unavailable." };
    }

    // 5️⃣ Send final response
    res.status(200).json({ results, answer, mode }); // <-- include mode in response

  } catch (err) {
    console.error("Tavily fetch error:", err);
    res.status(500).json({ error: "Server error." });
  }
}
