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
      includeDomains: [
        "https://www.langchain.com/",
        "https://huggingface.co/docs",
        "https://www.llama.com/docs/overview/",
        "https://console.groq.com/docs/overview",
        "https://mistral.ai/solutions/document-ai",
        "https://microsoft.github.io/autogen/0.2/docs/Getting-Started/",
        "https://docs.cohere.com/",
        "https://docs.claude.com/en/home",
        "https://docs.pinecone.io/reference/api/introduction",
        "https://docs.trychroma.com/docs",
        "https://docs.weaviate.io/weaviate/config-refs",
        "https://redis.io/docs/latest/",
        "https://www.elastic.co/docs",
        "https://docs.pytorch.org/docs/stable/",
        "https://www.tensorflow.org/api_docs",
        "https://spacy.io/api",
        "https://keras.io/api/",
        "https://pypi.org/project/scikit-learn/",
        "https://docs.langflow.org/",
        "https://microsoft.github.io/autogen/stable//index.html",
        "https://docs.crewai.com/",
        "https://plotly.com/python/",
        "https://matplotlib.org/stable/users/index.html",
        "https://numpy.org/doc/"
  ]
})
  
    const tavilyData = await tavilyResponse.json();
    const results = tavilyData.results || [];

    // 2️⃣ Context for Claude
    const contextText = results.length
      ? results.map((r, i) => `${i + 1}) ${r.title}\n${r.content}\nSource: ${r.url}`).join("\n\n")
      : "No relevant Tavily results found.";

    // 3️⃣ Prompt for Claude
    const prompt = `
System: You are an expert AI engineering assistant.
Tone rules: confident, concise, direct. Use active voice.
If uncertain about a fact, quantify uncertainty and give a short plan to verify.

Respond using ONLY the sources listed in 'evidence' unless explicitly marked speculation.
Output must match this exact JSON schema:
Output only valid JSON. Do not wrap the JSON in markdown, code fences, or strings. Each key must be top-level.
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

Template meaning:
[Header: Intent tag + Confidence]
Intent: <interpreted question in 10 words>
Confidence:  ★★★★☆ (explain why)
1. TL;DR — One-line answer
2. Short answer — 2–4 concise sentences (most important facts)
3. Why this is true — explanation of evidence/logic (2–4 sentences)
4. Implementation — copy-paste-ready code/config/commands (with comments)
5. Quick test / verification — commands or unit tests
6. Alternatives & tradeoffs — 3 bullets
7. Caveats & risks — where it fails or what to watch for
8. Performance / cost impact — rough cost/time/scale note
9. Sources — 2–5 ranked (title + date + why it matters)
10. Next steps / recommended changes — 1–3 immediate actions

CONTEXT:
${contextText}

QUESTION: ${query}
`;

    // 4️⃣ Claude call
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


