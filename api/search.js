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


// new code:
export default async function handler(req, res) {
  const { query } = req.body;
  const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
  const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

  try {
    // 1️⃣ Fetch Tavily results
    const tavilyRes = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TAVILY_API_KEY}`,
      },
      body: JSON.stringify({ query, max_results: 5 }),
    });
    const tavilyData = await tavilyRes.json();

    // Extract only relevant titles + snippets
    const tavilySnippets = (tavilyData.results || [])
      .map(r => `${r.title}: ${r.snippet}`)
      .join("\n");

    // 2️⃣ Prepare prompt for Claude
    const prompt = `
You are an authoritative AI/ML assistant for developers.
Take the following research snippets and produce a structured answer:

Return JSON with these fields: tldr, why, implementation, test, sources (array of {title, url}).

Data:
${tavilySnippets}
`;

    // 3️⃣ Call Claude API
    const claudeRes = await fetch("https://api.anthropic.com/v1/complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${CLAUDE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "claude-3.0",
        prompt,
        max_tokens_to_sample: 1200,
        temperature: 0
      }),
    });

    const claudeData = await claudeRes.json();

    // 4️⃣ Parse Claude output (if JSON string)
    let answer;
    try {
      answer = JSON.parse(claudeData.completion);
    } catch (e) {
      // fallback: return raw text if parsing fails
      answer = { raw: claudeData.completion };
    }

    // 5️⃣ Send structured answer to front-end
    res.status(200).json({ answer });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error: " + err.message });
  }
}
