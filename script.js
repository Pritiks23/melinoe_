// ====== Chat Frontend ======
const form = document.getElementById("chat-form");
const input = document.getElementById("user-input");
const messages = document.getElementById("messages");
const modeSelect = document.getElementById("mode");
const visualizeSelect = document.getElementById("visualize");

// Helper to add messages
function addMessage(sender, text) {
  const msg = document.createElement("div");
  msg.classList.add("message", sender);
  msg.innerHTML = `<strong>${sender === "user" ? "You" : "AI"}:</strong> ${text}`;
  messages.appendChild(msg);
  messages.scrollTop = messages.scrollHeight;
}

// Helper to update last bot message
function updateLastBotMessage(newText) {
  const allMsgs = document.querySelectorAll(".message.bot");
  if (allMsgs.length > 0) {
    allMsgs[allMsgs.length - 1].innerHTML = `<strong>AI:</strong> ${newText}`;
    messages.scrollTop = messages.scrollHeight;
  }
}

// Format Tavily results
function formatResults(results) {
  if (!results || results.length === 0) return "";
  return (
    "<b>🔗 Sources:</b><ul>" +
    results
      .map(
        (r) =>
          `<li><a href="${r.url}" target="_blank">${r.title}</a> — ${r.content.slice(0, 120)}...</li>`
      )
      .join("") +
    "</ul>"
  );
}

// Handle form submission
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const question = input.value.trim();
  if (!question) return;

  const mode = modeSelect.value;
  const visualize = visualizeSelect.value;

  addMessage("user", question);
  input.value = "";
  addMessage("bot", "🔍 Searching...");

  try {
    const response = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: question, user_id: "anon", mode, visualize }),
    });

    if (!response.ok) throw new Error("Network error");
    const data = await response.json();
    const a = data.answer || {};

    const structuredAnswer = `
<b>[Intent: ${a.intent || "Unknown"}]</b><br>
Mode: ${mode}<br>
Confidence: ${a.confidence || "N/A"}<br><br>

<b>1. TL;DR</b> — ${a.tldr || "N/A"}<br><br>
<b>2. Short Answer</b> — ${a.short || "N/A"}<br><br>
<b>3. Why this is true</b> — ${a.why || "N/A"}<br><br>
<b>4. Implementation</b><pre>${a.implementation || "N/A"}</pre><br>
<b>5. Quick test / verification</b><pre>${a.test || "N/A"}</pre><br>
<b>6. Alternatives & tradeoffs</b><ul>${(a.alternatives || [])
      .map((x) => `<li>${x}</li>`)
      .join("")}</ul>
<b>7. Caveats & risks</b><ul>${(a.caveats || [])
      .map((x) => `<li>${x}</li>`)
      .join("")}</ul>
<b>8. Performance / cost impact</b> — ${a.cost || "N/A"}<br><br>
<b>9. Sources</b><ul>${(a.sources || [])
      .map((s) => `<li><a href="${s.url}" target="_blank">${s.title}</a> — ${s.note}</li>`)
      .join("")}</ul>
<b>10. Next steps</b><ul>${(a.nextSteps || [])
      .map((x) => `<li>${x}</li>`)
      .join("")}</ul>
`;

    const formattedResults = formatResults(data.results);
    let visualizationBlock = "";

    if (visualize === "diagram") {
      visualizationBlock = `<br><br><b>📊 Visualization:</b><br><pre>[Conceptual Diagram Placeholder]</pre>`;
    } else if (visualize === "metrics") {
      visualizationBlock = `<br><br><b>📈 Metrics Visualization:</b><br><pre>[Real-time Metrics Placeholder]</pre>`;
    }

    updateLastBotMessage(structuredAnswer + "<br><br>" + formattedResults + visualizationBlock);
  } catch (err) {
    console.error("Error:", err);
    updateLastBotMessage("❌ Error fetching results. Please try again.");
  }
});




