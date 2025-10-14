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

    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TAVILY_API_KEY}`,
      },
      body: JSON.stringify({
        query,
        max_results: 6,
        include_answer: false,
        include_raw_content: true,   // <-- ask Tavily for cleaned/full content
        search_depth: "advanced"
      }),
    });

    const data = await response.json();
    const results = data.results || [];

    // Build compact but richer output: short header + per-site expanded excerpt
    const shortHeader = `Question: ${query}\n\nAnswer (aggregated excerpts):\n\n`;

    const expanded = results
      .map((r, i) => {
        // Try a few possible fields for full/cleaned content, then fallback to snippet
        const raw = r.raw_content || r.cleaned_content || r.content || r.snippet || "";
        // Extract first 2 paragraphs or ~800 chars
        const paras = raw.split(/\n{2,}|\r\n{2,}/).filter(Boolean);
        const excerpt = (paras[0] ? paras.slice(0, 2).join("\n\n") : raw).slice(0, 800);
        return `**${i + 1}. ${r.title || "Untitled"}**  
${excerpt}${raw.length > excerpt.length ? "…" : ""}  
🔗 ${r.url}`;
      })
      .join("\n\n");

    res.status(200).json({
      answer: `${shortHeader}${expanded}`,
      references: results.map(r => r.url),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Search failed" });
  }
}

   
