import { PACKS } from "./rewrites.mjs";
const FS = await import("node:fs/promises");
const PATH = await import("node:path");

const dataDir = PATH.join(import.meta.dirname, "..", "data");
const raw = JSON.parse(await FS.readFile(PATH.join(dataDir, "raw.json"), "utf8"));

const items = raw.items.map((item) => {
  const pack = PACKS[item.id];
  if (!pack) throw new Error(`No rewrite pack for ${item.id} (${item.title})`);
  return {
    id: item.id,
    title: item.title,
    url: item.url,
    publishedAt: item.publishedAt,
    publishedAtIso: new Date(item.publishedAt).toISOString(),
    category: item.category,
    author: item.author,
    originalText: item.originalText.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim(),
    sourceName: item.sourceName,
    sourceFeed: item.sourceFeed,
    facts: pack.facts,
    rewrites: Object.fromEntries(
      Object.entries(pack.rewrites).map(([mood, body]) => [
        mood,
        { ...body, verified: false, issues: [] },
      ])
    ),
  };
});

const missing = Object.keys(PACKS).filter((id) => !items.some((item) => item.id === id));
if (items.length < 10) throw new Error(`Need 10+ items, got ${items.length}`);
if (missing.length) throw new Error(`Unused packs: ${missing.join(", ")}`);

const news = {
  fetchedAt: raw.fetchedAt,
  source: raw.source,
  moods: [
    { id: "neutral", label: "Нейтрально" },
    { id: "joyful", label: "Радостно" },
    { id: "sad", label: "Грустно" },
    { id: "ironic", label: "Иронично" },
  ],
  items,
};

await FS.writeFile(PATH.join(dataDir, "news.json"), JSON.stringify(news, null, 2), "utf8");
console.log(`wrote data/news.json (${items.length} items)`);
