const news = [
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
  },
  {
    date: "2026-04-09",
    title: "Stellaris — Open Beta Changelog",
    text: "Новый пакет балансных правок по экономикам империй, улучшения интерфейса флота и обновленные модификаторы событий.",
    tag: "important",
    sourceName: "Paradox Forum",
    sourceUrl: "https://forum.paradoxplaza.com/forum/forums/stellaris.900/"
  },
  {
    date: "2026-04-02",
    title: "Hearts of Iron IV — Patch and Roadmap Notes",
    text: "Команда HOI4 опубликовала заметки о патче, исправлениях синхронизации в мультиплеере и приоритетах дорожной карты.",
    tag: "dev",
    sourceName: "Paradox Forum",
    sourceUrl: "https://forum.paradoxplaza.com/forum/forums/hearts-of-iron-iv.844/"
  },
  {
    date: "2026-03-30",
    title: "Europa Universalis IV — Update Overview",
    text: "Обзор обновления с изменениями торговли, дипломатических действий и поведения ИИ в колониальных регионах.",
    tag: "release",
    sourceName: "Paradox Forum",
    sourceUrl: "https://forum.paradoxplaza.com/forum/forums/europa-universalis-iv.731/"
  },
  {
    date: "2026-03-19",
    title: "Victoria 3 — Community Report",
    text: "Команда Victoria 3 представила отчёт по фидбеку игроков, изменению баланса отраслей и дальнейшим приоритетам.",
    tag: "recap",
    sourceName: "Paradox Forum",
    sourceUrl: "https://forum.paradoxplaza.com/forum/forums/victoria-3.1091/"
  }
];

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
    source.innerHTML = `Источник: <a href="${item.sourceUrl}" target="_blank" rel="noopener noreferrer">${item.sourceName}</a>`;
    source.style.display = "none";
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

function setupSearch() {
  const searchInput = document.getElementById("global-search");
  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) {
      renderNews(news);
      return;
    }

    const filtered = news.filter((item) =>
      `${item.title} ${item.text} ${item.tag} ${item.sourceName}`.toLowerCase().includes(q)
    );
    renderNews(filtered);
  });
}

function setupSectionsMenu() {
  const toggle = document.getElementById("sections-toggle");
  const list = document.getElementById("sections-list");
  toggle.addEventListener("click", () => {
    list.classList.toggle("hidden");
  });
}

function formatVkDate(unixTime) {
  return new Date(unixTime * 1000).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function renderVkFeed(posts, isFallback = false) {
  const vkList = document.getElementById("vk-feed-list");
  if (!posts.length) {
    vkList.innerHTML = `<div class="vk-item"><p>Посты не найдены.</p></div>`;
    return;
  }

  vkList.innerHTML = posts.map((post) => `
    <article class="vk-item">
      <h3>${post.title}</h3>
      <p>${post.text}</p>
      <time>${post.date}</time>
      ${post.url ? `<a href="${post.url}" target="_blank" rel="noopener noreferrer">Открыть пост</a>` : ""}
      ${isFallback ? `<p>Показаны резервные данные.</p>` : ""}
    </article>
  `).join("");
}

async function loadVkStrategiumFeed() {
  const endpoint = "https://api.vk.com/method/wall.get?domain=strategium&count=8&filter=owner&v=5.199";
  try {
    const response = await fetch(endpoint);
    const data = await response.json();
    const items = data?.response?.items || [];
    const posts = items
      .filter((item) => item.text && item.text.trim())
      .map((item) => ({
        title: item.text.split("\n")[0].slice(0, 110) || "Пост Strategium",
        text: item.text.slice(0, 700),
        date: formatVkDate(item.date),
        url: `https://vk.com/wall${item.owner_id}_${item.id}`
      }));

    if (!posts.length) throw new Error("Empty feed");
    renderVkFeed(posts);
  } catch (error) {
    renderVkFeed([
      {
        title: "Strategium — новости",
        text: "Не удалось загрузить ленту автоматически в этом окружении. Нажмите ссылку ниже и откройте группу напрямую.",
        date: "Сейчас",
        url: "https://vk.com/strategium"
      }
    ], true);
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

  battalionPalette.innerHTML = lineBattalionDefs
    .map((unit) => `
      <button class="palette-item ${divisionState.selectedLine === unit.id ? "active" : ""}" data-pick-line="${unit.id}">
        ${unit.icon} • ${unit.name}
        <small>W:${unit.width} ORG:${unit.org} SA:${unit.soft} HA:${unit.hard}</small>
      </button>
    `)
    .join("");

  supportPalette.innerHTML = supportCompanyDefs
    .map((unit) => `
      <button class="palette-item ${divisionState.selectedSupport === unit.id ? "active" : ""}" data-pick-support="${unit.id}">
        ${unit.icon} • ${unit.name}
      </button>
    `)
    .join("");

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

  grid.innerHTML = divisionState.lineSlots
    .map((unitId, index) => {
      const unit = unitId ? lineBattalionDefs.find((def) => def.id === unitId) : null;
      return `
        <button class="division-slot ${unit ? "" : "empty"}" data-line-slot="${index}" title="${unit ? unit.name : "Пустой слот"}">
          ${unit ? `${unit.icon}<br>${unit.name}` : "Пусто"}
        </button>
      `;
    })
    .join("");

  supportGrid.innerHTML = divisionState.supportSlots
    .map((unitId, index) => {
      const unit = unitId ? supportCompanyDefs.find((def) => def.id === unitId) : null;
      return `
        <button class="support-slot ${unit ? "" : "empty"}" data-support-slot="${index}" title="${unit ? unit.name : "Пустой слот"}">
          ${unit ? `${unit.icon}<br>${unit.name}` : "Пусто"}
        </button>
      `;
    })
    .join("");

  grid.querySelectorAll("[data-line-slot]").forEach((button) => {
    button.addEventListener("click", () => {
      const idx = Number(button.dataset.lineSlot);
      if (divisionState.selectedLine) {
        divisionState.lineSlots[idx] = divisionState.selectedLine;
      } else {
        divisionState.lineSlots[idx] = null;
      }
      renderDivisionGrid();
      renderDivisionStats();
    });
  });

  supportGrid.querySelectorAll("[data-support-slot]").forEach((button) => {
    button.addEventListener("click", () => {
      const idx = Number(button.dataset.supportSlot);
      if (divisionState.selectedSupport) {
        divisionState.supportSlots[idx] = divisionState.selectedSupport;
      } else {
        divisionState.supportSlots[idx] = null;
      }
      renderDivisionGrid();
      renderDivisionStats();
    });
  });
}

function calculateDivisionStats() {
  const lineUnits = divisionState.lineSlots
    .filter(Boolean)
    .map((id) => lineBattalionDefs.find((unit) => unit.id === id));
  const supportUnits = divisionState.supportSlots
    .filter(Boolean)
    .map((id) => supportCompanyDefs.find((unit) => unit.id === id));

  const width = lineUnits.reduce((sum, unit) => sum + unit.width, 0);
  const hp = lineUnits.reduce((sum, unit) => sum + unit.hp, 0);
  const orgBase = lineUnits.length
    ? lineUnits.reduce((sum, unit) => sum + unit.org, 0) / lineUnits.length
    : 0;
  const org = orgBase + supportUnits.reduce((sum, unit) => sum + unit.org, 0);
  const soft = lineUnits.reduce((sum, unit) => sum + unit.soft, 0) + supportUnits.reduce((sum, unit) => sum + unit.soft, 0);
  const hard = lineUnits.reduce((sum, unit) => sum + unit.hard, 0) + supportUnits.reduce((sum, unit) => sum + unit.hard, 0);
  const battalionCount = lineUnits.length;
  const supportCount = supportUnits.length;
  const xpCost = battalionCount * 5 + supportCount * 10;

  return {
    width,
    hp: Math.round(hp),
    org: Math.round(org),
    soft: Math.round(soft),
    hard: Math.round(hard),
    battalionCount,
    supportCount,
    xpCost
  };
}

function renderDivisionStats() {
  const stats = calculateDivisionStats();
  const statsEl = document.getElementById("division-stats");
  statsEl.innerHTML = `
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

function setupToolsModal() {
  const openBtn = document.getElementById("open-tools-modal");
  const modal = document.getElementById("tools-modal");
  const closeBtn = document.getElementById("tools-modal-close");
  const closeBg = document.getElementById("tools-modal-close-bg");
  const clearBtn = document.getElementById("clear-division");

  const openModal = (event) => {
    event.preventDefault();
    modal.classList.remove("hidden");
  };
  const closeModal = () => modal.classList.add("hidden");

  openBtn.addEventListener("click", openModal);
  closeBtn.addEventListener("click", closeModal);
  closeBg.addEventListener("click", closeModal);
  clearBtn.addEventListener("click", () => {
    divisionState.lineSlots = Array(25).fill(null);
    divisionState.supportSlots = Array(5).fill(null);
    renderDivisionGrid();
    renderDivisionStats();
  });
}

function setupSteamAuth() {
  const loginBtn = document.getElementById("steam-login");
  const userEl = document.getElementById("steam-user");
  const heroNickname = document.getElementById("hero-nickname");

  const saved = localStorage.getItem("steamNickname");
  if (saved) {
    userEl.textContent = saved;
    heroNickname.textContent = saved;
  }

  loginBtn.addEventListener("click", () => {
    window.open("https://steamcommunity.com/login/home/", "_blank", "noopener,noreferrer");
    const nickname = window.prompt("Введите ник из Steam (после входа в Steam):");
    if (!nickname || !nickname.trim()) return;
    const clean = nickname.trim();
    localStorage.setItem("steamNickname", clean);
    userEl.textContent = clean;
    heroNickname.textContent = clean;
  });
}

renderNews(news);
setupSearch();
setupSectionsMenu();
setupSteamAuth();
setupFeedModal();
renderPalette();
renderDivisionGrid();
renderDivisionStats();
setupToolsModal();
