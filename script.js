async function runSearch(query, mode) {
  const res = await fetch("/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, mode })
  });
  const data = await res.json();
  console.log(data);
}



