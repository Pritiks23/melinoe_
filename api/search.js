export default async function handler(req, res) {
  const { query } = req.body;
  const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
  const HF_KEY = process.env.HF_KEY;

  // Step 1: Tavily search
  const tavilyRes = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TAVILY_API_KEY}`,
    },
    body: JSON.stringify({ query, max_results: 5 }),
  });
  const tavilyData = await tavilyRes.json();

  // Step 2: Combine search results
  const summaries = tavilyData.results
    ?.map(r => `🔗 ${r.title}\n${r.content}`)
    .join("\n\n") || "No results found.";

  // Step 3: Call Hugging Face text-generation API
  const hfRes = await fetch(
    "https://api-inference.huggingface.co/models/mistral-small", // free model
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: `Summarize the following search results into a concise answer and list the top links:\n\n${summaries}`,
        parameters: {
          max_new_tokens: 200
        }
      }),
    }
  );

  const hfData = await hfRes.json();

  res.status(200).json({
    answer: hfData[0]?.generated_text || "No summary available",
    sources: tavilyData.results?.map(r => ({ title: r.title, url: r.url })),
  });
}

