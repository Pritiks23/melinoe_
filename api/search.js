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
  try {
    const { query } = req.body;

    const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
    const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

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

    if (!tavilyData.results || tavilyData.results.length === 0) {
      return res.status(200).json({ answer: { tldr: "No search results found." } });
    }

    // 2️⃣ Prepare context for Claude
    const contextText = tavilyData.results
      .map((r, i) => `${i + 1}) ${r.title}\n${r.content}\nSource: ${r.url}`)
      .join("\n\n");

    // 3️⃣ Ask Claude to format the output
    const prompt = `
You are an AI research summarizer. Using the information below, answer the user’s query in this structured JSON format:

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

EVIDENCE:
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
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const claudeData = await claudeResponse.json();

    // 4️⃣ Parse Claude’s text into JSON
    let answer = {};
    try {
      const rawText = claudeData.content?.[0]?.text || "{}";
      answer = JSON.parse(rawText);
    } catch {
      answer = { tldr: claudeData.content?.[0]?.text || "No structured answer." };
    }

    // 5️⃣ Return clean response
    return res.status(200).json({ answer });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
}
