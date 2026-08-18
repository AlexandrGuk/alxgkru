const FS = await import("node:fs/promises");
const PATH = await import("node:path");

const newsPath = PATH.join(import.meta.dirname, "..", "data", "news.json");
const news = JSON.parse(await FS.readFile(newsPath, "utf8"));
const moods = ["neutral", "joyful", "sad", "ironic"];

function significantNumbers(text) {
  const found = [];
  const patterns = [
    /\d+(?:[.,]\d+)?\s?(?:тыс\.|млн|млрд|%)/g,
    /(?:€|\$)\s?\d+(?:[.,]\d+)?(?:\s?(?:млн|тыс\.))?/g,
    /\b(?:19|20)\d{2}\b/g,
  ];
  for (const re of patterns) {
    for (const m of text.matchAll(re)) found.push(m[0].replace(/\s+/g, " ").trim());
  }
  return [...new Set(found)];
}

function hasAll(haystack, needles) {
  return needles.filter((n) => n && !haystack.includes(n));
}

const failures = [];

for (const item of news.items) {
  const original = `${item.title}\n${item.originalText}`;
  const originalNums = significantNumbers(original);
  const keep = item.facts?.keep ?? [];
  const quotes = item.facts?.quotes ?? [];

  for (const mood of moods) {
    const rewrite = item.rewrites?.[mood];
    if (!rewrite?.title || !rewrite?.text) {
      failures.push(`${item.id}/${mood}: missing rewrite`);
      continue;
    }
    const blob = `${rewrite.title}\n${rewrite.text}`;
    const missingKeep = hasAll(blob, keep);
    const missingQuotes = hasAll(blob, quotes);
    const extraNums = significantNumbers(blob).filter((n) => !originalNums.includes(n));
    const issues = [];
    if (missingKeep.length) issues.push(`missing keep: ${missingKeep.join(" | ")}`);
    if (missingQuotes.length) issues.push(`missing quotes: ${missingQuotes.join(" | ")}`);
    if (extraNums.length) issues.push(`new numbers: ${extraNums.join(" | ")}`);
    rewrite.verified = issues.length === 0;
    rewrite.issues = issues;
    if (issues.length) failures.push(`${item.id}/${mood}: ${issues.join("; ")}`);
  }
}

await FS.writeFile(newsPath, JSON.stringify(news, null, 2), "utf8");

if (failures.length) {
  console.error(`FAIL ${failures.length}`);
  failures.forEach((line) => console.error(line));
  process.exit(1);
}

console.log(`OK ${news.items.length} items × ${moods.length} moods`);
