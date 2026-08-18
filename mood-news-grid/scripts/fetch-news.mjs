const FS = await import("node:fs/promises");
const PATH = await import("node:path");

const FEED_URL = "https://rssexport.rbc.ru/rbcnews/news/30/full.rss";
const OUT_DIR = PATH.join(import.meta.dirname, "..", "data");
const MIN_CHARS = 280;
const TAKE = 12;

function decodeEntities(text) {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&laquo;/g, "«")
    .replace(/&raquo;/g, "»")
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&euro;/g, "€")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function stripMarkup(text) {
  return decodeEntities(text)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/Оставайтесь на связи с РБК в «Максе»\.?/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function tag(block, name) {
  const re = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i");
  const m = block.match(re);
  return m ? stripMarkup(m[1]) : "";
}

function extractFacts(text) {
  const numbers = [
    ...text.matchAll(
      /(?:€|\$)?\d+(?:[.,]\d+)?(?:\s?(?:тыс\.|млн|млрд|%))?/g
    ),
  ]
    .map((m) => m[0].replace(/\s+/g, " ").trim())
    .filter((v, i, arr) => arr.indexOf(v) === i);

  const quotes = [...text.matchAll(/«([^»]{3,180})»/g)]
    .map((m) => m[1].trim())
    .filter((v, i, arr) => arr.indexOf(v) === i);

  return { numbers, quotes };
}

const xml = await fetch(FEED_URL, {
  headers: { "user-agent": "MoodNewsGrid/1.0 (personal test assignment)" },
}).then((res) => {
  if (!res.ok) throw new Error(`RSS HTTP ${res.status}`);
  return res.text();
});

const items = xml
  .split(/<item>/i)
  .slice(1)
  .map((block) => {
    const title = tag(block, "title");
    const url = tag(block, "link");
    const publishedAt = tag(block, "pubDate");
    const category = tag(block, "category");
    const author = tag(block, "author");
    const full =
      tag(block, "rbc_news:full-text") || tag(block, "description");
    return {
      id: url.split("/").filter(Boolean).pop() || title,
      title,
      url,
      publishedAt,
      category,
      author,
      originalText: full,
      sourceName: "РБК",
      sourceFeed: FEED_URL,
    };
  })
  .filter((item) => item.title && item.url && item.originalText.length >= MIN_CHARS)
  .slice(0, TAKE)
  .map((item) => ({
    ...item,
    facts: extractFacts(`${item.title}\n${item.originalText}`),
  }));

if (items.length < 10) {
  throw new Error(`Need at least 10 news items, got ${items.length}`);
}

await FS.mkdir(OUT_DIR, { recursive: true });
const payload = {
  fetchedAt: new Date().toISOString(),
  source: {
    name: "РБК",
    feed: FEED_URL,
  },
  items,
};
await FS.writeFile(
  PATH.join(OUT_DIR, "raw.json"),
  JSON.stringify(payload, null, 2),
  "utf8"
);

console.log(`saved ${items.length} items to data/raw.json`);
items.forEach((item, i) => {
  console.log(
    `${i + 1}. [${item.category}] ${item.title} (${item.originalText.length} chars)`
  );
});
