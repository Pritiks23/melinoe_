// export default async function handler(req, res) {
//   const { query } = req.body;
//   const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

//   const response = await fetch("https://api.tavily.com/search", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${TAVILY_API_KEY}`,
//     },
//     body: JSON.stringify({ query, max_results: 5 }),
//   });

//   const data = await response.json();
//   res.status(200).json(data);
// }
export default async function handler(req, res) {
  try {
    const { query } = req.body;
    const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

    // Step 1: Tavily Search
    const response = await fetch("https://api.tavily.com/search", {
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

    const data = await response.json();
    const results = data.results || [];

    if (results.length === 0) {
      return res.status(200).json({
        answer: `No results found for "${query}". Try refining your question.`,
        references: [],
      });
    }

    // Step 2: Create a stronger formatted summary
    const intro = `### 🔍 Summary for: "${query}"\n\nHere’s a concise overview based on verified AI sources:\n\n`;

    // Build structured content
    const formattedSections = results
      .map((r, i) => {
        const snippet = r.snippet || "No description available.";
        return `**${i + 1}. ${r.title || "Untitled Source"}**  
${snippet}  
🔗 [Read More](${r.url})`;
      })
      .join("\n\n");

    const outro = `\n\n---\n💡 *Results aggregated via Tavily search engine. Always verify important implementation details from the original sources.*`;

    // Step 3: Return the structured response
    const finalAnswer = `${intro}${formattedSections}${outro}`;

    res.status(200).json({
      answer: finalAnswer,
      references: results.map(r => r.url),
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Failed to fetch results." });
  }
}
