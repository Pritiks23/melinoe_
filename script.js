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

// function formatResults(results) {
//   if (!results || results.length === 0) return "No results found.";
//   return results
//     .map(
//       (r) =>
//         `🔗 <a href="${r.url}" target="_blank">${r.title}</a><br/>${r.content.slice(0, 200)}...`
//     )
//     .join("<br/><br/>");
// }
function formatResults(results) {
  if (!results || results.length === 0) return "No results found.";

  // --- Create confident executive summary ---
  const summaryText = results
    .map(r => r.content)
    .join(" ")
    .slice(0, 450)
    .replace(/<\/?[^>]+(>|$)/g, "");

  const summary = `
    <div class="summary-box">
      <h3>🧭 Executive Summary</h3>
      <p>${summaryText}...</p>
    </div>
  `;

  // --- Extract key takeaways (auto-select a few strong lines) ---
  const takeaways = results
    .slice(0, 3)
    .map(r => {
      const snippet = r.content.split(/[.!?]/)[0].trim();
      return `<li>${snippet.charAt(0).toUpperCase() + snippet.slice(1)}.</li>`;
    })
    .join("");

  const insights = `
    <div class="insight-box">
      <h4>📌 Key Takeaways</h4>
      <ul>${takeaways}</ul>
    </div>
  `;

  // --- Credible research-style sources ---
  const sources = results.map(
    (r, i) => `
      <div class="source-card">
        <a href="${r.url}" target="_blank" class="source-title">${r.title}</a>
        <p class="source-snippet">${r.content.slice(0, 320)}...</p>
      </div>
    `
  ).join("");

  const references = `
    <div class="sources-section">
      <h4>🔗 Sources & References</h4>
      ${sources}
    </div>
  `;

  return `${summary}${insights}${references}`;
}

//new
const canvas = document.getElementById('constellation');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const stars = [];
const numStars = 80;
const maxDist = 120;

class Star {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.vx = (Math.random() - 0.5) * 0.3;
    this.vy = (Math.random() - 0.5) * 0.3;
    this.radius = Math.random() * 2.5 + 1.5;

  }

  move() {
    this.x += this.vx;
    this.y += this.vy;
    if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
    if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 150, 255, 0.8)';
    ctx.fill();
  }
}

function connectStars() {
  for (let i = 0; i < stars.length; i++) {
    for (let j = i + 1; j < stars.length; j++) {
      const dx = stars[i].x - stars[j].x;
      const dy = stars[i].y - stars[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < maxDist) {
        ctx.beginPath();
        ctx.moveTo(stars[i].x, stars[i].y);
        ctx.lineTo(stars[j].x, stars[j].y);
        ctx.lineWidth = 1.2; // Thicker lines
        ctx.strokeStyle = 'rgba(0, 150, 255, 0.4)'; // More visible
        ctx.stroke();

      }
    }
  }
}

function animateConstellation() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  stars.forEach(star => {
    star.move();
    star.draw();
  });
  connectStars();
  requestAnimationFrame(animateConstellation);
}

for (let i = 0; i < numStars; i++) {
  stars.push(new Star());
}
animateConstellation();
