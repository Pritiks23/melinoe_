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

    if (!query || typeof query !== "string") {
      return res.status(400).json({
        error: "Invalid or missing 'query' parameter in request body.",
        message: "Please provide a valid search query as a string.",
      });
    }

    const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

    if (!TAVILY_API_KEY) {
      return res.status(500).json({
        error: "Missing Tavily API key.",
        message: "Ensure that the TAVILY_API_KEY environment variable is properly configured.",
      });
    }

    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TAVILY_API_KEY}`,
      },
      body: JSON.stringify({ query, max_results: 5 }),
    });

    if (!response.ok) {
      const errorDetails = await response.text();
      return res.status(response.status).json({
        error: "Failed to fetch data from Tavily API.",
        status: response.status,
        details: errorDetails,
      });
    }

    const data = await response.json();

    res.status(200).json({
      message: "Search completed successfully.",
      queryUsed: query,
      resultCount: data.results?.length || 0,
      results: data.results || [],
      metadata: {
        source: "Tavily API",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      error: "An unexpected error occurred.",
      message: error.message,
      stack: error.stack,
    });
  }
}
