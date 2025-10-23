// ==== Chat / Search functionality ====
const form = document.getElementById("chat-form");
const input = document.getElementById("user-input");
const messages = document.getElementById("messages");

// Get or prompt for user_id
let user_id = localStorage.getItem("user_id");
if (!user_id) {
  user_id = prompt("Enter your User ID (e.g., pv_test):");
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
    const answerText = data.answer || "No answer returned.";

    const resultsHTML = data.results?.length
      ? data.results
          .map(
            (r) =>
              `<div><b>${r.title}</b><br>${r.content}<br><a href="${r.url}" target="_blank">Source</a></div>`
          )
          .join("<hr>")
      : "No results found.";

    updateLastBotMessage(
      `<h4>🧠 Claude's Answer:</h4><pre>${answerText}</pre><h4>🔗 Sources:</h4>${resultsHTML}`
    );
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


