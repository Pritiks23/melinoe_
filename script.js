// ==== Chat / Search functionality ====
const form = document.getElementById("chat-form");
const input = document.getElementById("user-input");
const messages = document.getElementById("messages");

// Get or prompt for user_id (don't show it in chat)
let user_id = localStorage.getItem("user_id");
if (!user_id) {
  user_id = prompt("Enter your User ID:");
  if (user_id) localStorage.setItem("user_id", user_id);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const query = input.value.trim();
  if (!query) return;

  addMessage("user", query);
  input.value = "";

  addMessage("bot", "🔍 Searching...");

  try {
    const response = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, user_id }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || "Server error");
    }

    const data = await response.json();
    const a = data.answer || {};
    const structuredAnswer = `
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
      <b>9. Sources</b><ul>${(data.results || []).map(s => `<li><a href="${s.url}" target="_blank">${s.title}</a> — ${s.content?.slice(0, 200) || ""}</li>`).join("")}</ul>
      <b>10. Next steps</b><ul>${(a.nextSteps || []).map(x => `<li>${x}</li>`).join("")}</ul>
    `;

    updateLastBotMessage(structuredAnswer);

  } catch (err) {
    console.error(err);
    updateLastBotMessage(`❌ ${err.message}`);
  }
});

function addMessage(sender, text) {
  const div = document.createElement("div");
  div.classList.add("message");
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



