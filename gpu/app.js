const MAX = 6;
const SLOTS = 5;
const ICON = {
    prev: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3.5 5.5 8 10 12.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    next: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    remove: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 4.5 11.5 11.5M11.5 4.5 4.5 11.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    plus: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3.5v9M3.5 8h9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
};
const byId = Object.fromEntries(GPUS.map((gpu) => [gpu.id, gpu]));

const ROWS = [
    { id: "year", label: "Год", main: true, better: null, text: (g) => String(g.year), num: () => null },
    { id: "architecture", label: "Архитектура", main: true, better: null, text: (g) => g.architecture, num: () => null },
    { id: "core", label: "Ядро", main: false, better: null, text: (g) => g.core, num: () => null },
    { id: "process", label: "Техпроцесс", main: false, better: null, text: (g) => `${g.process} нм`, num: () => null },
    { id: "iface", label: "Интерфейс", main: false, better: null, text: (g) => g.iface, num: () => null },
    { id: "clock", label: "Частота", main: true, better: "high", text: formatClock, num: (g) => g.boost || g.base },
    { id: "shaders", label: "Шейдеры", main: true, better: "high", text: (g) => fmt(g.shaders), num: (g) => g.shaders },
    { id: "rt", label: "RT-блоки", main: false, better: "high", text: (g) => fmt(g.rt), num: (g) => g.rt },
    { id: "matrix", label: "Tensor / AI", main: false, better: "high", text: (g) => fmt(g.matrix), num: (g) => g.matrix },
    { id: "rop", label: "ROP", main: false, better: "high", text: (g) => fmt(g.rop), num: (g) => g.rop },
    { id: "tmu", label: "TMU", main: false, better: "high", text: (g) => fmt(g.tmu), num: (g) => g.tmu },
    { id: "memory", label: "Память", main: true, better: "high", text: (g) => `${g.memory} ГБ ${g.memoryType}`, num: (g) => g.memory },
    { id: "bus", label: "Шина", main: false, better: "high", text: (g) => `${g.bus} бит`, num: (g) => g.bus },
    { id: "bandwidth", label: "Пропускная способность", main: true, better: "high", text: (g) => `${fmt(g.bandwidth)} ГБ/с`, num: (g) => g.bandwidth },
    { id: "tdp", label: "TDP", main: true, better: "low", text: (g) => `${g.tdp} Вт`, num: (g) => g.tdp },
    { id: "psu", label: "Блок питания", main: false, better: "low", text: (g) => (g.psu ? `от ${g.psu} Вт` : "—"), num: (g) => g.psu },
    { id: "power", label: "Доп. питание", main: false, better: null, text: (g) => g.power, num: () => null },
    { id: "dx", label: "DirectX", main: false, better: null, text: (g) => g.dx, num: () => null }
];

const search = document.querySelector("#q");
const menu = document.querySelector("#menu");
const vendorBar = document.querySelector("#vendors");
const chips = document.querySelector("#chips");
const sheet = document.querySelector("#sheet");
const empty = document.querySelector("#empty");
const count = document.querySelector("#count");
const limit = document.querySelector("#limit");
const linkInput = document.querySelector("#link");
const copyButton = document.querySelector("#copy");
const copyStatus = document.querySelector("#copy-status");
const presets = document.querySelector("#presets");
const customPanel = document.querySelector("#custom");

let selected = [];
let vendor = "";
let query = "";
let menuOpen = false;
let active = 0;
let preset = "main";
let custom = ROWS.filter((row) => row.main).map((row) => row.id);

try {
    const savedPreset = localStorage.getItem("gpu-preset");
    const savedCustom = JSON.parse(localStorage.getItem("gpu-custom") || "null");
    if (savedPreset === "main" || savedPreset === "all" || savedPreset === "custom") preset = savedPreset;
    if (Array.isArray(savedCustom)) custom = savedCustom.filter((id) => ROWS.some((row) => row.id === id));
} catch (error) {
    preset = "main";
}

const params = new URLSearchParams(location.search);
selected = (params.get("cards") || "").split(",").filter((id) => byId[id]).slice(0, MAX);

function fmt(value) {
    if (value == null) return "—";
    return value.toLocaleString("ru-RU");
}

function formatClock(gpu) {
    if (gpu.base && gpu.boost) return `${fmt(gpu.base)}–${fmt(gpu.boost)} МГц`;
    if (gpu.boost) return `до ${fmt(gpu.boost)} МГц`;
    if (gpu.base) return `${fmt(gpu.base)} МГц`;
    return "—";
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[char]));
}

function highlight(value, words) {
    const safe = escapeHtml(value);
    if (!words.length) return safe;
    const pattern = words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    return safe.replace(new RegExp(pattern, "gi"), (match) => `<mark>${match}</mark>`);
}

function filtered() {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return GPUS.filter((gpu) => {
        if (vendor && gpu.vendor !== vendor) return false;
        if (!words.length) return true;
        const hay = `${gpu.vendor} ${gpu.name} ${gpu.architecture} ${gpu.core}`.toLowerCase();
        return words.every((word) => hay.includes(word));
    });
}

function shareUrl() {
    const url = new URL(location.href);
    if (selected.length) url.searchParams.set("cards", selected.join(","));
    else url.searchParams.delete("cards");
    url.hash = "";
    return url.toString();
}

function visibleRows() {
    if (preset === "all") return ROWS;
    if (preset === "custom") return ROWS.filter((row) => custom.includes(row.id));
    return ROWS.filter((row) => row.main);
}

function bestIndexes(row, cards) {
    if (!row.better) return [];
    const values = cards.map((gpu) => row.num(gpu));
    const present = values.filter((value) => value != null);
    if (present.length < 2) return [];
    const best = row.better === "low" ? Math.min(...present) : Math.max(...present);
    const worst = row.better === "low" ? Math.max(...present) : Math.min(...present);
    if (best === worst) return [];
    return values.flatMap((value, index) => (value === best ? [index] : []));
}

function renderMenu() {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const list = filtered();
    if (!list.length) {
        menu.innerHTML = '<p class="menu-empty">Такой карты в списке нет</p>';
        search.setAttribute("aria-expanded", menuOpen ? "true" : "false");
        search.removeAttribute("aria-activedescendant");
        return;
    }
    if (active > list.length - 1) active = list.length - 1;
    if (active < 0) active = 0;
    let lastVendor = "";
    const html = list.map((gpu, index) => {
        const added = selected.includes(gpu.id);
        const header = !vendor && gpu.vendor !== lastVendor
            ? `<p class="group">${escapeHtml(gpu.vendor)}</p>`
            : "";
        lastVendor = gpu.vendor;
        return `${header}<button type="button" class="option${added ? " is-added" : ""}" id="opt-${gpu.id}" role="option" data-id="${gpu.id}" aria-selected="${index === active}" ${added ? "disabled" : ""}>
            <span class="dot vendor-${gpu.vendor}"></span>
            <span>
                <span class="option-name">${highlight(gpu.name, words)}</span>
                <span class="option-meta">${gpu.year} · ${gpu.memory} ГБ · индекс ${gpu.score}</span>
            </span>
        </button>`;
    }).join("");
    menu.innerHTML = html;
    const current = list[active];
    if (current) search.setAttribute("aria-activedescendant", `opt-${current.id}`);
    else search.removeAttribute("aria-activedescendant");
    search.setAttribute("aria-expanded", menuOpen ? "true" : "false");
    const activeEl = menu.querySelector('[aria-selected="true"]');
    if (menuOpen && activeEl) activeEl.scrollIntoView({ block: "nearest" });
}

function renderChips() {
    chips.innerHTML = selected.map((id) => {
        const gpu = byId[id];
        return `<button type="button" class="chip" data-id="${id}">
            <span class="dot vendor-${gpu.vendor}"></span>${escapeHtml(gpu.name)}
            <span class="chip-x" aria-hidden="true">${ICON.remove}</span>
            <span class="visually-hidden">Убрать</span>
        </button>`;
    }).join("");
}

function renderTable() {
    const cards = selected.map((id) => byId[id]);
    const hasCards = cards.length > 0;
    empty.hidden = hasCards;
    sheet.hidden = !hasCards;
    count.textContent = `В сравнении ${cards.length} из ${MAX}`;
    limit.hidden = cards.length < MAX;
    if (!hasCards) return;

    const maxScore = Math.max(...cards.map((gpu) => gpu.score));
    const ghosts = Math.max(0, SLOTS - cards.length);
    const head = [`<th class="stick corner" scope="col"><span class="corner-k">Индекс</span><span class="corner-v">5090 = 100</span></th>`];
    const palm = [];
    cards.forEach((gpu, index) => {
        const percent = Math.round(gpu.score / maxScore * 100);
        head.push(`<th scope="col" class="gpu-head">
            <div class="gpu-tools">
                <button type="button" data-act="prev" data-i="${index}" aria-label="Сдвинуть ${escapeHtml(gpu.name)} влево" ${index === 0 ? "disabled" : ""}>${ICON.prev}</button>
                <button type="button" data-act="next" data-i="${index}" aria-label="Сдвинуть ${escapeHtml(gpu.name)} вправо" ${index === cards.length - 1 ? "disabled" : ""}>${ICON.next}</button>
                <button type="button" data-act="remove" data-i="${index}" aria-label="Убрать ${escapeHtml(gpu.name)}">${ICON.remove}</button>
            </div>
            <p class="gpu-vendor"><span class="dot vendor-${gpu.vendor}"></span>${gpu.vendor}</p>
            <p class="gpu-name">${escapeHtml(gpu.name)}</p>
            <p class="idx">${gpu.score}</p>
            <div class="bar" role="img" aria-label="${percent}% от лидера этого сравнения">
                <i class="vendor-${gpu.vendor}" style="width:${percent}%"></i>
            </div>
        </th>`);
        palm.push(mobileCard(gpu, index, cards, percent));
    });
    for (let slot = 0; slot < ghosts; slot += 1) {
        const label = slot === 0 ? "<span>Добавить</span>" : "<span class=\"visually-hidden\">Добавить видеокарту</span>";
        head.push(`<th scope="col" class="gpu-head is-phantom"><button type="button" class="phantom" data-act="add">${ICON.plus}${label}</button></th>`);
    }
    if (cards.length < MAX) {
        palm.push(`<button type="button" class="mcard phantom" data-act="add">${ICON.plus}<span>Добавить видеокарту</span></button>`);
    }

    const rows = visibleRows();
    const body = rows.map((row) => {
        const best = new Set(bestIndexes(row, cards));
        const cells = cards.map((gpu, index) => {
            const mark = best.has(index) ? (row.better === "low" ? " is-lean" : " is-best") : "";
            const title = best.has(index) ? (row.better === "low" ? ' title="Меньше в этой строке"' : ' title="Больше в этой строке"') : "";
            return `<td class="${mark.trim()}"${title}>${escapeHtml(row.text(gpu))}</td>`;
        }).join("");
        const blanks = "<td class=\"is-phantom\"></td>".repeat(ghosts);
        return `<tr><th class="stick" scope="row">${row.label}</th>${cells}${blanks}</tr>`;
    }).join("");

    const note = body
        ? ""
        : `<tr><td class="span-note" colspan="${cards.length + ghosts + 1}">Отметьте строки, которые нужно показать.</td></tr>`;

    sheet.classList.toggle("is-wide", cards.length > SLOTS);
    sheet.innerHTML = `<div class="desk"><table class="compare">
        <caption class="visually-hidden">Сравнение выбранных видеокарт</caption>
        <thead><tr>${head.join("")}</tr></thead>
        <tbody>${body || note}</tbody>
    </table></div><div class="palm">${palm.join("")}</div>`;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    sheet.querySelectorAll(".bar i").forEach((bar) => {
        const width = bar.style.width;
        bar.style.width = "0";
        requestAnimationFrame(() => {
            bar.style.width = width;
        });
    });
}

function mobileCard(gpu, index, cards, percent) {
    const specs = visibleRows().map((row) => {
        const best = new Set(bestIndexes(row, cards));
        const mark = best.has(index) ? (row.better === "low" ? " is-lean" : " is-best") : "";
        return `<div class="mrow"><dt>${row.label}</dt><dd class="${mark.trim()}">${escapeHtml(row.text(gpu))}</dd></div>`;
    }).join("");
    return `<article class="mcard">
        <div class="gpu-tools">
            <button type="button" data-act="prev" data-i="${index}" aria-label="Сдвинуть ${escapeHtml(gpu.name)} влево" ${index === 0 ? "disabled" : ""}>${ICON.prev}</button>
            <button type="button" data-act="next" data-i="${index}" aria-label="Сдвинуть ${escapeHtml(gpu.name)} вправо" ${index === cards.length - 1 ? "disabled" : ""}>${ICON.next}</button>
            <button type="button" data-act="remove" data-i="${index}" aria-label="Убрать ${escapeHtml(gpu.name)}">${ICON.remove}</button>
        </div>
        <p class="gpu-vendor"><span class="dot vendor-${gpu.vendor}"></span>${gpu.vendor}</p>
        <h2 class="gpu-name">${escapeHtml(gpu.name)}</h2>
        <p class="idx">${gpu.score}</p>
        <div class="bar" role="img" aria-label="${percent}% от лидера этого сравнения"><i class="vendor-${gpu.vendor}" style="width:${percent}%"></i></div>
        <div class="mspecs">${specs}</div>
    </article>`;
}

function renderCustom() {
    customPanel.hidden = preset !== "custom";
    customPanel.innerHTML = ROWS.map((row) => `<label><input type="checkbox" value="${row.id}" ${custom.includes(row.id) ? "checked" : ""}> ${row.label}</label>`).join("");
}

function renderPresets() {
    presets.querySelectorAll("button").forEach((button) => {
        const on = button.dataset.preset === preset;
        button.classList.toggle("is-on", on);
        button.setAttribute("aria-checked", on ? "true" : "false");
    });
}

function commit() {
    const url = shareUrl();
    try {
        history.replaceState(null, "", url);
    } catch (error) {
        linkInput.value = url;
    }
    linkInput.value = url;
    renderChips();
    renderTable();
    if (menuOpen) renderMenu();
}

function add(id) {
    if (!byId[id] || selected.includes(id)) return;
    if (selected.length >= MAX) {
        limit.hidden = false;
        return;
    }
    selected.push(id);
    search.value = "";
    query = "";
    active = 0;
    commit();
}

function openMenu() {
    menuOpen = true;
    menu.hidden = false;
    renderMenu();
}

function closeMenu() {
    menuOpen = false;
    menu.hidden = true;
    search.setAttribute("aria-expanded", "false");
}

search.addEventListener("focus", openMenu);
search.addEventListener("input", () => {
    query = search.value;
    active = 0;
    openMenu();
});
search.addEventListener("keydown", (event) => {
    const list = filtered();
    if (event.key === "ArrowDown") {
        event.preventDefault();
        if (!menuOpen) openMenu();
        active = Math.min(active + 1, Math.max(list.length - 1, 0));
        renderMenu();
    } else if (event.key === "ArrowUp") {
        event.preventDefault();
        active = Math.max(active - 1, 0);
        renderMenu();
        } else if (event.key === "Enter" && menuOpen) {
        event.preventDefault();
        const gpu = list[active];
        if (gpu) add(gpu.id);
    } else if (event.key === "Escape") {
        closeMenu();
    }
});

menu.addEventListener("mousedown", (event) => {
    if (event.target.closest(".option")) event.preventDefault();
});
menu.addEventListener("click", (event) => {
    const option = event.target.closest(".option");
    if (!option || option.disabled) return;
    add(option.dataset.id);
    search.focus();
});

document.addEventListener("click", (event) => {
    if (event.target.closest("[data-act='add']")) return;
    if (!event.target.closest(".picker")) closeMenu();
});
document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        search.focus();
        openMenu();
    }
});

vendorBar.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    vendor = button.dataset.vendor;
    vendorBar.querySelectorAll("button").forEach((item) => {
        const on = item === button;
        item.classList.toggle("is-on", on);
        item.setAttribute("aria-checked", on ? "true" : "false");
    });
    active = 0;
    renderMenu();
});

chips.addEventListener("click", (event) => {
    const chip = event.target.closest(".chip");
    if (!chip) return;
    selected = selected.filter((id) => id !== chip.dataset.id);
    commit();
});

sheet.addEventListener("click", (event) => {
    const button = event.target.closest("[data-act]");
    if (!button || button.disabled) return;
    if (button.dataset.act === "add") {
        search.focus();
        openMenu();
        return;
    }
    const index = Number(button.dataset.i);
    if (button.dataset.act === "remove") selected.splice(index, 1);
    if (button.dataset.act === "prev" && index > 0) {
        const [gpu] = selected.splice(index, 1);
        selected.splice(index - 1, 0, gpu);
    }
    if (button.dataset.act === "next" && index < selected.length - 1) {
        const [gpu] = selected.splice(index, 1);
        selected.splice(index + 1, 0, gpu);
    }
    commit();
});

empty.addEventListener("click", (event) => {
    const button = event.target.closest("[data-pair]");
    if (!button) return;
    selected = button.dataset.pair.split(",").filter((id) => byId[id]).slice(0, MAX);
    commit();
});

presets.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    preset = button.dataset.preset;
    localStorage.setItem("gpu-preset", preset);
    renderPresets();
    renderCustom();
    renderTable();
});

customPanel.addEventListener("change", () => {
    custom = [...customPanel.querySelectorAll("input:checked")].map((input) => input.value);
    localStorage.setItem("gpu-custom", JSON.stringify(custom));
    renderTable();
});

copyButton.addEventListener("click", async () => {
    try {
        await navigator.clipboard.writeText(linkInput.value);
        copyStatus.textContent = "Ссылка скопирована";
    } catch (error) {
        linkInput.focus();
        linkInput.select();
        copyStatus.textContent = "Выделите ссылку и скопируйте её";
    }
    setTimeout(() => {
        copyStatus.textContent = "";
    }, 2000);
});

renderPresets();
renderCustom();
renderMenu();
commit();
