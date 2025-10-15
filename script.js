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

function formatResults(results, userQuestion = "") {
  if (!results || results.length === 0)
    return `<div class="ai-empty">❌ No results found for this query.</div>`;

  // === Synthesized content sections ===
  const tldr = results[0]?.content?.slice(0, 120) + "..." || "Summary not available.";
  const short = results[1]?.content?.slice(0, 200) + "..." || "Brief overview unavailable.";
  const why = results[2]?.content?.slice(0, 300) + "..." || "Context not found.";
  const implementation = results[3]?.content?.slice(0, 350) + "..." || "Implementation details unavailable.";
  const test = results[4]?.content?.slice(0, 200) + "..." || "Testing details unavailable.";

  const alternatives = results
    .slice(0, 3)
    .map(r => `"${r.title}"`)
    .join(", ") || `"No alternatives found."`;

  const caveats = results
    .slice(3, 6)
    .map(r => `"${r.content.slice(0, 100)}..."`)
    .join(", ") || `"None listed."`;

  const sources = results
    .slice(0, 5)
    .map(
      r =>
        `<li><a href="${r.url}" target="_blank">${r.title}</a> — <em>${r.content.slice(
          0,
          150
        )}...</em></li>`
    )
    .join("");

  const evidence = results
    .map(
      (r, i) =>
        `<div class="evidence-item"><span class="eid">${i + 1})</span> <a href="${
          r.url
        }" target="_blank"><b>${r.title}</b></a> <span class="edate">${
          r.date || ""
        }</span><br/><span class="esnippet">${r.content.slice(0, 180)}...</span></div>`
    )
    .join("");

  return `
    <div class="ai-structured">
      <h3 class="ai-question">❓ QUESTION:</h3>
      <p class="ai-user-question">${userQuestion}</p>

      <div class="ai-section">
        <h4>"tldr"</h4>
        <p>${tldr}</p>
      </div>

      <div class="ai-section">
        <h4>"short"</h4>
        <p>${short}</p>
      </div>

      <div class="ai-section">
        <h4>"why"</h4>
        <p>${why}</p>
      </div>

      <div class="ai-section">
        <h4>"implementation"</h4>
        <p>${implementation}</p>
      </div>

      <div class="ai-section">
        <h4>"test"</h4>
        <p>${test}</p>
      </div>

      <div class="ai-section">
        <h4>"alternatives"</h4>
        <p>[${alternatives}]</p>
      </div>

      <div class="ai-section">
        <h4>"caveats"</h4>
        <p>[${caveats}]</p>
      </div>

      <div class="ai-section">
        <h4>"sources"</h4>
        <ul>${sources}</ul>
      </div>

      <div class="ai-section">
        <h4>"nextSteps"</h4>
        <ul>
          <li>Explore implementation in a real code environment.</li>
          <li>Compare with latest frameworks or libraries.</li>
          <li>Benchmark results with test datasets.</li>
        </ul>
      </div>

      <h3 class="ai-evidence-title">EVIDENCE:</h3>
      <div class="ai-evidence">${evidence}</div>
    </div>
  `;
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
