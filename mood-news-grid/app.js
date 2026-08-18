const MOODS = {
  neutral: "Нейтрально",
  joyful: "Радостно",
  sad: "Грустно",
  ironic: "Иронично",
};

const grid = document.querySelector("#grid");
const sheet = document.querySelector("#sheet");
const switcher = document.querySelector(".mood-switch");
let data = null;
let mood = "neutral";
let lastFocus = null;
let activeId = null;

function excerpt(text, n = 180) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > n ? `${clean.slice(0, n).trim()}…` : clean;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function current(item) {
  return item.rewrites[mood];
}

function render() {
  document.body.dataset.mood = mood;
  switcher.querySelectorAll("button").forEach((btn) => {
    btn.setAttribute("aria-checked", String(btn.dataset.mood === mood));
  });
  grid.replaceChildren(
    ...data.items.map((item, index) => {
      const rewrite = current(item);
      const card = document.createElement("button");
      card.type = "button";
      card.className = index === 0 ? "card lead" : "card";
      card.innerHTML = `
        <p class="card-kicker">${item.category} · ${item.sourceName}</p>
        <h2>${rewrite.title}</h2>
        <p class="excerpt">${excerpt(rewrite.text)}</p>
        <div class="card-foot">
          <span>${formatDate(item.publishedAt)}</span>
          <span>Сверить факты</span>
        </div>
      `;
      card.addEventListener("click", () => openSheet(item));
      return card;
    })
  );
}

function openSheet(item) {
  const rewrite = current(item);
  activeId = item.id;
  if (!sheet.open) lastFocus = document.activeElement;
  document.querySelector("#sheet-kicker").textContent = `${item.category} · ${item.author}`;
  document.querySelector("#sheet-title").textContent = rewrite.title;
  document.querySelector("#sheet-meta").textContent =
    `${item.sourceName} · ${formatDate(item.publishedAt)} · тон: ${MOODS[mood]}`;
  document.querySelector("#orig-title").textContent = item.title;
  document.querySelector("#orig-text").textContent = item.originalText;
  document.querySelector("#mood-col-title").textContent = MOODS[mood];
  document.querySelector("#mood-title").textContent = rewrite.title;
  document.querySelector("#mood-text").textContent = rewrite.text;
  const facts = document.querySelector("#sheet-facts");
  const chips = [
    ...(item.facts.names || []),
    ...(item.facts.places || []),
    ...(item.facts.dates || []),
  ].slice(0, 10);
  facts.replaceChildren(
    ...chips.map((label) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = label;
      return chip;
    })
  );
  const badge = document.querySelector("#verify-badge");
  badge.textContent = rewrite.verified ? "Факты совпали" : "Проверка не прошла";
  badge.classList.toggle("bad", !rewrite.verified);
  const link = document.querySelector("#source-link");
  link.href = item.url;
  if (!sheet.open) sheet.showModal();
  document.querySelector("#sheet-close").focus();
}

function closeSheet() {
  sheet.close();
  if (lastFocus) lastFocus.focus();
}

switcher.addEventListener("click", (event) => {
  const btn = event.target.closest("button[data-mood]");
  if (!btn) return;
  mood = btn.dataset.mood;
  render();
  if (sheet.open && activeId) {
    const item = data.items.find((entry) => entry.id === activeId);
    if (item) openSheet(item);
  }
});

document.querySelector("#sheet-close").addEventListener("click", closeSheet);
sheet.addEventListener("click", (event) => {
  if (event.target === sheet) closeSheet();
});

const payload = await fetch("./data/news.json").then((res) => {
  if (!res.ok) throw new Error("Не удалось загрузить новости");
  return res.json();
});
data = payload;
document.querySelector("#source-line").textContent =
  `${payload.source.name} · снято ${formatDate(payload.fetchedAt)} · ${payload.items.length} новостей`;
render();
