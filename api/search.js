// pages/api/search.js
export default async function handler(req, res) {
  const { query } = req.body;
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
      }),
    });

    const tavilyData = await tavilyResponse.json();
    const results = tavilyData.results || [];

    // 2️⃣ Context for Claude
    const contextText = results.length
      ? results
          .map(
            (r, i) =>
              `${i + 1}) ${r.title}\n${r.content}\nSource: ${r.url}`
          )
          .join("\n\n")
      : "No relevant Tavily results found.";

    // 3️⃣ Prompt for Claude
    const prompt = `
System: You are an expert AI engineering assistant.
Tone rules: confident, concise, direct. Use active voice.
If uncertain about a fact, quantify uncertainty and give a short plan to verify.

Respond using ONLY the sources listed in 'evidence' unless explicitly marked speculation.
Output must match this exact JSON schema:
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

Template instructions:
1. Intent: Explain in 10 words or less.
2. Confidence: ★★★★☆ (explain reasoning briefly)
3. TL;DR — One-line answer
4. Short answer — 2–4 concise sentences
5. Why — Explain evidence and logic (2–4 sentences)
6. Implementation — Provide **detailed, copy-paste-ready code examples or commands**, include multiple scenarios if relevant (images, video, different languages, CLI). Clearly comment code. Be thorough and actionable.
7. Quick test / verification — Commands or unit tests to validate results.
8. Alternatives & tradeoffs — 3 bullets max
9. Caveats & risks — Where solution fails or what to watch for
10. Performance / cost impact — Rough cost/time/scale notes
11. Sources — 2–5 ranked (title + URL + why it matters)
12. Next steps — 1–3 immediate actionable steps

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

    res.status(200).json({ results, answer });
  } catch (err) {
    console.error("Tavily fetch error:", err);
    res.status(500).json({ error: "Server error." });
  }
}

