// ==== Chat functionality ====
import { marked } from 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';

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
      body: JSON.stringify({ query: question, user_id: "pv_test" }),
    });

    if (!response.ok) throw new Error("Network response was not ok");

    const data = await response.json();
    const formattedResults = formatResults(data.results);

    // Use Markdown parsing for engineer-friendly output
    updateLastBotMessage(data.answer + (formattedResults ? "\n\n" + formattedResults : ""));
  } catch (err) {
    console.error("Error:", err);
    updateLastBotMessage("❌ Server error occurred.");
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
    botMessages[botMessages.length - 1].parentElement.innerHTML =
      `<span class="bot">AI:</span> ${marked.parse(text)}`;
  }
}

function formatResults(results) {
  if (!results || results.length === 0) return "";
  return results
    .map(
      (r) =>
        `🔗 <a href="${r.url}" target="_blank">${r.title}</a><br/>${r.content?.slice(0, 500) || ""}...`
    )
    .join("<br/><br/>");
}

// ==== Auto-suggest functionality ====
const suggestionsBox = document.createElement('div');
suggestionsBox.id = 'suggestions-box';
Object.assign(suggestionsBox.style, {
  position: 'absolute',
  background: '#fff',
  color: '#000',
  fontFamily: 'Arial, sans-serif',
  border: '1px solid #ccc',
  borderRadius: '4px',
  boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
  padding: '2px 0',
  width: `${input.offsetWidth}px`,
  top: `${input.offsetTop + input.offsetHeight}px`,
  left: `${input.offsetLeft}px`,
  zIndex: '9999',
  display: 'none',
});
input.parentNode.appendChild(suggestionsBox);

let questions = [];
fetch('questions.json')
  .then(res => res.json())
  .then(data => { questions = data; });

input.addEventListener('input', () => {
  const query = input.value.toLowerCase();
  suggestionsBox.innerHTML = '';
  if (!query) return (suggestionsBox.style.display = 'none');
  const filtered = questions.filter(q => q.toLowerCase().includes(query)).slice(0, 2);
  if (filtered.length === 0) return (suggestionsBox.style.display = 'none');
  filtered.forEach(q => {
    const div = document.createElement('div');
    div.textContent = q;
    Object.assign(div.style, {
      padding: '4px 8px',
      cursor: 'pointer',
      color: '#000',
      background: '#fff',
    });
    div.addEventListener('mouseover', () => div.style.background = '#e0f0ff');
    div.addEventListener('mouseout', () => div.style.background = '#fff');
    div.addEventListener('click', () => {
      input.value = q;
      suggestionsBox.style.display = 'none';
      input.focus();
    });
    suggestionsBox.appendChild(div);
  });
  suggestionsBox.style.display = 'block';
});

document.addEventListener('click', (e) => {
  if (!input.contains(e.target) && !suggestionsBox.contains(e.target)) {
    suggestionsBox.style.display = 'none';
  }
});






