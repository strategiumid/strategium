const localFrontendOrigins = new Set([
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5500"
]);

const API_BASE_URL = window.STRATEGIUM_API_BASE_URL
  || (localFrontendOrigins.has(window.location.origin) ? "http://localhost:8080" : window.location.origin);

const fallbackNews = [
  {
    date: "2026-04-22",
    title: "Cities: Skylines II — Patch Notes 1.2.5f1",
    text: "Обновление улучшает производительность в поздней стадии города, исправляет транспортные маршруты и повышает стабильность сохранений.",
    tag: "new",
    sourceName: "Paradox Interactive",
    sourceUrl: "https://www.paradoxinteractive.com/games/cities-skylines-ii/news"
  },
  {
    date: "2026-04-16",
    title: "Crusader Kings III — Development Diary",
    text: "Разработчики рассказали о следующих механиках дипломатии, изменениях ИИ и планах по контенту для крупных династических кампаний.",
    tag: "news",
    sourceName: "Paradox Forum",
    sourceUrl: "https://forum.paradoxplaza.com/forum/forums/crusader-kings-iii.1059/"
  }
];

let currentNews = fallbackNews;
let currentUser = { authenticated: false, displayName: "Гость" };
let activeTemplateId = null;

async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.status === 204 ? null : response.json();
}

function renderNews(items) {
  const container = document.getElementById("news-feed");
  const template = document.getElementById("news-row-template");
  container.innerHTML = "";

  items.forEach((item) => {
    const fragment = template.content.cloneNode(true);
    const row = fragment.querySelector(".news-row");
    const titleWrap = fragment.querySelector(".news-title-wrap");
    fragment.querySelector(".news-date").textContent = item.date;
    fragment.querySelector(".news-title").textContent = item.title;
    fragment.querySelector(".news-text").textContent = item.text;

    const source = document.createElement("div");
    source.className = "news-source";
    source.style.display = "none";
    source.append("Источник: ");
    const link = document.createElement("a");
    link.href = item.sourceUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = item.sourceName;
    source.appendChild(link);
    titleWrap.appendChild(source);

    const tag = fragment.querySelector(".news-tag");
    tag.textContent = item.tag;
    if (item.tag === "new") tag.classList.add("new");

    row.addEventListener("click", () => {
      const expanded = row.classList.toggle("expanded");
      source.style.display = expanded ? "block" : "none";
    });

    container.appendChild(fragment);
  });
}

async function loadNews() {
  try {
    currentNews = await apiFetch("/api/news");
  } catch {
    currentNews = fallbackNews;
  }
  renderNews(currentNews);
}

function setupSearch() {
  const searchInput = document.getElementById("global-search");
  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim().toLowerCase();
    const filtered = q
      ? currentNews.filter((item) => `${item.title} ${item.text} ${item.tag} ${item.sourceName}`.toLowerCase().includes(q))
      : currentNews;
    renderNews(filtered);
  });
}

function setupSectionsMenu() {
  const toggle = document.getElementById("sections-toggle");
  const list = document.getElementById("sections-list");
  toggle.addEventListener("click", () => list.classList.toggle("hidden"));
}

function renderVkFeed(posts) {
  const vkList = document.getElementById("vk-feed-list");
  vkList.innerHTML = "";

  if (!posts.length) {
    const empty = document.createElement("div");
    empty.className = "vk-item";
    const text = document.createElement("p");
    text.textContent = "Посты не найдены.";
    empty.appendChild(text);
    vkList.appendChild(empty);
    return;
  }

  posts.forEach((post) => {
    const article = document.createElement("article");
    article.className = `vk-item ${post.fallback ? "fallback" : ""}`;

    const header = document.createElement("header");
    header.className = "vk-post-header";
    const avatar = document.createElement("div");
    avatar.className = "vk-avatar";
    if (post.authorAvatarUrl) {
      const avatarImg = document.createElement("img");
      avatarImg.src = post.authorAvatarUrl;
      avatarImg.alt = post.authorName || "VK";
      avatar.appendChild(avatarImg);
    } else {
      avatar.textContent = (post.authorName || "VK").slice(0, 2).toUpperCase();
    }
    const meta = document.createElement("div");
    const author = document.createElement("a");
    author.className = "vk-author";
    author.href = post.url || "https://vk.com/strategium";
    author.target = "_blank";
    author.rel = "noopener noreferrer";
    author.textContent = post.authorName || "Strategium";
    const time = document.createElement("time");
    time.textContent = post.date;
    meta.append(author, time);
    header.append(avatar, meta);

    const text = document.createElement("p");
    text.className = "vk-post-text";
    text.textContent = post.text;
    article.append(header, text);

    if (post.attachments?.length) {
      article.appendChild(renderVkAttachments(post.attachments));
    }

    const footer = document.createElement("footer");
    footer.className = "vk-post-footer";
    footer.append(
      vkMetric("Нравится", post.likesCount),
      vkMetric("Комментарии", post.commentsCount),
      vkMetric("Репосты", post.repostsCount),
      vkMetric("Просмотры", post.viewsCount)
    );

    if (post.url && !post.fallback) {
      const link = document.createElement("a");
      link.className = "vk-open-link";
      link.href = post.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Открыть в VK";
      footer.appendChild(link);
    }
    if (post.fallback) {
      const fallbackLink = document.createElement("a");
      fallbackLink.className = "vk-open-link";
      fallbackLink.href = post.url || "https://vk.com/strategium";
      fallbackLink.target = "_blank";
      fallbackLink.rel = "noopener noreferrer";
      fallbackLink.textContent = "Открыть группу";
      footer.appendChild(fallbackLink);
    }
    article.appendChild(footer);
    vkList.appendChild(article);
  });
}

function renderVkAttachments(attachments) {
  const wrap = document.createElement("div");
  wrap.className = "vk-attachments";
  attachments.forEach((attachment) => {
    if (attachment.type === "photo" && attachment.imageUrl) {
      const img = document.createElement("img");
      img.src = attachment.imageUrl;
      img.alt = "Фото из VK";
      wrap.appendChild(img);
      return;
    }

    const card = document.createElement("a");
    card.className = `vk-attachment-card ${attachment.type || "link"}`;
    card.href = attachment.url || "#";
    card.target = "_blank";
    card.rel = "noopener noreferrer";
    if (attachment.imageUrl) {
      const img = document.createElement("img");
      img.src = attachment.imageUrl;
      img.alt = attachment.title || "Вложение VK";
      card.appendChild(img);
    }
    const body = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = attachment.title || "Вложение";
    const description = document.createElement("span");
    description.textContent = attachment.description || attachment.type || "";
    body.append(title, description);
    card.appendChild(body);
    wrap.appendChild(card);
  });
  return wrap;
}

function vkMetric(label, value) {
  const metric = document.createElement("span");
  metric.className = "vk-metric";
  metric.textContent = `${label}: ${Number(value || 0)}`;
  return metric;
}

async function loadVkStrategiumFeed() {
  try {
    renderVkFeed(await apiFetch("/api/feed/vk/strategium"));
  } catch {
    renderVkFeed([{
      id: "fallback",
      title: "Strategium — новости",
      text: "Не удалось загрузить ленту автоматически в этом окружении. Откройте группу напрямую.",
      date: "Сейчас",
      url: "https://vk.com/strategium",
      authorName: "Strategium",
      authorAvatarUrl: "",
      likesCount: 0,
      commentsCount: 0,
      repostsCount: 0,
      viewsCount: 0,
      attachments: [],
      fallback: true
    }]);
  }
}

function setupFeedModal() {
  const openBtn = document.getElementById("open-feed-modal");
  const openTopBtn = document.getElementById("open-feed-modal-top");
  const modal = document.getElementById("feed-modal");
  const closeBtn = document.getElementById("feed-modal-close");
  const closeBg = document.getElementById("feed-modal-close-bg");
  const openModal = async (event) => {
    event.preventDefault();
    modal.classList.remove("hidden");
    await loadVkStrategiumFeed();
  };
  const closeModal = () => modal.classList.add("hidden");
  openBtn.addEventListener("click", openModal);
  openTopBtn.addEventListener("click", openModal);
  closeBtn.addEventListener("click", closeModal);
  closeBg.addEventListener("click", closeModal);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });
}

const lineBattalionDefs = [
  { id: "infantry", name: "Пехота", width: 2, hp: 25, org: 60, soft: 12, hard: 1, icon: "INF" },
  { id: "artillery", name: "Артиллерия", width: 3, hp: 12, org: 20, soft: 36, hard: 2, icon: "ART" },
  { id: "motorized", name: "Мотопехота", width: 2, hp: 24, org: 58, soft: 14, hard: 2, icon: "MOT" },
  { id: "mechanized", name: "Мех. пехота", width: 2, hp: 30, org: 52, soft: 18, hard: 6, icon: "MECH" },
  { id: "medium_tank", name: "Средние танки", width: 2, hp: 18, org: 30, soft: 26, hard: 24, icon: "MT" },
  { id: "aa_line", name: "Линейное ПВО", width: 1, hp: 10, org: 20, soft: 3, hard: 12, icon: "AA" },
  { id: "at_line", name: "Линейное ПТО", width: 1, hp: 10, org: 20, soft: 2, hard: 20, icon: "AT" }
];

const supportCompanyDefs = [
  { id: "eng", name: "Инженеры", org: 2, soft: 2, hard: 0, icon: "ENG" },
  { id: "recon", name: "Разведка", org: 1, soft: 1, hard: 0, icon: "REC" },
  { id: "sup_art", name: "Поддержка арт.", org: 0, soft: 12, hard: 1, icon: "S-ART" },
  { id: "log", name: "Логистика", org: 0, soft: 0, hard: 0, icon: "LOG" },
  { id: "signal", name: "Связь", org: 0, soft: 0, hard: 0, icon: "SIG" },
  { id: "maintenance", name: "Ремрота", org: 0, soft: 0, hard: 0, icon: "MAIN" },
  { id: "aa", name: "Поддержка ПВО", org: 0, soft: 4, hard: 8, icon: "S-AA" }
];

const divisionState = {
  lineSlots: Array(25).fill(null),
  supportSlots: Array(5).fill(null),
  selectedLine: null,
  selectedSupport: null
};

function renderPalette() {
  const battalionPalette = document.getElementById("battalion-palette");
  const supportPalette = document.getElementById("support-palette");
  battalionPalette.innerHTML = lineBattalionDefs.map((unit) => `
    <button class="palette-item ${divisionState.selectedLine === unit.id ? "active" : ""}" data-pick-line="${unit.id}">
      ${unit.icon} • ${unit.name}
      <small>W:${unit.width} ORG:${unit.org} SA:${unit.soft} HA:${unit.hard}</small>
    </button>
  `).join("");
  supportPalette.innerHTML = supportCompanyDefs.map((unit) => `
    <button class="palette-item ${divisionState.selectedSupport === unit.id ? "active" : ""}" data-pick-support="${unit.id}">
      ${unit.icon} • ${unit.name}
    </button>
  `).join("");
  battalionPalette.querySelectorAll("[data-pick-line]").forEach((button) => {
    button.addEventListener("click", () => {
      divisionState.selectedLine = button.dataset.pickLine;
      renderPalette();
    });
  });
  supportPalette.querySelectorAll("[data-pick-support]").forEach((button) => {
    button.addEventListener("click", () => {
      divisionState.selectedSupport = button.dataset.pickSupport;
      renderPalette();
    });
  });
}

function renderDivisionGrid() {
  const grid = document.getElementById("division-grid");
  const supportGrid = document.getElementById("support-grid");
  grid.innerHTML = divisionState.lineSlots.map((unitId, index) => {
    const unit = unitId ? lineBattalionDefs.find((def) => def.id === unitId) : null;
    return `<button class="division-slot ${unit ? "" : "empty"}" data-line-slot="${index}" title="${unit ? unit.name : "Пустой слот"}">${unit ? `${unit.icon}<br>${unit.name}` : "Пусто"}</button>`;
  }).join("");
  supportGrid.innerHTML = divisionState.supportSlots.map((unitId, index) => {
    const unit = unitId ? supportCompanyDefs.find((def) => def.id === unitId) : null;
    return `<button class="support-slot ${unit ? "" : "empty"}" data-support-slot="${index}" title="${unit ? unit.name : "Пустой слот"}">${unit ? `${unit.icon}<br>${unit.name}` : "Пусто"}</button>`;
  }).join("");
  grid.querySelectorAll("[data-line-slot]").forEach((button) => {
    button.addEventListener("click", () => {
      divisionState.lineSlots[Number(button.dataset.lineSlot)] = divisionState.selectedLine || null;
      renderDivisionGrid();
      renderDivisionStats();
    });
  });
  supportGrid.querySelectorAll("[data-support-slot]").forEach((button) => {
    button.addEventListener("click", () => {
      divisionState.supportSlots[Number(button.dataset.supportSlot)] = divisionState.selectedSupport || null;
      renderDivisionGrid();
      renderDivisionStats();
    });
  });
}

function calculateDivisionStats() {
  const lineUnits = divisionState.lineSlots.filter(Boolean).map((id) => lineBattalionDefs.find((unit) => unit.id === id));
  const supportUnits = divisionState.supportSlots.filter(Boolean).map((id) => supportCompanyDefs.find((unit) => unit.id === id));
  const orgBase = lineUnits.length ? lineUnits.reduce((sum, unit) => sum + unit.org, 0) / lineUnits.length : 0;
  return {
    width: lineUnits.reduce((sum, unit) => sum + unit.width, 0),
    hp: Math.round(lineUnits.reduce((sum, unit) => sum + unit.hp, 0)),
    org: Math.round(orgBase + supportUnits.reduce((sum, unit) => sum + unit.org, 0)),
    soft: Math.round(lineUnits.reduce((sum, unit) => sum + unit.soft, 0) + supportUnits.reduce((sum, unit) => sum + unit.soft, 0)),
    hard: Math.round(lineUnits.reduce((sum, unit) => sum + unit.hard, 0) + supportUnits.reduce((sum, unit) => sum + unit.hard, 0)),
    battalionCount: lineUnits.length,
    supportCount: supportUnits.length,
    xpCost: lineUnits.length * 5 + supportUnits.length * 10
  };
}

function renderDivisionStats() {
  const stats = calculateDivisionStats();
  document.getElementById("division-stats").innerHTML = `
    <div>Линейных батальонов: <strong>${stats.battalionCount}/25</strong></div>
    <div>Рот поддержки: <strong>${stats.supportCount}/5</strong></div>
    <div>Боевая ширина: <strong>${stats.width}</strong></div>
    <div>Организация: <strong>${stats.org}</strong></div>
    <div>HP: <strong>${stats.hp}</strong></div>
    <div>Soft Attack: <strong>${stats.soft}</strong></div>
    <div>Hard Attack: <strong>${stats.hard}</strong></div>
    <div>Стоимость опыта армии: <strong>${stats.xpCost}</strong></div>
    <div style="margin-top:6px;color:#8ea1bc;">Подсказка: выбери юнит справа и кликай по слотам, чтобы заполнять сетку.</div>
  `;
}

function setTemplateStatus(message) {
  document.getElementById("template-status").textContent = message;
}

function resetDivisionTemplate() {
  activeTemplateId = null;
  divisionState.lineSlots = Array(25).fill(null);
  divisionState.supportSlots = Array(5).fill(null);
  document.getElementById("template-name").value = "Новый шаблон";
  renderDivisionGrid();
  renderDivisionStats();
}

async function loadTemplates() {
  const list = document.getElementById("template-list");
  list.innerHTML = "";
  if (!currentUser.authenticated) {
    setTemplateStatus("Войдите через Steam или Dev вход, чтобы сохранять шаблоны.");
    return;
  }

  try {
    const templates = await apiFetch("/api/division-templates");
    if (!templates.length) {
      setTemplateStatus("Сохранённых шаблонов пока нет.");
      return;
    }
    setTemplateStatus("");
    templates.forEach((template) => {
      const item = document.createElement("div");
      item.className = "template-item";
      const meta = document.createElement("div");
      const title = document.createElement("p");
      title.className = "template-item-title";
      title.textContent = template.name;
      const stats = document.createElement("small");
      stats.textContent = `W:${template.stats.combatWidth} ORG:${template.stats.organization} SA:${template.stats.softAttack} HA:${template.stats.hardAttack}`;
      meta.append(title, stats);

      const actions = document.createElement("div");
      const loadButton = document.createElement("button");
      loadButton.textContent = "Загрузить";
      loadButton.addEventListener("click", () => {
        activeTemplateId = template.id;
        document.getElementById("template-name").value = template.name;
        divisionState.lineSlots = template.lineSlots;
        divisionState.supportSlots = template.supportSlots;
        renderDivisionGrid();
        renderDivisionStats();
        setTemplateStatus("Шаблон загружен.");
      });
      const deleteButton = document.createElement("button");
      deleteButton.textContent = "Удалить";
      deleteButton.addEventListener("click", async () => {
        await apiFetch(`/api/division-templates/${template.id}`, { method: "DELETE" });
        if (activeTemplateId === template.id) resetDivisionTemplate();
        await loadTemplates();
      });
      actions.append(loadButton, deleteButton);
      item.append(meta, actions);
      list.appendChild(item);
    });
  } catch {
    setTemplateStatus("Не удалось загрузить шаблоны.");
  }
}

async function saveDivisionTemplate() {
  if (!currentUser.authenticated) {
    setTemplateStatus("Сначала войдите в аккаунт.");
    return;
  }
  const payload = {
    name: document.getElementById("template-name").value.trim() || "Новый шаблон",
    lineSlots: divisionState.lineSlots,
    supportSlots: divisionState.supportSlots
  };
  const url = activeTemplateId ? `/api/division-templates/${activeTemplateId}` : "/api/division-templates";
  const method = activeTemplateId ? "PUT" : "POST";
  try {
    const saved = await apiFetch(url, { method, body: JSON.stringify(payload) });
    activeTemplateId = saved.id;
    setTemplateStatus("Шаблон сохранён.");
    await loadTemplates();
  } catch {
    setTemplateStatus("Не удалось сохранить шаблон.");
  }
}

function setupToolsModal() {
  const modal = document.getElementById("tools-modal");
  const openModal = async (event) => {
    event.preventDefault();
    modal.classList.remove("hidden");
    await loadTemplates();
  };
  const closeModal = () => modal.classList.add("hidden");
  document.getElementById("open-tools-modal").addEventListener("click", openModal);
  document.getElementById("tools-modal-close").addEventListener("click", closeModal);
  document.getElementById("tools-modal-close-bg").addEventListener("click", closeModal);
  document.getElementById("clear-division").addEventListener("click", () => {
    divisionState.lineSlots = Array(25).fill(null);
    divisionState.supportSlots = Array(5).fill(null);
    renderDivisionGrid();
    renderDivisionStats();
  });
  document.getElementById("new-division").addEventListener("click", resetDivisionTemplate);
  document.getElementById("save-division").addEventListener("click", saveDivisionTemplate);
}

function renderCurrentUser() {
  document.getElementById("steam-user").textContent = currentUser.displayName;
  document.getElementById("hero-nickname").textContent = currentUser.displayName;
  document.getElementById("steam-login").classList.toggle("hidden", currentUser.authenticated);
  document.getElementById("dev-login").classList.toggle("hidden", currentUser.authenticated);
  document.getElementById("logout").classList.toggle("hidden", !currentUser.authenticated);
}

async function loadCurrentUser() {
  try {
    currentUser = await apiFetch("/api/me");
  } catch {
    currentUser = { authenticated: false, displayName: "Гость" };
  }
  renderCurrentUser();
}

function setupAuth() {
  document.getElementById("steam-login").addEventListener("click", () => {
    window.location.href = `${API_BASE_URL}/api/auth/steam/start`;
  });
  document.getElementById("dev-login").addEventListener("click", async () => {
    const displayName = window.prompt("Введите имя для локального dev-входа:");
    if (!displayName || !displayName.trim()) return;
    currentUser = await apiFetch("/api/auth/dev-login", {
      method: "POST",
      body: JSON.stringify({ displayName: displayName.trim() })
    });
    renderCurrentUser();
    await loadTemplates();
  });
  document.getElementById("logout").addEventListener("click", async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    currentUser = { authenticated: false, displayName: "Гость" };
    activeTemplateId = null;
    renderCurrentUser();
    resetDivisionTemplate();
    await loadTemplates();
  });
}

renderNews(fallbackNews);
setupSearch();
setupSectionsMenu();
setupAuth();
setupFeedModal();
renderPalette();
renderDivisionGrid();
renderDivisionStats();
setupToolsModal();
loadCurrentUser();
loadNews();
