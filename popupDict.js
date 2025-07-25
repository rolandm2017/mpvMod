const res = await fetch("https://libretranslate.com/translate", {
  method: "POST",
  body: JSON.stringify({
    q: "Hello",
    source: "en",
    target: "it",
    format: "text",
    alternatives: 3,
    api_key: "xxxxxx"
  }),
  headers: { "Content-Type": "application/json" },
});

console.log(await res.json());