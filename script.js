// ==== User ID Handling ====
let userId = sessionStorage.getItem("user_id");

async function promptForUserId() {
  while (!userId) {
    userId = prompt(
      "Enter your User ID to access Melinoë (you must have purchased queries):"
    )?.trim();
    if (!userId) alert("User ID is required to continue.");
    else {
      // Optional: validate ID with backend before allowing queries
      const res = await fetch("/api/check_user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      const data = await res.json();
      if (!data.valid) {
        alert("Invalid User ID. Please contact support.");
        userId = null;
      } else sessionStorage.setItem("user_id", userId);
    }
  }
}

// Call prompt on page load
window.addEventListener("load", promptForUserId);

// ==== Chat functionality ====
const form = document.getElementById("chat-form");
const input = document.getElementById("user-input");
const messages = document.getElementById("messages");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const question = input.value.trim();
  if (!question) return;

  addMessage("user", question);
  input.value = "";

  addMessage("bot", "🔍 Checking query availability...");

  try {
    // Check if user has remaining queries
    const usageRes = await fetch("/api/check_queries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });
    const usageData = await usageRes.json();
    if (!usageData.can_query) {
      updateLastBotMessage(
        `❌ You have no remaining queries. Please upgrade your plan.`
      );
      return;
    }

    addMessage("bot", "🔍 Searching...");

    const response = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: question, user_id: userId }),
    });

    if (!response.ok) throw new Error("Network response was not ok");

    const data = await response.json();
    const a = data.answer || {};
    let structuredAnswer = `
    <b>[Intent: ${a.intent || "Unknown"}]</b><br>
    Confidence: ${a.confidence || "N/A"}<br><br>
    <b>1. TL;DR</b> — ${a.tldr || "N/A"}<br><br>
    <b>2. Short Answer</b> — ${a.short || "N/A"}<br><br>
    <b>3. Why this is true</b> — ${a.why || "N/A"}<br><br>
    <b>4. Implementation</b><pre>${a.implementation || "N/A"}</pre><br>
    <b>5. Quick test / verification</b><pre>${a.test || "N/A"}</pre><br>
    <b>6. Alternatives & tradeoffs</b><ul>${(a.alternatives || []).map(x => `<li>${x}</li>`).join("")}</ul>
    <b>7. Caveats & risks</b><ul>${(a.caveats || []).map(x => `<li>${x}</li>`).join("")}</ul>
    <b>8. Performance / cost impact</b> — ${a.cost || "N/A"}<br><br>
    <b>9. Sources</b><ul>${(a.sources || []).map(s => `<li><a href="${s.url}" target="_blank">${s.title}</a> — ${s.note}</li>`).join("")}</ul>
    <b>10. Next steps</b><ul>${(a.nextSteps || []).map(x => `<li>${x}</li>`).join("")}</ul>
    `;

    const formattedResults = formatResults(data.results);
    updateLastBotMessage(structuredAnswer + "<br><br>" + formattedResults);

  } catch (err) {
    console.error("Error:", err);
    updateLastBotMessage("❌ Error fetching results. Please try again.");
  }
});

// ===== Existing helper functions =====
function addMessage(sender, text) {
  const div = document.createElement("div");
  div.classList.add("message");
  div.style.textAlign = "left";
  div.innerHTML = `<span class="${sender}">${sender === "user" ? "You" : "AI"}:</span> ${text}`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function updateLastBotMessage(text) {
  const botMessages = [...messages.querySelectorAll(".bot")];
  if (botMessages.length > 0) {
    botMessages[botMessages.length - 1].parentElement.innerHTML = `<span class="bot">AI:</span> ${text}`;
  }
}

function formatResults(results) {
  if (!results || results.length === 0) return "No results found.";
  return results
    .map(
      (r) =>
        `🔗 <a href="${r.url}" target="_blank">${r.title}</a><br/>${r.content.slice(0, 600)}...`
    )
    .join("<br/><br/>");
}

