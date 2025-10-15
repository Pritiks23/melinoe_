// export default async function handler(req, res) {
//   const { query } = req.body;
//   const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

//   const response = await fetch("https://api.tavily.com/search", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${TAVILY_API_KEY}`,
//     },
//      body: JSON.stringify({ query, max_results: 5 }),

//   });

//   const data = await response.json();
//   res.status(200).json(data);
// }

export default async function handler(req, res) {
  const { query } = req.body;
  const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
  const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

  try {
    // 1️⃣ Fetch Tavily results (exactly like your working version)
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

    // 2️⃣ Prepare Claude prompt (if results exist, include them; else just query)
    const contextText = results.length
      ? results.map((r, i) => `${i + 1}) ${r.title}\n${r.content}\nSource: ${r.url}`).join("\n\n")
      : "No relevant Tavily results found.";

    const prompt = `
You are an expert AI/ML assistant for developers.
Using the following context, answer the user’s question in structured JSON:

{
  "tldr": "string",
  "short": "string",
  "why": "string",
  "implementation": "string",
  "test": "string",
  "alternatives": ["string"],
  "caveats": ["string"],
  "sources": [{"title":"", "url":"", "note":""}],
  "nextSteps":["string"]
}

CONTEXT:
${contextText}

QUESTION: ${query}
`;

    // 3️⃣ Call Claude API
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
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const claudeData = await claudeResponse.json();
      const rawText = claudeData?.completion?.[0]?.text || claudeData?.content?.[0]?.text || "{}";

      try {
        answer = JSON.parse(rawText);
      } catch {
        answer = { tldr: rawText || "Claude summary failed." };
      }
    } catch (e) {
      console.error("Claude API error:", e);
      answer = { tldr: "Claude summary unavailable." };
    }

    // 4️⃣ Return both Tavily results and Claude answer
    res.status(200).json({ results, answer });

  } catch (err) {
    console.error("Tavily fetch error:", err);
    res.status(500).json({ error: "Server error." });
  }
}


