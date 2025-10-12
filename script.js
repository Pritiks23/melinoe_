const form = document.getElementById("chat-form");
const input = document.getElementById("user-input");
const messages = document.getElementById("messages");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const question = input.value.trim();
  if (!question) return;

  addMessage("user", question);
  input.value = "";

  addMessage("bot", "🔍 Searching...");

  try {
    const response = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: question }),
    });

    if (!response.ok) throw new Error("Network response was not ok");

    const data = await response.json();
    const answer = formatResults(data.results);
    updateLastBotMessage(answer);
  } catch (err) {
    console.error("Error:", err);
    updateLastBotMessage("❌ Error fetching results. Please try again.");
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

function formatResults(results) {
  if (!results || results.length === 0) return "No results found.";
  return results
    .map(
      (r) =>
        `🔗 <a href="${r.url}" target="_blank">${r.title}</a><br/>${r.content.slice(0, 200)}...`
    )
    .join("<br/><br/>");
}

