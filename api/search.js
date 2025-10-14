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

    // Step 1: Tavily Search (ask for more context)
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TAVILY_API_KEY}`,
      },
      body: JSON.stringify({
        query,
        max_results: 8,
        include_answer: true,
        search_depth: "advanced",
      }),
    });

    const data = await response.json();
    const results = data.results || [];
    const possibleAnswer = data.answer || null;

    if (results.length === 0) {
      return res.status(200).json({
        answer: `No results found for "${query}". Try rephrasing your question.`,
        references: [],
      });
    }

    // Step 2: Build a clean, long-form response
    let formatted = `## ❓ Question\n${query}\n\n`;

    if (possibleAnswer) {
      formatted += `## 💡 Summary\n${possibleAnswer}\n\n`;
    } else {
      formatted += `## 💡 Summary\nHere’s what multiple verified AI sources say:\n\n`;
    }

    formatted += `---\n### 🔗 Key Findings\n`;

    formatted += results
      .map(
        (r, i) => `**${i + 1}. ${r.title || "Untitled Source"}**  
${r.snippet || "No description available."}  
[Read Source](${r.url})`
      )
      .join("\n\n");

    formatted += `\n\n---\n📚 *Aggregated via Tavily Search Engine — verified AI sources.*`;

    // Step 3: Return the structured answer
    res.status(200).json({
      answer: formatted,
      references: results.map(r => r.url),
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Failed to fetch results." });
  }
}
