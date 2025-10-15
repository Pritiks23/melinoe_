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

// new part:
export default async function handler(req, res) {
  const { query } = req.body;
  const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
  const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY; // Add Claude key

  // 1️⃣ Fetch Tavily results
  const tavilyResponse = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TAVILY_API_KEY}`,
    },
    body: JSON.stringify({ query, max_results: 5 }),
  });
  const tavilyData = await tavilyResponse.json();

  // 2️⃣ Process Tavily results with Claude
  const prompt = `
You are an authoritative AI/ML assistant. Take the following Tavily search results and synthesize an expert answer with the structure:
TL;DR, Why, Implementation, Test, Sources.

Data:
${JSON.stringify(tavilyData)}
`;

  const claudeResponse = await fetch("https://api.anthropic.com/v1/complete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CLAUDE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "claude-3.0",
      prompt,
      max_tokens_to_sample: 1200,
      temperature: 0
    }),
  });

  const claudeData = await claudeResponse.json();

  // 3️⃣ Return Claude output to front-end
  res.status(200).json({ answer: claudeData.completion });
}
