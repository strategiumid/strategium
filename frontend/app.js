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
let steamAchievementSummary = null;
let selectedSteamGameSlug = null;
let lastLeaderboardResponse = null;
const mockFactions = [
  { id: "1", name: "Стальной Легион", tag: "STL", totalAchievements: 1480, avgCompletion: 62, uniqueGames: 19, memberCount: 34, rank: 1, progress: 84 },
  { id: "2", name: "Орден Маршалов", tag: "ORD", totalAchievements: 1325, avgCompletion: 58, uniqueGames: 16, memberCount: 29, rank: 2, progress: 73 },
  { id: "3", name: "Северный Альянс", tag: "NTH", totalAchievements: 1186, avgCompletion: 55, uniqueGames: 15, memberCount: 26, rank: 3, progress: 65 }
];
const constructorsCatalog = {
  hoi4: {
    title: "Hearts of Iron IV",
    subtitle: "Конструктор дивизий и боевых шаблонов"
  },
  stellaris: {
    title: "Stellaris",
    subtitle: "Ship Designer + Empire Builder"
  },
  ck3: {
    title: "Crusader Kings III",
    subtitle: "Конструктор правителя: черты, вера, культура"
  },
  vic3: {
    title: "Victoria 3",
    subtitle: "Конструктор законов и институтов"
  },
  market: {
    title: "Биржа",
    subtitle: "Лучшие шаблоны сообщества"
  }
};
let constructorsActiveTab = "hoi4";

const shopItems = {
  cosmetics: [
    { id: "gold_frame", title: "Золотая рамка", desc: "Сияющая рамка для вашего аватара.", price: 500, type: "cosmetic" },
    { id: "neon_name", title: "Неоновый ник", desc: "Ваше имя будет светиться в лидерборде.", price: 800, type: "cosmetic" },
    { id: "stellar_theme", title: "Тема 'Stellaris'", desc: "Эксклюзивная темная тема для профиля.", price: 1200, type: "cosmetic" }
  ],
  functional: [
    { id: "extra_slot", title: "Доп. слот шаблона", desc: "Увеличивает лимит сохраненных шаблонов на 1.", price: 200, type: "functional" },
    { id: "leaderboard_boost", title: "Приоритет в топе", desc: "Ваш профиль будет подсвечен в лидерборде.", price: 1000, type: "functional" },
    { id: "faction_discount", title: "Скидка на фракцию", desc: "-50% на создание своей фракции.", price: 1500, type: "functional" }
  ]
};

const stellarisShipDefs = {
  sections: {
    corvette: ["interceptor", "missile_boat", "picket_ship"],
    destroyer: ["gunship", "artillery", "picket"]
  },
  weapons: {
    laser: { dpsShield: 6, dpsArmor: 12, dpsHull: 8, power: 8, alloys: 10 },
    mass_driver: { dpsShield: 11, dpsArmor: 7, dpsHull: 8, power: 6, alloys: 8 },
    missile: { dpsShield: 7, dpsArmor: 9, dpsHull: 13, power: 10, alloys: 12 },
    plasma: { dpsShield: 4, dpsArmor: 14, dpsHull: 10, power: 12, alloys: 14 }
  },
  defenses: {
    shield: { shield: 120, armor: 10, hull: 0, power: 10, alloys: 10 },
    armor: { shield: 20, armor: 140, hull: 0, power: 4, alloys: 12 },
    hull: { shield: 0, armor: 20, hull: 150, power: 2, alloys: 8 }
  },
  reactors: {
    fission: { energy: 45, alloys: 8 },
    fusion: { energy: 70, alloys: 14 },
    cold_fusion: { energy: 95, alloys: 22 }
  }
};
const stellarisEmpireDefs = {
  origins: {
    prosperous_unification: { economy: 12, military: 4, diplomacy: 3 },
    remnants: { economy: 8, military: 5, diplomacy: 5 },
    void_dwellers: { economy: 6, military: 4, diplomacy: 8 }
  },
  ethics: {
    militarist: { military: 10, diplomacy: -3, economy: 2 },
    pacifist: { military: -6, diplomacy: 8, economy: 4 },
    materialist: { military: 2, diplomacy: 1, economy: 9 },
    spiritualist: { military: 1, diplomacy: 6, economy: 3 },
    xenophile: { military: -2, diplomacy: 11, economy: 2 },
    xenophobe: { military: 5, diplomacy: -6, economy: 4 }
  },
  civics: {
    meritocracy: { economy: 8, military: 2, diplomacy: 2 },
    distinguished_admiralty: { economy: 1, military: 10, diplomacy: -1 },
    diplomatic_corps: { economy: 1, military: 0, diplomacy: 10 },
    technocracy: { economy: 10, military: 1, diplomacy: 1 }
  },
  traits: {
    intelligent: { points: 2, economy: 7, military: 0, diplomacy: 0 },
    strong: { points: 1, economy: 0, military: 6, diplomacy: 0 },
    charismatic: { points: 1, economy: 0, military: 0, diplomacy: 6 },
    unruly: { points: -2, economy: -3, military: -2, diplomacy: -1 },
    sedentary: { points: -1, economy: -2, military: 0, diplomacy: -2 }
  }
};
const stellarisState = {
  mode: "ship",
  ship: {
    hull: "corvette",
    section: "interceptor",
    weapon: "laser",
    defense: "shield",
    reactor: "fission",
    utilitySlots: 2
  },
  empire: {
    origin: "prosperous_unification",
    ethics: ["materialist", "xenophile"],
    civics: ["meritocracy", "technocracy"],
    traits: ["intelligent", "unruly"]
  }
};

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

function setupQuickActions() {
  const searchBtn = document.getElementById("quick-search");
  const notifyBtn = document.getElementById("quick-notify");
  const messagesBtn = document.getElementById("quick-messages");
  const searchInput = document.getElementById("global-search");
  searchBtn?.addEventListener("click", () => {
    document.querySelector(".hero")?.scrollIntoView({ behavior: "smooth", block: "start" });
    searchInput?.focus();
  });
  notifyBtn?.addEventListener("click", () => window.alert("Уведомления скоро появятся."));
  messagesBtn?.addEventListener("click", () => window.alert("Личные сообщения скоро появятся."));
}

function animateNumber(node, target) {
  const value = Number(target || 0);
  if (!Number.isFinite(value)) return;
  const duration = 550;
  const start = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    node.textContent = `${Math.round(value * eased)}`;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function showToast(message, type = "info", title = "Уведомление") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-header">${title}</div>
    <div class="toast-body">${message}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-out");
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

const tooltip = {
  el: null,
  title: null,
  body: null,
  desc: null,
  init() {
    this.el = document.getElementById("strategium-tooltip");
    this.title = document.getElementById("tooltip-title");
    this.body = document.getElementById("tooltip-body");
    this.desc = document.getElementById("tooltip-desc");
  },
  show(title, stats, description, x, y) {
    if (!this.el) this.init();
    this.title.textContent = title;
    this.desc.textContent = description;
    this.body.innerHTML = Object.entries(stats).map(([label, value]) => `
      <div class="tooltip-stat"><span>${label}:</span> <strong>${value}</strong></div>
    `).join("");
    
    this.el.style.display = "block";
    const width = this.el.offsetWidth;
    const height = this.el.offsetHeight;
    
    let posX = x + 15;
    let posY = y + 15;
    
    if (posX + width > window.innerWidth) posX = x - width - 15;
    if (posY + height > window.innerHeight) posY = y - height - 15;
    
    this.el.style.left = `${posX}px`;
    this.el.style.top = `${posY}px`;
  },
  hide() {
    if (this.el) this.el.style.display = "none";
  }
};

function runAnimatedCounters(scope) {
  scope.querySelectorAll("[data-counter]").forEach((node) => {
    animateNumber(node, Number(node.dataset.counter || 0));
  });
}

function renderSkeleton(container, rows = 4, tall = false) {
  container.innerHTML = "";
  Array.from({ length: rows }).forEach(() => {
    const row = document.createElement("div");
    row.className = `skeleton-row ${tall ? "tall" : ""}`;
    container.appendChild(row);
  });
}

function setupStaggeredReveal() {
  document.querySelectorAll(".stagger-item").forEach((item, index) => {
    item.style.animationDelay = `${120 * index}ms`;
    item.classList.add("stagger-show");
  });
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
    if (!post.fallback) {
      footer.appendChild(renderVkPostActions(post));
    }

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

function renderVkPostActions(post) {
  const actions = document.createElement("div");
  actions.className = "vk-post-actions";

  const likeButton = document.createElement("button");
  likeButton.type = "button";
  likeButton.textContent = "Лайк";
  likeButton.disabled = !currentUser.authenticated || !currentUser.vkLinked;
  likeButton.addEventListener("click", async () => {
    try {
      await apiFetch(`/api/feed/vk/posts/${encodeURIComponent(post.id)}/like`, { method: "POST" });
      likeButton.textContent = "Лайк отправлен";
      likeButton.disabled = true;
    } catch {
      likeButton.textContent = "Ошибка VK";
    }
  });

  const form = document.createElement("form");
  form.className = "vk-comment-form";
  const input = document.createElement("input");
  input.type = "text";
  input.maxLength = 2048;
  input.placeholder = currentUser.vkLinked ? "Комментарий в VK..." : "Привяжите VK в настройках";
  input.disabled = !currentUser.authenticated || !currentUser.vkLinked;
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.textContent = "Отправить";
  submit.disabled = input.disabled;
  form.append(input, submit);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message) return;
    try {
      await apiFetch(`/api/feed/vk/posts/${encodeURIComponent(post.id)}/comments`, {
        method: "POST",
        body: JSON.stringify({ message })
      });
      input.value = "";
      input.placeholder = "Комментарий отправлен";
    } catch {
      input.placeholder = "Ошибка отправки в VK";
    }
  });

  actions.append(likeButton, form);
  return actions;
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
  const modal = document.getElementById("feed-modal");
  const closeBtn = document.getElementById("feed-modal-close");
  const closeBg = document.getElementById("feed-modal-close-bg");
  const openModal = async (event) => {
    event.preventDefault();
    modal.classList.remove("hidden");
    await loadVkStrategiumFeed();
  };
  const closeModal = () => modal.classList.add("hidden");
  document.querySelectorAll("[data-open-feed]").forEach((btn) => btn.addEventListener("click", openModal));
  closeBtn.addEventListener("click", closeModal);
  closeBg.addEventListener("click", closeModal);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });
}

function renderProfileBase(user) {
  document.getElementById("profile-name").textContent = user.displayName || "Гость";
  document.getElementById("profile-steam").textContent = user.steamId ? `SteamID: ${user.steamId}` : "Steam не привязан";
  document.getElementById("profile-vk").textContent = user.vkLinked
    ? `VK: ${user.vkDisplayName || "привязан"}`
    : "VK не привязан";

  const avatar = document.getElementById("profile-avatar");
  avatar.innerHTML = "";
  if (user.steamAvatarUrl) {
    const img = document.createElement("img");
    img.src = user.steamAvatarUrl;
    img.alt = user.displayName || "Steam avatar";
    avatar.appendChild(img);
  } else {
    avatar.textContent = (user.displayName || "ST").slice(0, 2).toUpperCase();
  }
  
  // Заполняем поля кастомизации
  const favGameSelect = document.getElementById("pref-fav-game");
  const bioInput = document.getElementById("pref-bio");
  if (favGameSelect && bioInput) {
    favGameSelect.value = user.prefs?.favGame || "hoi4";
    bioInput.value = user.prefs?.bio || "";
  }
  
  renderPinnedAchievements();
  renderFriends();
}

function renderPinnedAchievements() {
  const container = document.getElementById("achievement-showcase-list");
  if (!container) return;
  
  const pinned = currentUser.pinnedAchievements || [];
  container.innerHTML = "";
  
  for (let i = 0; i < 3; i++) {
    const slot = document.createElement("div");
    if (pinned[i]) {
      slot.className = "showcase-slot filled";
      slot.innerHTML = `<img src="${pinned[i].iconUrl}" title="${pinned[i].name}">`;
      slot.addEventListener("click", () => {
        currentUser.pinnedAchievements.splice(i, 1);
        renderPinnedAchievements();
        showToast("Достижение убрано из витрины", "info");
      });
    } else {
      slot.className = "showcase-slot empty";
      slot.textContent = "Свободный слот";
    }
    container.appendChild(slot);
  }
}

function renderFriends() {
  const list = document.getElementById("friends-list");
  if (!list) return;
  
  const friends = currentUser.friends || [];
  list.innerHTML = friends.length ? "" : '<div class="template-status">Список друзей пуст</div>';
  
  friends.forEach((friend, index) => {
    const item = document.createElement("div");
    item.className = "friend-item";
    item.innerHTML = `
      <div class="friend-info">
        <div class="friend-avatar">${friend.name.slice(0, 2).toUpperCase()}</div>
        <span class="friend-name">${friend.name}</span>
      </div>
      <button class="sections-btn" data-remove-friend="${index}">×</button>
    `;
    item.querySelector("button").addEventListener("click", () => {
      currentUser.friends.splice(index, 1);
      renderFriends();
    });
    list.appendChild(item);
  });
}

function renderProfileStats(summary) {
  const stats = document.getElementById("profile-stats");
  stats.innerHTML = "";
  const games = summary?.games || [];
  const totals = games.reduce((acc, game) => {
    acc.playtimeMinutes += Number(game.playtimeMinutes || 0);
    acc.unlocked += Number(game.unlockedCount || 0);
    acc.total += Number(game.totalCount || 0);
    acc.available += game.available ? 1 : 0;
    return acc;
  }, { playtimeMinutes: 0, unlocked: 0, total: 0, available: 0 });
  const progress = totals.total ? Math.round((totals.unlocked * 100) / totals.total) : 0;
  [
    ["Часы", formatSteamHours(totals.playtimeMinutes)],
    ["Достижения", `${totals.unlocked}/${totals.total}`],
    ["Прогресс", `${progress}%`],
    ["Игр с данными", `${totals.available}/${games.length}`]
  ].forEach(([label, value]) => {
    const item = document.createElement("div");
    item.className = "profile-stat";
    const strong = document.createElement("strong");
    if (label === "Прогресс") {
      strong.innerHTML = `<span data-counter="${progress}">0</span>%`;
    } else {
      strong.textContent = value;
    }
    const span = document.createElement("span");
    span.textContent = label;
    item.append(strong, span);
    stats.appendChild(item);
  });
  runAnimatedCounters(stats);
}

async function loadProfile() {
  const status = document.getElementById("profile-status");
  const stats = document.getElementById("profile-stats");
  await loadCurrentUser();
  renderProfileBase(currentUser);
  stats.innerHTML = "";

  if (!currentUser.authenticated) {
    status.textContent = "Войдите через Steam или Dev вход, чтобы увидеть профиль.";
    return;
  }
  if (!currentUser.steamId) {
    status.textContent = "Steam не привязан. Статистика игр недоступна.";
    return;
  }

  status.textContent = "Загружаем Steam-статистику...";
  try {
    const summary = await apiFetch("/api/steam/achievements");
    renderProfileStats(summary);
    status.textContent = "";
  } catch {
    status.textContent = "Не удалось загрузить Steam-статистику. Проверьте приватность Steam.";
  }
}

function setupProfileModal() {
  const modal = document.getElementById("profile-modal");
  const openModal = async (event) => {
    event.preventDefault();
    modal.classList.remove("hidden");
    await loadProfile();
    // Автоматически загружаем достижения при открытии профиля
    if (currentUser.authenticated && currentUser.steamId) {
      loadSteamAchievements();
    }
  };
  const closeModal = () => modal.classList.add("hidden");
  
  document.getElementById("add-friend-btn")?.addEventListener("click", () => {
    const input = document.getElementById("friend-search-input");
    const name = input.value.trim();
    if (!name) return;
    
    if (!currentUser.friends) currentUser.friends = [];
    currentUser.friends.push({ name });
    input.value = "";
    renderFriends();
    showToast(`Запрос отправлен ${name}!`, "success", "Друзья");
  });

  document.getElementById("save-profile-prefs")?.addEventListener("click", () => {
    const favGame = document.getElementById("pref-fav-game").value;
    const bio = document.getElementById("pref-bio").value.trim();
    
    if (!currentUser.prefs) currentUser.prefs = {};
    currentUser.prefs.favGame = favGame;
    currentUser.prefs.bio = bio;
    
    showToast("Настройки профиля сохранены!", "success", "Профиль");
  });

  document.querySelectorAll("[data-open-profile]").forEach((button) => {
    button.addEventListener("click", openModal);
  });
  document.getElementById("profile-modal-close").addEventListener("click", closeModal);
  document.getElementById("profile-modal-close-bg").addEventListener("click", closeModal);
  document.getElementById("refresh-steam-stats")?.addEventListener("click", refreshSteamStats);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });
}

function renderSettings() {
  const status = document.getElementById("vk-link-status");
  const linkButton = document.getElementById("vk-link");
  const unlinkButton = document.getElementById("vk-unlink");

  if (!currentUser.authenticated) {
    status.textContent = "Сначала войдите через Steam или Dev вход.";
    linkButton.classList.add("hidden");
    unlinkButton.classList.add("hidden");
    return;
  }

  if (currentUser.vkLinked) {
    status.textContent = `VK привязан: ${currentUser.vkDisplayName || "аккаунт VK"}`;
    linkButton.classList.add("hidden");
    unlinkButton.classList.remove("hidden");
  } else {
    status.textContent = "VK не привязан.";
    linkButton.classList.remove("hidden");
    unlinkButton.classList.add("hidden");
  }
}

function setupSettingsModal() {
  const modal = document.getElementById("settings-modal");
  const openModal = async (event) => {
    event.preventDefault();
    modal.classList.remove("hidden");
    await loadCurrentUser();
    renderSettings();
  };
  const closeModal = () => modal.classList.add("hidden");
  document.querySelectorAll("[data-open-settings]").forEach((button) => {
    button.addEventListener("click", openModal);
  });
  document.getElementById("settings-modal-close").addEventListener("click", closeModal);
  document.getElementById("settings-modal-close-bg").addEventListener("click", closeModal);
  document.getElementById("vk-link").addEventListener("click", () => {
    window.location.href = `${API_BASE_URL}/api/auth/vk/start`;
  });
  document.getElementById("vk-unlink").addEventListener("click", async () => {
    currentUser = await apiFetch("/api/auth/vk/unlink", { method: "POST" });
    renderCurrentUser();
    renderSettings();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });
}

function setAchievementsStatus(message) {
  document.getElementById("achievements-status").textContent = message;
}

function renderSteamGames(games) {
  const gamesList = document.getElementById("steam-games-list");
  gamesList.innerHTML = "";
  games.forEach((game) => {
    const button = document.createElement("button");
    button.className = `steam-game-item ${selectedSteamGameSlug === game.slug ? "active" : ""} ${game.available ? "" : "unavailable"}`;
    button.type = "button";
    button.dataset.gameSlug = game.slug;

    const title = document.createElement("strong");
    title.textContent = game.title;
    const meta = document.createElement("span");
    meta.textContent = game.available
      ? `${game.unlockedCount}/${game.totalCount} • ${game.progressPercent}% • ${formatSteamHours(game.playtimeMinutes)}`
      : `недоступно • ${formatSteamHours(game.playtimeMinutes)}`;
    const bar = document.createElement("div");
    bar.className = "steam-progress-bar";
    const fill = document.createElement("i");
    fill.style.width = `${Math.max(0, Math.min(100, game.progressPercent || 0))}%`;
    bar.appendChild(fill);
    button.append(title, meta, bar);
    button.addEventListener("click", async () => {
      selectedSteamGameSlug = game.slug;
      renderSteamGames(steamAchievementSummary.games);
      renderSteamAchievements(game);
    });
    gamesList.appendChild(button);
  });
}

function renderSteamAchievements(game) {
  const list = document.getElementById("steam-achievements-list");
  list.innerHTML = "";

  const header = document.createElement("div");
  header.className = "steam-achievements-head";
  const title = document.createElement("h3");
  title.textContent = game.title;
  const progress = document.createElement("span");
  progress.textContent = game.available
    ? `${game.unlockedCount}/${game.totalCount} достижений, ${game.progressPercent}%, ${formatSteamHours(game.playtimeMinutes)}`
    : game.message || "Достижения недоступны.";
  header.append(title, progress);
  list.appendChild(header);

  if (!game.available) {
    const empty = document.createElement("p");
    empty.className = "steam-empty";
    empty.textContent = game.message || "Steam не вернул достижения по этой игре.";
    list.appendChild(empty);
    return;
  }

  if (!game.achievements.length) {
    const empty = document.createElement("p");
    empty.className = "steam-empty";
    empty.textContent = "У игры нет достижений в ответе Steam.";
    list.appendChild(empty);
    return;
  }

  game.achievements.forEach((achievement) => {
    const item = document.createElement("article");
    item.className = `steam-achievement ${achievement.achieved ? "achieved" : ""}`;
    const icon = document.createElement("div");
    icon.className = "steam-achievement-icon";
    const imageUrl = achievement.achieved ? achievement.iconUrl : (achievement.iconGrayUrl || achievement.iconUrl);
    if (imageUrl) {
      const img = document.createElement("img");
      img.src = imageUrl;
      img.alt = achievement.name;
      icon.appendChild(img);
    } else {
      icon.textContent = achievement.achieved ? "OK" : "LOCK";
    }

    const body = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = achievement.name || achievement.apiName;
    const description = document.createElement("p");
    description.textContent = achievement.description || "Описание скрыто в Steam.";
    body.append(name, description);

    if (achievement.achieved) {
      const pinBtn = document.createElement("button");
      pinBtn.className = "pin-achievement-btn";
      pinBtn.innerHTML = "📌";
      pinBtn.title = "Закрепить в профиле";
      pinBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!currentUser.pinnedAchievements) currentUser.pinnedAchievements = [];
        if (currentUser.pinnedAchievements.length >= 3) {
          showToast("Максимум 3 достижения!", "warning");
          return;
        }
        if (currentUser.pinnedAchievements.some(a => a.apiName === achievement.apiName)) {
          showToast("Уже закреплено!", "info");
          return;
        }
        currentUser.pinnedAchievements.push({
          apiName: achievement.apiName,
          name: achievement.name,
          iconUrl: achievement.iconUrl
        });
        showToast("Достижение закреплено в профиле!", "success");
      });
      item.appendChild(pinBtn);
    }

    const state = document.createElement("span");
    state.className = "steam-achievement-state";
    state.textContent = achievement.achieved ? "Получено" : "Не получено";
    item.append(icon, body, state);
    list.appendChild(item);
  });
}

function formatSteamHours(minutes) {
  const hours = Number(minutes || 0) / 60;
  if (hours <= 0) return "0 ч";
  return `${Math.round(hours * 10) / 10} ч`;
}

async function loadSteamAchievements() {
  if (!currentUser.authenticated || !currentUser.steamId) {
    steamAchievementSummary = null;
    selectedSteamGameSlug = null;
    document.getElementById("steam-games-list").innerHTML = "";
    document.getElementById("steam-achievements-list").innerHTML = "";
    setAchievementsStatus("Войдите через Steam, чтобы увидеть свои достижения. Dev вход не привязан к SteamID.");
    return;
  }

  setAchievementsStatus("Загружаем достижения из Steam...");
  renderSkeleton(document.getElementById("steam-games-list"), 5);
  renderSkeleton(document.getElementById("steam-achievements-list"), 6, true);
  try {
    steamAchievementSummary = await apiFetch("/api/steam/achievements");
    const games = steamAchievementSummary.games || [];
    selectedSteamGameSlug = games[0]?.slug || null;
    renderSteamGames(games);
    if (games[0]) renderSteamAchievements(games[0]);
    setAchievementsStatus(games.length ? "" : "Нет настроенных Steam-игр.");
  } catch {
    steamAchievementSummary = null;
    selectedSteamGameSlug = null;
    setAchievementsStatus("Не удалось загрузить достижения. Проверьте Steam-вход, STEAM_WEB_API_KEY и приватность профиля.");
  }
}

async function refreshSteamStats() {
  if (!currentUser.authenticated || !currentUser.steamId) {
    setAchievementsStatus("Сначала войдите через Steam.");
    showToast("Необходимо войти через Steam для обновления статистики.", "warning");
    return;
  }

  const button = document.getElementById("refresh-steam-stats");
  button.disabled = true;
  setAchievementsStatus("Обновляем Steam-статистику...");
  try {
    const result = await apiFetch("/api/steam/stats/refresh", { method: "POST" });
    setAchievementsStatus(`Обновлено игр: ${result.refreshedGames}.`);
    const reward = 10 * (result.refreshedGames || 1);
    addReward(reward, "Обновление статистики Steam");
    showToast(`Статистика обновлена! Получено ${reward} SC.`, "success", "Steam Sync");
    await loadSteamAchievements();
  } catch {
    setAchievementsStatus("Не удалось обновить статистику. Проверьте Steam privacy и STEAM_WEB_API_KEY.");
    showToast("Ошибка при синхронизации со Steam.", "error");
  } finally {
    button.disabled = false;
  }
}

function setupAchievementsModal() {
  const modal = document.getElementById("achievements-modal");
  const openModal = async (event) => {
    event.preventDefault();
    modal.classList.remove("hidden");
    await loadCurrentUser();
    await loadSteamAchievements();
  };
  const closeModal = () => modal.classList.add("hidden");
  document.querySelectorAll("[data-open-achievements]").forEach((btn) => btn.addEventListener("click", openModal));
  document.getElementById("achievements-modal-close").addEventListener("click", closeModal);
  document.getElementById("achievements-modal-close-bg").addEventListener("click", closeModal);
  document.getElementById("refresh-steam-stats").addEventListener("click", refreshSteamStats);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });
}

function renderLeaderboard(response) {
  lastLeaderboardResponse = response;
  const list = document.getElementById("leaderboard-list");
  list.innerHTML = "";
  const mode = document.getElementById("leaderboard-mode")?.value || "personal";

  if (mode === "faction") {
    mockFactions.forEach((faction) => {
      const row = document.createElement("article");
      row.className = "leaderboard-row";
      row.innerHTML = `
        <strong>#<span data-counter="${faction.rank}">0</span></strong>
        <div>
          <span>[${faction.tag}] ${faction.name}</span>
          <small><span data-counter="${faction.totalAchievements}">0</span> достижений • <span data-counter="${faction.avgCompletion}">0</span>% средний прогресс • <span data-counter="${faction.uniqueGames}">0</span> тайтлов</small>
        </div>
        <div class="leaderboard-row-side">
          <span class="leaderboard-games"><span data-counter="${faction.memberCount}">0</span> участников</span>
          <button type="button" class="sections-btn" data-open-factions>Открыть</button>
        </div>
      `;
      list.appendChild(row);
    });
    runAnimatedCounters(list);
    list.querySelectorAll("[data-open-factions]").forEach((btn) => btn.addEventListener("click", () => {
      document.getElementById("factions-modal")?.classList.remove("hidden");
    }));
    return;
  }

  if (!response.entries?.length) {
    const empty = document.createElement("p");
    empty.className = "steam-empty";
    empty.textContent = "Пока нет данных. Пользователям нужно обновить Steam-статистику.";
    list.appendChild(empty);
    return;
  }

  response.entries.forEach((entry) => {
    const row = document.createElement("article");
    row.className = "leaderboard-row";
    const rank = document.createElement("strong");
    rank.innerHTML = `#<span data-counter="${entry.rank}">0</span>`;
    const user = document.createElement("div");
    const name = document.createElement("span");
    name.textContent = `${entry.factionTag ? `[${entry.factionTag}] ` : ""}${entry.displayName}`;
    const meta = document.createElement("small");
    meta.innerHTML = `<span data-counter="${entry.totalUnlocked}">0</span>/<span data-counter="${entry.totalAchievements}">0</span> достижений • <span data-counter="${entry.progressPercent}">0</span>% • ${formatSteamHours(entry.totalPlaytimeMinutes)}`;
    user.append(name, meta);
    const side = document.createElement("div");
    side.className = "leaderboard-row-side";
    const games = document.createElement("span");
    games.className = "leaderboard-games";
    games.innerHTML = `<span data-counter="${entry.gamesCount}">0</span> игр`;
    const compareBtn = document.createElement("button");
    compareBtn.type = "button";
    compareBtn.className = "sections-btn";
    compareBtn.textContent = "Сравнить";
    compareBtn.addEventListener("click", () => openSelfCompare(entry));
    side.append(games, compareBtn);
    row.append(rank, user, side);
    list.appendChild(row);
  });
  runAnimatedCounters(list);
}

function normalizeGameKey(game) {
  const bySlug = String(game?.slug || "").trim().toLowerCase();
  const byApp = String(game?.appId || game?.steamAppId || "").trim().toLowerCase();
  const byTitle = String(game?.title || game?.name || "").trim().toLowerCase();
  return bySlug || byApp || byTitle;
}

function buildCompareRows(selfGames, otherGames) {
  const selfMap = new Map(selfGames.map((game) => [normalizeGameKey(game), game]));
  return otherGames.map((otherGame) => {
    const key = normalizeGameKey(otherGame);
    const selfGame = selfMap.get(key);
    if (!selfGame) return null;
    const selfUnlocked = Number(selfGame.unlockedCount || selfGame.unlocked || 0);
    const selfTotal = Number(selfGame.totalCount || selfGame.total || 0);
    const selfProgress = selfTotal ? Math.round((selfUnlocked * 100) / selfTotal) : Number(selfGame.progressPercent || 0);
    const otherUnlocked = Number(otherGame.unlockedCount || otherGame.unlocked || 0);
    const otherTotal = Number(otherGame.totalCount || otherGame.total || 0);
    const otherProgress = otherTotal ? Math.round((otherUnlocked * 100) / otherTotal) : Number(otherGame.progressPercent || 0);
    const title = selfGame.title || selfGame.name || otherGame.title || otherGame.name || "Игра";
    return { title, selfUnlocked, selfTotal, selfProgress, otherUnlocked, otherTotal, otherProgress };
  }).filter(Boolean);
}

function renderComparisonTable(entry, rows) {
  const container = document.getElementById("leaderboard-compare");
  const selfName = currentUser.displayName || "Вы";
  const tableRows = rows.map((row) => `
    <tr>
      <td>${row.title}</td>
      <td>${row.selfUnlocked}/${row.selfTotal}</td>
      <td>${row.selfProgress}%</td>
      <td>${row.otherUnlocked}/${row.otherTotal}</td>
      <td>${row.otherProgress}%</td>
    </tr>
  `).join("");
  container.innerHTML = `
    <div class="compare-card">
      <h3>Сравнение: ${selfName} vs ${entry.displayName}</h3>
      <table class="compare-table">
        <thead>
          <tr>
            <th>Игра</th>
            <th>${selfName}</th>
            <th>%</th>
            <th>${entry.displayName}</th>
            <th>%</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
  `;
  container.classList.remove("hidden");
}

async function openSelfCompare(entry) {
  const container = document.getElementById("leaderboard-compare");
  container.classList.remove("hidden");
  container.innerHTML = `<div class="template-status">Готовим сравнение...</div>`;
  await loadCurrentUser();
  if (!currentUser.authenticated || !currentUser.steamId) {
    container.innerHTML = `<div class="template-status compare-alert">Войдите через Steam, чтобы сравнить свои достижения.</div>`;
    return;
  }
  if (!steamAchievementSummary?.games?.length) {
    try {
      steamAchievementSummary = await apiFetch("/api/steam/achievements");
    } catch {
      container.innerHTML = `<div class="template-status compare-alert">Не удалось загрузить ваши Steam-данные для сравнения.</div>`;
      return;
    }
  }
  const otherGames = entry.games || entry.gameStats || entry.sharedGames || [];
  const selfGames = steamAchievementSummary.games || [];
  const rows = buildCompareRows(selfGames, otherGames);
  if (!rows.length) {
    container.innerHTML = `<div class="template-status">Для пользователя ${entry.displayName} API пока не вернуло список игр для сравнения.</div>`;
    return;
  }
  renderComparisonTable(entry, rows);
}

async function loadLeaderboard() {
  const scope = document.getElementById("leaderboard-scope").value;
  const sort = document.getElementById("leaderboard-sort").value;
  const status = document.getElementById("leaderboard-status");
  status.textContent = "Загружаем лидерборд...";
  renderSkeleton(document.getElementById("leaderboard-list"), 6, true);
  try {
    if ((document.getElementById("leaderboard-mode")?.value || "personal") === "faction") {
      renderLeaderboard({ entries: [] });
    } else {
      const response = await apiFetch(`/api/steam/leaderboard?scope=${encodeURIComponent(scope)}&sort=${encodeURIComponent(sort)}`);
      renderLeaderboard(response);
    }
    status.textContent = "";
  } catch {
    status.textContent = "Не удалось загрузить лидерборд.";
  }
}

function setupLeaderboardModal() {
  const modal = document.getElementById("leaderboard-modal");
  const openModal = async (event) => {
    event.preventDefault();
    modal.classList.remove("hidden");
    await loadLeaderboard();
  };
  const closeModal = () => modal.classList.add("hidden");
  document.querySelectorAll("[data-open-leaderboard]").forEach((btn) => btn.addEventListener("click", openModal));
  document.getElementById("leaderboard-modal-close").addEventListener("click", closeModal);
  document.getElementById("leaderboard-modal-close-bg").addEventListener("click", closeModal);
  document.getElementById("leaderboard-mode").addEventListener("change", loadLeaderboard);
  document.getElementById("leaderboard-scope").addEventListener("change", loadLeaderboard);
  document.getElementById("leaderboard-sort").addEventListener("change", loadLeaderboard);
  document.getElementById("compare-self").addEventListener("click", async () => {
    if (!lastLeaderboardResponse?.entries?.length) {
      await loadLeaderboard();
    }
    const entries = lastLeaderboardResponse?.entries || [];
    if (!entries.length) return;
    const target = entries.find((entry) => entry.displayName !== currentUser.displayName) || entries[0];
    await openSelfCompare(target);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });
}

function renderFactionsList() {
  const list = document.getElementById("factions-list");
  const theme = document.getElementById("faction-theme").value;
  list.innerHTML = "";
  const cards = [...mockFactions].map((faction) => {
    const ratingScore = Math.round((faction.totalAchievements * 0.5) + (faction.avgCompletion * 0.3) + (faction.uniqueGames * 0.2));
    const row = document.createElement("article");
    row.className = `leaderboard-row faction-theme-${theme}`;
    row.innerHTML = `
      <strong>#<span data-counter="${faction.rank}">0</span></strong>
      <div>
        <span>[${faction.tag}] ${faction.name}</span>
        <small>50/30/20 score: <span data-counter="${ratingScore}">0</span> • <span data-counter="${faction.totalAchievements}">0</span> достижений • <span data-counter="${faction.uniqueGames}">0</span> игр</small>
      </div>
      <div class="leaderboard-row-side">
        <span class="leaderboard-games"><span data-counter="${faction.memberCount}">0</span> мест</span>
        <button type="button" class="sections-btn">Подать заявку</button>
      </div>
    `;
    return row;
  });
  cards.forEach((card) => list.appendChild(card));
  runAnimatedCounters(list);
}

function setupFactionsModal() {
  const modal = document.getElementById("factions-modal");
  const openModal = (event) => {
    event?.preventDefault();
    modal.classList.remove("hidden");
    renderFactionsList();
    document.getElementById("factions-status").textContent = "Фракции ранжируются еженедельно. Anti-abuse: 24ч после выхода, 72ч после исключения.";
  };
  const closeModal = () => modal.classList.add("hidden");
  document.querySelectorAll("[data-open-factions]").forEach((btn) => btn.addEventListener("click", openModal));
  document.getElementById("factions-modal-close").addEventListener("click", closeModal);
  document.getElementById("factions-modal-close-bg").addEventListener("click", closeModal);
  document.getElementById("faction-theme").addEventListener("change", renderFactionsList);
  document.getElementById("create-faction").addEventListener("click", () => {
    document.getElementById("factions-status").textContent = "Создание фракции: лидер/офицеры/заявки/видимость и роли будут синхронизированы через backend.";
  });
}

function calculateStellarisShipStats() {
  const ship = stellarisState.ship;
  const weapon = stellarisShipDefs.weapons[ship.weapon];
  const defense = stellarisShipDefs.defenses[ship.defense];
  const reactor = stellarisShipDefs.reactors[ship.reactor];
  const slots = Number(ship.utilitySlots || 1);
  const powerUse = (weapon.power * 2) + (defense.power * slots);
  const availablePower = reactor.energy;
  return {
    dpsShield: Math.round(weapon.dpsShield * 2),
    dpsArmor: Math.round(weapon.dpsArmor * 2),
    dpsHull: Math.round(weapon.dpsHull * 2),
    shield: defense.shield * slots,
    armor: defense.armor * slots,
    hull: 300 + (defense.hull * slots),
    alloys: Math.round((weapon.alloys * 2) + (defense.alloys * slots) + reactor.alloys),
    powerUse,
    availablePower
  };
}

function calculateStellarisEmpireStats() {
  const empire = stellarisState.empire;
  const base = { economy: 50, military: 50, diplomacy: 50 };
  const origin = stellarisEmpireDefs.origins[empire.origin];
  Object.entries(origin).forEach(([k, v]) => { base[k] += v; });
  empire.ethics.forEach((ethic) => {
    const mod = stellarisEmpireDefs.ethics[ethic];
    if (!mod) return;
    Object.entries(mod).forEach(([k, v]) => { base[k] += v; });
  });
  empire.civics.forEach((civic) => {
    const mod = stellarisEmpireDefs.civics[civic];
    if (!mod) return;
    Object.entries(mod).forEach(([k, v]) => { base[k] += v; });
  });
  let traitPoints = 0;
  empire.traits.forEach((trait) => {
    const mod = stellarisEmpireDefs.traits[trait];
    if (!mod) return;
    traitPoints += mod.points;
    Object.entries(mod).forEach(([k, v]) => {
      if (k === "points") return;
      base[k] += v;
    });
  });
  return { ...base, traitPoints };
}

function selectOptionsFromObject(defs, selected) {
  return Object.keys(defs).map((key) => `<option value="${key}" ${key === selected ? "selected" : ""}>${key.replace(/_/g, " ")}</option>`).join("");
}

function renderStellarisConstructor() {
  const content = document.getElementById("constructors-content");
  content.classList.add("under-construction");
  
  const mode = stellarisState.mode;
  const modeTabs = `
    <div class="template-actions">
      <button type="button" class="sections-btn ${mode === "ship" ? "primary" : ""}" data-stellaris-mode="ship">Ship Designer</button>
      <button type="button" class="sections-btn ${mode === "empire" ? "primary" : ""}" data-stellaris-mode="empire">Empire Builder</button>
    </div>
  `;
  
  const overlay = `
    <div class="construction-overlay">
      <div class="construction-badge">Временно недоступно</div>
      <div class="construction-text">Ведутся технические работы по обновлению модулей Stellaris</div>
    </div>
  `;

  if (mode === "ship") {
    const ship = stellarisState.ship;
    const sections = stellarisShipDefs.sections[ship.hull] || [];
    if (!sections.includes(ship.section)) ship.section = sections[0];
    const stats = calculateStellarisShipStats();
    content.innerHTML = `
      ${overlay}
      <article class="constructor-card">
        <header><h3>Stellaris — Ship Designer</h3><small>Секции, вооружение, защита, энергия и стоимость</small></header>
        ${modeTabs}
        <div class="constructor-grid">
          <div class="constructor-module">
            <label class="division-inline-label">Класс корпуса</label>
            <select id="st-hull" class="division-select">${selectOptionsFromObject(stellarisShipDefs.sections, ship.hull)}</select>
            <label class="division-inline-label">Секция</label>
            <select id="st-section" class="division-select">${sections.map((key) => `<option value="${key}" ${key === ship.section ? "selected" : ""}>${key.replace(/_/g, " ")}</option>`).join("")}</select>
            <label class="division-inline-label">Оружие</label>
            <select id="st-weapon" class="division-select">${selectOptionsFromObject(stellarisShipDefs.weapons, ship.weapon)}</select>
            <label class="division-inline-label">Защита</label>
            <select id="st-defense" class="division-select">${selectOptionsFromObject(stellarisShipDefs.defenses, ship.defense)}</select>
            <label class="division-inline-label">Реактор</label>
            <select id="st-reactor" class="division-select">${selectOptionsFromObject(stellarisShipDefs.reactors, ship.reactor)}</select>
            <label class="division-inline-label">Utility слотов: <strong id="st-utility-value">${ship.utilitySlots}</strong></label>
            <input id="st-utility" type="range" min="1" max="6" step="1" value="${ship.utilitySlots}" />
          </div>
          <div class="constructor-module">
            <strong>Боевые показатели</strong>
            <p>DPS vs Shields: <strong>${stats.dpsShield}</strong></p>
            <p>DPS vs Armor: <strong>${stats.dpsArmor}</strong></p>
            <p>DPS vs Hull: <strong>${stats.dpsHull}</strong></p>
            <p>Shields / Armor / Hull: <strong>${stats.shield} / ${stats.armor} / ${stats.hull}</strong></p>
            <p>Энергия: <strong>${stats.powerUse}/${stats.availablePower}</strong></p>
            <p>Стоимость сплавов: <strong>${stats.alloys}</strong></p>
            <div class="division-stat-bar ${stats.powerUse <= stats.availablePower ? "quality-good" : "quality-low"}"><i style="width:${Math.min(100, Math.round((stats.powerUse * 100) / Math.max(1, stats.availablePower)))}%"></i></div>
          </div>
        </div>
      </article>
    `;
    return;
  }

  const empireStats = calculateStellarisEmpireStats();
  const ethicOptions = Object.keys(stellarisEmpireDefs.ethics).map((key) => `
    <label class="stellaris-check">
      <input type="checkbox" value="${key}" ${stellarisState.empire.ethics.includes(key) ? "checked" : ""} data-ethic>
      ${key.replace(/_/g, " ")}
    </label>
  `).join("");
  const civicOptions = Object.keys(stellarisEmpireDefs.civics).map((key) => `<option value="${key}" ${stellarisState.empire.civics.includes(key) ? "selected" : ""}>${key.replace(/_/g, " ")}</option>`).join("");
  const traitOptions = Object.keys(stellarisEmpireDefs.traits).map((key) => `<option value="${key}" ${stellarisState.empire.traits.includes(key) ? "selected" : ""}>${key.replace(/_/g, " ")}</option>`).join("");
  content.innerHTML = `
    ${overlay}
    <article class="constructor-card">
      <header><h3>Stellaris — Empire Builder</h3><small>Origin, Ethics, Civics и черты расы</small></header>
      ${modeTabs}
      <div class="constructor-grid">
        <div class="constructor-module">
          <label class="division-inline-label">Origin</label>
          <select id="st-origin" class="division-select">${selectOptionsFromObject(stellarisEmpireDefs.origins, stellarisState.empire.origin)}</select>
          <label class="division-inline-label">Ethics (до 3)</label>
          <div class="stellaris-check-grid">${ethicOptions}</div>
          <label class="division-inline-label">Civics (до 2)</label>
          <select id="st-civics" class="division-select" multiple size="4">${civicOptions}</select>
          <label class="division-inline-label">Traits (очки <= 2)</label>
          <select id="st-traits" class="division-select" multiple size="5">${traitOptions}</select>
        </div>
        <div class="constructor-module">
          <strong>Итог империи</strong>
          <p>Экономика: <strong>${empireStats.economy}</strong></p>
          <p>Военный потенциал: <strong>${empireStats.military}</strong></p>
          <p>Дипломатия: <strong>${empireStats.diplomacy}</strong></p>
          <p>Trait points: <strong>${empireStats.traitPoints}</strong></p>
          <div class="division-stat-bar ${empireStats.traitPoints <= 2 ? "quality-good" : "quality-low"}"><i style="width:${Math.min(100, Math.round(((empireStats.traitPoints + 4) * 100) / 10))}%"></i></div>
        </div>
      </div>
    </article>
  `;
}

function renderConstructorsHub(activeKey = "hoi4") {
  constructorsActiveTab = activeKey;
  const tabs = document.getElementById("constructors-tabs");
  const content = document.getElementById("constructors-content");
  const market = document.getElementById("constructors-market");
  
  content.classList.remove("under-construction"); // Сбрасываем размытие по умолчанию

  tabs.innerHTML = Object.entries(constructorsCatalog).map(([key, entry]) => `
    <button type="button" class="sections-btn ${key === activeKey ? "primary" : ""}" data-constructor-tab="${key}">${entry.title}</button>
  `).join("");
  
  market.classList.toggle("hidden", activeKey !== "market");
  content.classList.toggle("hidden", activeKey === "market");
  
  if (activeKey === "market") {
    renderMarket();
    tabs.querySelectorAll("[data-constructor-tab]").forEach((button) => {
      button.addEventListener("click", () => renderConstructorsHub(button.dataset.constructorTab));
    });
    return;
  }
  
  const active = constructorsCatalog[activeKey];
  if (activeKey === "stellaris") {
    renderStellarisConstructor();
  } else if (activeKey === "ck3") {
    renderCk3Constructor();
  } else if (activeKey === "vic3") {
    renderVic3Constructor();
  } else {
    content.innerHTML = `
      <article class="constructor-card">
        <header>
          <h3>${active.title}</h3>
          <small>${active.subtitle}</small>
        </header>
        <div class="template-actions">
          <button type="button" class="sections-btn primary" id="open-hoi4-live">Открыть конструктор HOI4</button>
        </div>
        <div class="template-status">Конструктор HOI4 открыт как отдельный рабочий режим.</div>
      </article>
    `;
    document.getElementById("open-hoi4-live")?.addEventListener("click", () => {
      document.getElementById("constructors-modal")?.classList.add("hidden");
      document.getElementById("tools-modal")?.classList.remove("hidden");
      loadTemplates();
    });
  }
  
  tabs.querySelectorAll("[data-constructor-tab]").forEach((button) => {
    button.addEventListener("click", () => renderConstructorsHub(button.dataset.constructorTab));
  });
}

function renderCk3Constructor() {
  const content = document.getElementById("constructors-content");
  content.classList.add("under-construction");
  content.innerHTML = `
    <div class="construction-overlay">
      <div class="construction-badge">Временно недоступно</div>
      <div class="construction-text">Ведутся технические работы по обновлению модулей CK3</div>
    </div>
    <article class="constructor-card">
      <header><h3>CK3 — Ruler Designer</h3><small>Выбор черт, образования и веры</small></header>
      <div class="constructor-grid">
        <div class="constructor-module">
          <label class="division-inline-label">Образование</label>
          <select class="division-select">
            <option>Умелый управленец</option>
            <option>Блестящий стратег</option>
            <option>Мастер интриг</option>
          </select>
          <label class="division-inline-label">Черты личности</label>
          <div class="stellaris-check-grid">
            <label class="stellaris-check"><input type="checkbox"> Амбициозный</label>
            <label class="stellaris-check"><input type="checkbox"> Справедливый</label>
            <label class="stellaris-check"><input type="checkbox"> Гневный</label>
          </div>
        </div>
        <div class="constructor-module">
          <strong>Показатели</strong>
          <p>Дипломатия: <strong>12</strong></p>
          <p>Военное дело: <strong>15</strong></p>
          <p>Управление: <strong>10</strong></p>
          <button class="sections-btn primary" style="width:100%;margin-top:10px">Сохранить правителя</button>
        </div>
      </div>
    </article>
  `;
}

function renderVic3Constructor() {
  const content = document.getElementById("constructors-content");
  content.classList.add("under-construction");
  content.innerHTML = `
    <div class="construction-overlay">
      <div class="construction-badge">Временно недоступно</div>
      <div class="construction-text">Ведутся технические работы по обновлению модулей Victoria 3</div>
    </div>
    <article class="constructor-card">
      <header><h3>Victoria 3 — Law Maker</h3><small>Управление законами и институтами</small></header>
      <div class="constructor-grid">
        <div class="constructor-module">
          <label class="division-inline-label">Структура власти</label>
          <select class="division-select">
            <option>Монархия</option>
            <option>Республика</option>
            <option>Теократия</option>
          </select>
          <label class="division-inline-label">Экономика</label>
          <select class="division-select">
            <option>Laissez-Faire</option>
            <option>Интервенционизм</option>
            <option>Аграризм</option>
          </select>
        </div>
        <div class="constructor-module">
          <strong>Эффекты</strong>
          <p>Легитимность: <strong>75%</strong></p>
          <p>Радикализм: <strong>-5%</strong></p>
          <button class="sections-btn primary" style="width:100%;margin-top:10px">Принять законы</button>
        </div>
      </div>
    </article>
  `;
}

const mockMarketTemplates = [
  { id: 101, type: "hoi4", name: "7/2 Meta Infantry", author: "PdxPro", likes: 125, stats: "Width: 21, Org: 45, Soft: 120" },
  { id: 102, type: "stellaris", name: "Void Dweller Mega-Corp", author: "SpaceBaron", likes: 89, stats: "Econ: +25%, Tech: +15%" },
  { id: 103, type: "hoi4", name: "Space Marine 1941", author: "GeneralG", likes: 210, stats: "Width: 42, Armor: 15, Pierce: 12" }
];

function renderMarket() {
  const list = document.getElementById("market-list");
  list.innerHTML = "";
  
  mockMarketTemplates.forEach(item => {
    const card = document.createElement("div");
    card.className = "market-item";
    card.innerHTML = `
      <div class="market-item-header">
        <span class="market-item-title">${item.name}</span>
        <span class="market-item-tag">${item.type}</span>
      </div>
      <div class="market-item-meta">Автор: ${item.author}</div>
      <div class="market-item-stats">${item.stats}</div>
      <div class="market-item-actions">
        <button class="market-like-btn">❤️ ${item.likes}</button>
        <button class="sections-btn">Копировать</button>
      </div>
    `;
    list.appendChild(card);
  });
}

function setupConstructorsModal() {
  const modal = document.getElementById("constructors-modal");
  const openModal = (event) => {
    event?.preventDefault();
    modal.classList.remove("hidden");
    renderConstructorsHub(constructorsActiveTab);
  };
  const closeModal = () => modal.classList.add("hidden");
  document.querySelectorAll("[data-open-constructors]").forEach((btn) => btn.addEventListener("click", openModal));
  document.getElementById("constructors-modal-close").addEventListener("click", closeModal);
  document.getElementById("constructors-modal-close-bg").addEventListener("click", closeModal);
}

// --- Modding Tools ---

function renderModdingContent() {
  const content = document.getElementById("modding-content");
  const tab = moddingState.activeTab;

  if (tab === "country") {
    content.innerHTML = `
      <div class="mod-grid">
        <div class="mod-panel">
          <h3>Редактор страны</h3>
          <div class="field-group">
            <label>Тэг (TAG)</label>
            <input type="text" id="mod-tag" value="${moddingState.country.tag}" maxlength="3">
          </div>
          <div class="field-group">
            <label>Название</label>
            <input type="text" id="mod-name" value="${moddingState.country.name}">
          </div>
          <div class="field-group">
            <label>Цвет на карте</label>
            <input type="color" id="mod-color" value="${moddingState.country.color}">
          </div>
          <div class="field-group">
            <label>ID Столицы</label>
            <input type="number" id="mod-capital" value="${moddingState.country.capital}">
          </div>
          <button class="sections-btn primary" id="mod-gen-country">Сгенерировать код</button>
        </div>
        <div class="mod-panel">
          <h3>Результат (countries/*.txt)</h3>
          <pre id="mod-output" class="mod-code-block"></pre>
        </div>
      </div>
    `;
    document.getElementById("mod-gen-country").addEventListener("click", generateCountryCode);
  } else if (tab === "focus") {
    content.innerHTML = `
      <div class="mod-focus-editor">
        <div class="mod-focus-toolbar">
          <button class="sections-btn" id="mod-add-focus">Добавить фокус</button>
          <select id="mod-focus-templates" class="division-select" style="width: auto;">
            <option value="">Применить пресет ветки...</option>
            ${moddingPresets.templates.map(t => `<option value="${t.id}">${t.name}</option>`).join("")}
          </select>
          <button class="sections-btn" id="mod-gen-focus">Экспорт дерева</button>
          <button class="sections-btn" id="mod-clear-focus">Очистить</button>
        </div>
        <div class="mod-focus-layout">
          <div id="mod-focus-canvas" class="mod-focus-canvas">
            <div class="focus-grid-bg"></div>
          </div>
          <div id="mod-focus-inspector" class="mod-panel mod-inspector hidden">
            <h3>Свойства фокуса</h3>
            <div class="field-group">
              <label>ID</label>
              <input type="text" id="node-id">
            </div>
            <div class="field-group">
              <label>Эффекты (код)</label>
              <textarea id="node-effects" class="mod-textarea" style="height: 100px;"></textarea>
            </div>
            <div class="field-group">
              <label>Быстрые пресеты эффектов</label>
              <div class="mod-preset-grid">
                ${moddingPresets.effects.map(e => `<button class="sections-btn" data-effect-code="${e.code}">${e.name}</button>`).join("")}
              </div>
            </div>
            <button class="sections-btn primary" id="save-node">Применить</button>
            <button class="sections-btn" id="delete-node">Удалить фокус</button>
          </div>
        </div>
      </div>
    `;
    renderFocusTree();
    document.getElementById("mod-add-focus").addEventListener("click", addFocusNode);
    document.getElementById("mod-gen-focus").addEventListener("click", generateFocusCode);
    document.getElementById("mod-clear-focus").addEventListener("click", () => {
      moddingState.focusTree.nodes = [];
      moddingState.selectedFocusIndex = null;
      renderFocusTree();
      document.getElementById("mod-focus-inspector").classList.add("hidden");
    });
    document.getElementById("mod-focus-templates").addEventListener("change", (e) => {
      const template = moddingPresets.templates.find(t => t.id === e.target.value);
      if (template) {
        moddingState.focusTree.nodes.push(...JSON.parse(JSON.stringify(template.nodes)));
        renderFocusTree();
      }
      e.target.value = "";
    });
  } else if (tab === "syntax") {
    content.innerHTML = `
      <div class="mod-syntax-editor">
        <h3>Проверка синтаксиса</h3>
        <div class="mod-syntax-toolbar">
          <select id="mod-syntax-snippets" class="division-select" style="width: auto; margin-bottom: 10px;">
            <option value="">Вставить сниппет...</option>
            <option value="event">Шаблон события</option>
            <option value="spirit">Шаблон нац. духа</option>
            <option value="decision">Шаблон решения</option>
          </select>
        </div>
        <textarea id="mod-syntax-input" placeholder="Вставьте код скрипта (события, фокусы)..." class="mod-textarea"></textarea>
        <div id="mod-syntax-results" class="mod-results"></div>
        <button class="sections-btn" id="mod-check-syntax">Проверить</button>
      </div>
    `;
    document.getElementById("mod-check-syntax").addEventListener("click", checkSyntax);
    document.getElementById("mod-syntax-snippets").addEventListener("change", (e) => {
      const snippets = {
        event: `country_event = {\n\tid = test.1\n\ttitle = test.1.t\n\tdesc = test.1.d\n\tpicture = GFX_report_event_generic\n\n\tis_triggered_only = yes\n\n\toption = {\n\t\tname = test.1.a\n\t\tadd_political_power = 10\n\t}\n}`,
        spirit: `my_spirit = {\n\ticon = GFX_idea_generic_spirit\n\tmodifier = {\n\t\tstability_factor = 0.1\n\t\tindustrial_capacity_factory = 0.05\n\t}\n}`,
        decision: `my_decision_category = {\n\tmy_decision = {\n\t\ticon = GFX_decision_generic\n\t\tcost = 50\n\t\tcomplete_effect = {\n\t\t\tadd_stability = 0.05\n\t\t}\n\t}\n}`
      };
      if (snippets[e.target.value]) {
        const textarea = document.getElementById("mod-syntax-input");
        textarea.value += (textarea.value ? "\n\n" : "") + snippets[e.target.value];
      }
      e.target.value = "";
    });
  } else if (tab === "logs") {
    content.innerHTML = `
      <div class="mod-log-parser">
        <h3>Парсер логов (error.log)</h3>
        <input type="file" id="mod-log-file" class="hidden">
        <label for="mod-log-file" class="sections-btn">Загрузить error.log</label>
        <div id="mod-log-results" class="mod-results"></div>
      </div>
    `;
    document.getElementById("mod-log-file").addEventListener("change", parseErrorLog);
  } else if (tab === "simulation") {
    content.innerHTML = `
      <div class="mod-simulation">
        <h3>Симуляция триггеров</h3>
        <div class="mod-grid">
          <div class="mod-panel">
            <div class="field-group">
              <label>Страна</label>
              <select id="sim-country" class="division-select">
                <option value="GER">Германия (GER)</option>
                <option value="SOV">СССР (SOV)</option>
                <option value="USA">США (USA)</option>
                <option value="ENG">Великобритания (ENG)</option>
              </select>
            </div>
            <div class="field-group">
              <label>Год</label>
              <input type="number" id="sim-year" value="1939" min="1936" max="1950">
            </div>
            <div class="field-group">
              <label>В войне?</label>
              <input type="checkbox" id="sim-war">
            </div>
            <div class="field-group">
              <label>Код триггера</label>
              <textarea id="sim-trigger-code" class="mod-textarea" style="height: 100px;">has_war = yes
year > 1938
tag = GER</textarea>
            </div>
            <button class="sections-btn primary" id="run-sim">Запустить симуляцию</button>
          </div>
          <div class="mod-panel">
            <h3>Результат симуляции</h3>
            <div id="sim-results" class="mod-results"></div>
          </div>
        </div>
      </div>
    `;
    document.getElementById("run-sim").addEventListener("click", runSimulation);
  }
}

function runSimulation() {
  const country = document.getElementById("sim-country").value;
  const year = parseInt(document.getElementById("sim-year").value);
  const isAtWar = document.getElementById("sim-war").checked;
  const code = document.getElementById("sim-trigger-code").value;
  const results = document.getElementById("sim-results");

  results.innerHTML = "Анализ триггеров...<br>";

  const lines = code.split("\n");
  let allPassed = true;

  lines.forEach(line => {
    if (!line.trim()) return;
    let passed = false;
    let detail = "";

    if (line.includes("has_war")) {
      const val = line.split("=")[1].trim();
      passed = (val === "yes") === isAtWar;
      detail = `Состояние войны: ${isAtWar ? "да" : "нет"}`;
    } else if (line.includes("year")) {
      const parts = line.split(/[><=]/);
      const val = parseInt(parts[parts.length - 1].trim());
      if (line.includes(">")) passed = year > val;
      else if (line.includes("<")) passed = year < val;
      else passed = year === val;
      detail = `Текущий год: ${year}`;
    } else if (line.includes("tag")) {
      const val = line.split("=")[1].trim();
      passed = val === country;
      detail = `Текущий тег: ${country}`;
    } else {
      detail = "Неизвестный триггер (пропущен)";
      passed = true;
    }

    if (!passed) allPassed = false;
    results.innerHTML += `<div class="${passed ? 'mod-success' : 'mod-error'}">
      [${passed ? 'PASS' : 'FAIL'}] ${line.trim()} — ${detail}
    </div>`;
  });

  results.innerHTML += `<hr><div style="font-weight: bold; font-size: 1rem; color: ${allPassed ? 'var(--green-achieved)' : 'var(--red-alert)'}">
    ИТОГ: ${allPassed ? "ТРИГГЕР СРАБОТАЕТ" : "ТРИГГЕР НЕ СРАБОТАЕТ"}
  </div>`;
}

function generateCountryCode() {
  const tag = document.getElementById("mod-tag").value.toUpperCase();
  const name = document.getElementById("mod-name").value;
  const color = document.getElementById("mod-color").value;
  const capital = document.getElementById("mod-capital").value;

  // Convert hex to RGB for HOI4
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  const code = `
# Country file for ${tag} - ${name}
graphical_culture = western_european
graphical_culture_2d = western_european_2d

color = { ${r} ${g} ${b} }

set_technology = {
	infantry_weapons = 1
	interwar_artillery = 1
}

set_capital = ${capital}
  `.trim();

  document.getElementById("mod-output").textContent = code;
}

function renderFocusTree() {
  const canvas = document.getElementById("mod-focus-canvas");
  if (!canvas) return;
  
  const existingNodes = canvas.querySelectorAll(".focus-node");
  existingNodes.forEach(n => n.remove());

  moddingState.focusTree.nodes.forEach((node, index) => {
    const el = document.createElement("div");
    el.className = `focus-node ${moddingState.selectedFocusIndex === index ? "selected" : ""}`;
    el.style.left = `${node.x}px`;
    el.style.top = `${node.y}px`;
    el.innerHTML = `
      <div class="focus-node-title">${node.id}</div>
      <div class="focus-node-coords">${node.x}, ${node.y}</div>
    `;
    
    el.draggable = true;
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      openFocusInspector(index);
    });

    el.addEventListener("dragend", (e) => {
      const rect = canvas.getBoundingClientRect();
      node.x = Math.max(0, Math.round((e.clientX - rect.left - 60) / 10) * 10);
      node.y = Math.max(0, Math.round((e.clientY - rect.top - 40) / 10) * 10);
      renderFocusTree();
      if (moddingState.selectedFocusIndex === index) {
        openFocusInspector(index);
      }
    });
    canvas.appendChild(el);
  });
}

function openFocusInspector(index) {
  moddingState.selectedFocusIndex = index;
  const node = moddingState.focusTree.nodes[index];
  const inspector = document.getElementById("mod-focus-inspector");
  inspector.classList.remove("hidden");

  document.getElementById("node-id").value = node.id;
  document.getElementById("node-effects").value = node.effects;

  // Render nodes with selection
  renderFocusTree();

  // Setup inspector buttons
  const saveBtn = document.getElementById("save-node");
  const deleteBtn = document.getElementById("delete-node");
  
  // Clone to remove old listeners
  const newSaveBtn = saveBtn.cloneNode(true);
  saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
  const newDeleteBtn = deleteBtn.cloneNode(true);
  deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);

  newSaveBtn.addEventListener("click", () => {
    node.id = document.getElementById("node-id").value;
    node.effects = document.getElementById("node-effects").value;
    renderFocusTree();
    showToast("Свойства фокуса сохранены", "success");
  });

  newDeleteBtn.addEventListener("click", () => {
    moddingState.focusTree.nodes.splice(index, 1);
    moddingState.selectedFocusIndex = null;
    inspector.classList.add("hidden");
    renderFocusTree();
  });

  // Setup preset buttons
  document.querySelectorAll("[data-effect-code]").forEach(btn => {
    btn.onclick = () => {
      const textarea = document.getElementById("node-effects");
      const current = textarea.value.trim();
      textarea.value = current ? `${current}\n${btn.dataset.effectCode}` : btn.dataset.effectCode;
    };
  });
}

function addFocusNode() {
  const id = prompt("Введите ID фокуса:", "new_focus");
  if (!id) return;
  moddingState.focusTree.nodes.push({
    id,
    x: 50,
    y: 50,
    effects: "add_political_power = 50"
  });
  renderFocusTree();
}

function generateFocusCode() {
  let code = "focus_tree = {\n\tid = new_tree\n\t\n";
  moddingState.focusTree.nodes.forEach(node => {
    code += `\tfocus = {\n\t\tid = ${node.id}\n\t\tx = ${Math.floor(node.x / 50)}\n\t\ty = ${Math.floor(node.y / 50)}\n\t\tcompletion_reward = {\n\t\t\t${node.effects}\n\t\t}\n\t}\n\n`;
  });
  code += "}";
  
  const blob = new Blob([code], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "focus_tree.txt";
  a.click();
}

function checkSyntax() {
  const input = document.getElementById("mod-syntax-input").value;
  const results = document.getElementById("mod-syntax-results");
  results.innerHTML = "";

  let openBrackets = 0;
  let errors = [];

  for (let i = 0; i < input.length; i++) {
    if (input[i] === "{") openBrackets++;
    if (input[i] === "}") openBrackets--;
    if (openBrackets < 0) {
      errors.push(`Лишняя закрывающая скобка на позиции ${i}`);
      openBrackets = 0;
    }
  }

  if (openBrackets > 0) {
    errors.push(`Не закрыто скобок: ${openBrackets}`);
  }

  // Simple token check
  const tokens = input.split(/\s+/);
  const knownTokens = ["focus", "id", "completion_reward", "add_political_power", "set_technology", "country_event"];
  tokens.forEach(t => {
    if (t.includes("=") && !knownTokens.some(kt => t.startsWith(kt)) && t.length > 2) {
      // Very basic check for potential typos in common commands
      // results.innerHTML += `<div class="mod-warn">Предупреждение: возможный неизвестный токен "${t.split('=')[0]}"</div>`;
    }
  });

  if (errors.length === 0) {
    results.innerHTML = '<div class="mod-success">Синтаксических ошибок не найдено (базовая проверка).</div>';
  } else {
    errors.forEach(e => {
      results.innerHTML += `<div class="mod-error">${e}</div>`;
    });
  }
}

function parseErrorLog(event) {
  const file = event.target.files[0];
  if (!file) return;

  const results = document.getElementById("mod-log-results");
  results.innerHTML = "Парсинг...";

  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target.result;
    const lines = content.split("\n");
    let output = "";

    const commonErrors = [
      { pattern: "Unexpected token", solution: "Проверьте закрывающие скобки } или опечатки в командах." },
      { pattern: "Unknown trait", solution: "Черта лидера не определена в файлах traits." },
      { pattern: "Malformed token", solution: "Ошибка в структуре команды, возможно пропущен '='." },
      { pattern: "Failed to create", solution: "Ошибка графики или путей к файлам .dds/.tga." }
    ];

    lines.forEach(line => {
      if (line.includes("[") && line.includes("]")) {
        let type = "info";
        let solution = "";
        
        commonErrors.forEach(ce => {
          if (line.includes(ce.pattern)) {
            type = "error";
            solution = ce.solution;
          }
        });

        output += `<div class="mod-log-line ${type}">
          <span class="log-text">${line}</span>
          ${solution ? `<div class="log-solution">Решение: ${solution}</div>` : ""}
        </div>`;
      }
    });

    results.innerHTML = output || "Ошибок не найдено.";
  };
  reader.readAsText(file);
}

function setupModdingModal() {
  const modal = document.getElementById("modding-modal");
  const openModal = (event) => {
    event?.preventDefault();
    modal.classList.remove("hidden");
    renderModdingContent();
  };
  const closeModal = () => modal.classList.add("hidden");
  
  document.querySelectorAll("[data-open-modding]").forEach((btn) => btn.addEventListener("click", openModal));
  document.getElementById("modding-modal-close").addEventListener("click", closeModal);
  document.getElementById("modding-modal-close-bg").addEventListener("click", closeModal);

  document.querySelectorAll("[data-mod-tab]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-mod-tab]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      moddingState.activeTab = btn.dataset.modTab;
      renderModdingContent();
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });
}

const lineBattalionDefs = [
  { id: "infantry", name: "Пехота", width: 2, hp: 25, org: 60, soft: 12, hard: 1, break: 4, def: 20, pierce: 1, armor: 0, icon: "inf", role: "Линейная пехота: держит фронт и организацию.", equipment: { infantry: 900 }, resources: { steel: 2 }, year: 1936 },
  { id: "artillery", name: "Артиллерия", width: 3, hp: 12, org: 20, soft: 36, hard: 2, break: 6, def: 10, pierce: 2, armor: 0, icon: "art", role: "Удар по пехоте, но снижает общую организацию.", equipment: { artillery: 36, infantry: 500 }, resources: { steel: 2, tungsten: 1 }, year: 1936 },
  { id: "motorized", name: "Мотопехота", width: 2, hp: 24, org: 58, soft: 14, hard: 2, break: 8, def: 18, pierce: 1, armor: 0, icon: "truck", role: "Быстрая пехота для мобильных операций.", equipment: { infantry: 800 }, resources: { steel: 2 }, year: 1936 },
  { id: "mechanized", name: "Мех. пехота", width: 2, hp: 30, org: 52, soft: 18, hard: 6, break: 12, def: 24, pierce: 3, armor: 10, icon: "mech", role: "Более крепкая мобильная линия.", equipment: { infantry: 700 }, resources: { steel: 3 }, year: 1939 },
  { id: "medium_tank", name: "Средние танки", width: 2, hp: 18, org: 30, soft: 26, hard: 24, break: 42, def: 14, pierce: 35, armor: 60, icon: "tank", role: "Прорыв и бронебойность, требует пехотного ядра.", equipment: { infantry: 300 }, resources: { steel: 3, tungsten: 2 }, year: 1939 },
  { id: "super_heavy_tank", name: "Сверхтяжёлые танки", width: 2, hp: 40, org: 15, soft: 45, hard: 50, break: 60, def: 20, pierce: 80, armor: 120, icon: "tank", role: "Максимальная броня и огневая мощь.", equipment: { infantry: 200 }, resources: { steel: 5, chromium: 4 }, year: 1942 },
  { id: "modern_tank", name: "Современные танки", width: 2, hp: 25, org: 25, soft: 40, hard: 45, break: 55, def: 18, pierce: 90, armor: 100, icon: "tank", role: "Лучшие танки поздней игры.", equipment: { infantry: 250 }, resources: { steel: 4, chromium: 3 }, year: 1945 },
  { id: "rocket_art", name: "Реактивная арт.", width: 3, hp: 10, org: 15, soft: 42, hard: 1, break: 5, def: 8, pierce: 1, armor: 0, icon: "art", role: "Высокая противопехотная мощь.", equipment: { artillery: 30 }, resources: { steel: 2, tungsten: 1 }, year: 1939 },
  { id: "amphibious_inf", name: "Амфибийная пехота", width: 2, hp: 22, org: 55, soft: 10, hard: 1, break: 10, def: 15, pierce: 1, armor: 0, icon: "inf", role: "Эффективна при высадках и переправах.", equipment: { infantry: 850 }, resources: { steel: 2 }, year: 1939 },
  { id: "aa_line", name: "Линейное ПВО", width: 1, hp: 10, org: 20, soft: 3, hard: 12, break: 2, def: 8, pierce: 20, armor: 0, icon: "aa", role: "Защита от авиации и часть hard attack.", equipment: { artillery: 12 }, resources: { steel: 1 }, year: 1936 },
  { id: "at_line", name: "Линейное ПТО", width: 1, hp: 10, org: 20, soft: 2, hard: 20, break: 1, def: 6, pierce: 50, armor: 0, icon: "at", role: "Контр-танковая роль на линии.", equipment: { artillery: 12 }, resources: { steel: 1, tungsten: 1 }, year: 1936 }
];

const supportCompanyDefs = [
  { id: "eng", name: "Инженеры", org: 2, soft: 2, hard: 0, break: 2, def: 15, pierce: 0, armor: 0, icon: "eng", role: "Бонусы в обороне и на переправах.", equipment: { support: 30 }, resources: { steel: 1 }, year: 1936 },
  { id: "recon", name: "Разведка", org: 1, soft: 1, hard: 0, break: 3, def: 4, pierce: 0, armor: 0, icon: "recon", role: "Инициатива и выбор тактики.", equipment: { support: 30 }, resources: { steel: 1 }, year: 1936 },
  { id: "sup_art", name: "Поддержка арт.", org: 0, soft: 12, hard: 1, break: 2, def: 4, pierce: 1, armor: 0, icon: "art", role: "Дешевый рост soft attack.", equipment: { support: 30, artillery: 24 }, resources: { steel: 1, tungsten: 1 }, year: 1936 },
  { id: "log", name: "Логистика", org: 0, soft: 0, hard: 0, break: 0, def: 0, pierce: 0, armor: 0, icon: "log", role: "Снижение расхода снабжения.", equipment: { support: 30 }, resources: { steel: 1 }, year: 1936 },
  { id: "signal", name: "Связь", org: 0, soft: 0, hard: 0, break: 0, def: 0, pierce: 0, armor: 0, icon: "signal", role: "Быстрое вступление в бой и инициатива.", equipment: { support: 30 }, resources: { steel: 1 }, year: 1939 },
  { id: "maintenance", name: "Ремрота", org: 0, soft: 0, hard: 0, break: 0, def: 0, pierce: 0, armor: 0, icon: "wrench", role: "Надежность и захват техники.", equipment: { support: 30 }, resources: { steel: 1 }, year: 1936 },
  { id: "aa", name: "Поддержка ПВО", org: 0, soft: 4, hard: 8, break: 1, def: 3, pierce: 15, armor: 0, icon: "aa", role: "ПВО в слоте поддержки.", equipment: { support: 30, artillery: 12 }, resources: { steel: 1 }, year: 1936 }
];

const unitTypeById = {
  infantry: "infantry",
  artillery: "artillery",
  motorized: "mobile",
  mechanized: "mobile",
  medium_tank: "armor",
  super_heavy_tank: "armor",
  modern_tank: "armor",
  rocket_art: "artillery",
  amphibious_inf: "infantry",
  aa_line: "aa",
  at_line: "at",
  eng: "support",
  recon: "support",
  sup_art: "artillery",
  log: "support",
  signal: "support",
  maintenance: "support",
  aa: "aa"
};

const divisionState = {
  lineSlots: Array(25).fill(null),
  supportSlots: Array(5).fill(null),
  selectedLine: null,
  selectedSupport: null,
  previewUnitId: null,
  previewKind: null,
  techLevels: {
    infantry: 0,
    artillery: 0,
    armor: 0,
    support: 0
  },
  doctrineLevel: 0,
  currentYear: 1936
};

const moddingState = {
  activeTab: "country",
  selectedFocusIndex: null,
  country: {
    tag: "NEW",
    name: "New Country",
    color: "#ffffff",
    capital: "1",
    techs: [],
    spirits: []
  },
  focusTree: {
    nodes: []
  }
};

const moddingPresets = {
  effects: [
    { id: "pp_50", name: "Политволя +50", code: "add_political_power = 50" },
    { id: "civ_factory", name: "Гражд. завод", code: "add_offsite_civilian_factories = 1" },
    { id: "mil_factory", name: "Военный завод", code: "add_offsite_ic = 1" },
    { id: "stability_5", name: "Стабильность +5%", code: "add_stability = 0.05" },
    { id: "war_support_5", name: "Поддержка войны +5%", code: "add_war_support = 0.05" },
    { id: "research_slot", name: "Слот исследования", code: "add_research_slot = 1" },
    { id: "annex_country", name: "Аннексия (TAG)", code: "annex_country = { target = TAG transfer_troops = yes }" },
    { id: "add_ideas", name: "Нац. дух", code: "add_ideas = my_national_spirit" }
  ],
  templates: [
    { id: "industry_path", name: "Ветка индустрии", nodes: [
      { id: "ind_1", x: 100, y: 50, effects: "add_political_power = 25" },
      { id: "ind_2", x: 100, y: 150, effects: "add_offsite_civilian_factories = 2" }
    ]},
    { id: "army_path", name: "Ветка армии", nodes: [
      { id: "mil_1", x: 300, y: 50, effects: "add_stability = 0.05" },
      { id: "mil_2", x: 300, y: 150, effects: "army_experience = 20" }
    ]}
  ]
};

const optimalWidths = new Set([20, 21, 27, 42, 45]);

const aiReferenceTemplates = {
  GER: {
    1936: { name: "Немецкая пехотная 1936", line: ["infantry", "infantry", "infantry", "infantry", "infantry", "infantry", "infantry", "infantry", "infantry"], support: ["eng", "recon"] },
    1939: { name: "Немецкая пехотная 1939", line: ["infantry", "infantry", "infantry", "infantry", "infantry", "infantry", "infantry", "artillery", "artillery"], support: ["eng", "recon", "sup_art"] },
    1941: { name: "Немецкая наступательная 1941", line: ["infantry", "infantry", "infantry", "infantry", "infantry", "infantry", "infantry", "artillery", "artillery", "artillery", "artillery"], support: ["eng", "recon", "sup_art", "aa"] }
  },
  SOV: {
    1936: { name: "Советская стрелковая 1936", line: ["infantry", "infantry", "infantry", "infantry", "infantry", "infantry"], support: ["eng"] },
    1939: { name: "Советская стрелковая 1939", line: ["infantry", "infantry", "infantry", "infantry", "infantry", "infantry", "infantry", "artillery"], support: ["eng", "recon"] },
    1941: { name: "Советская усиленная 1941", line: ["infantry", "infantry", "infantry", "infantry", "infantry", "infantry", "infantry", "infantry", "artillery", "artillery"], support: ["eng", "recon", "sup_art"] }
  }
};

const metaTemplates = {
  "7_2": {
    name: "7/2",
    note: "Универсальный бюджетный шаблон ранней/средней игры.",
    line: ["infantry", "infantry", "infantry", "infantry", "infantry", "infantry", "infantry", "artillery", "artillery"],
    support: ["eng", "recon", "sup_art"]
  },
  "14_4": {
    name: "14/4",
    note: "Классика для прорыва пехотой при хорошем снабжении.",
    line: [...Array(14).fill("infantry"), ...Array(4).fill("artillery")],
    support: ["eng", "recon", "sup_art", "signal"]
  },
  space_marine: {
    name: "Space Marine",
    note: "Пехотная масса + танковый батальон для брони и прорыва.",
    line: [...Array(8).fill("infantry"), "medium_tank"],
    support: ["eng", "recon", "maintenance"]
  }
};

function researchMultiplier(level) {
  return 1 + (Number(level || 0) * 0.06);
}

function applyResearchByType(unit, isSupport = false) {
  if (!unit) return unit;
  const type = isSupport ? "support" : (unitTypeById[unit.id] || "support");
  const techGroup = type === "mobile" ? "infantry" : type;
  const techLevel = Number(divisionState.techLevels[techGroup] || 0);
  const techMul = researchMultiplier(techLevel);
  const doctrineMul = 1 + (Number(divisionState.doctrineLevel || 0) * 0.04);
  return {
    ...unit,
    hp: Math.round(unit.hp * techMul),
    org: Math.round(unit.org * doctrineMul),
    soft: Math.round(unit.soft * techMul * doctrineMul),
    hard: Math.round(unit.hard * techMul * doctrineMul),
    break: Math.round(unit.break * techMul * doctrineMul),
    def: Math.round(unit.def * techMul * doctrineMul),
    pierce: Math.round(unit.pierce * techMul),
    armor: Math.round(unit.armor * techMul)
  };
}

function renderPalette() {
  const battalionPalette = document.getElementById("battalion-palette");
  const supportPalette = document.getElementById("support-palette");
  if (!battalionPalette || !supportPalette) return;
  
  const filteredLine = lineBattalionDefs.filter(u => !u.year || u.year <= divisionState.currentYear);
  const filteredSupport = supportCompanyDefs.filter(u => !u.year || u.year <= divisionState.currentYear);

  battalionPalette.innerHTML = filteredLine.map((unit) => `
    <button draggable="true" class="palette-item unit-type-${unitTypeById[unit.id] || "support"} ${divisionState.selectedLine === unit.id ? "active" : ""}" data-pick-line="${unit.id}">
      ${unitIconSvg(unit.icon)} ${unit.name}
    </button>
  `).join("");
  supportPalette.innerHTML = filteredSupport.map((unit) => `
    <button draggable="true" class="palette-item unit-type-${unitTypeById[unit.id] || "support"} ${divisionState.selectedSupport === unit.id ? "active" : ""}" data-pick-support="${unit.id}">
      ${unitIconSvg(unit.icon)} ${unit.name}
    </button>
  `).join("");
  battalionPalette.querySelectorAll("[data-pick-line]").forEach((button) => {
    button.addEventListener("click", () => {
      divisionState.selectedLine = button.dataset.pickLine;
      renderPalette();
    });
    button.addEventListener("mousemove", (e) => {
      const scaled = applyResearchByType(lineBattalionDefs.find(u => u.id === button.dataset.pickLine), false);
      tooltip.show(scaled.name, {
        "Ширина": scaled.width,
        "Орг": scaled.org,
        "Soft Attack": scaled.soft,
        "Hard Attack": scaled.hard,
        "Прорыв": scaled.break,
        "Защита": scaled.def,
        "Piercing": scaled.pierce,
        "Броня": scaled.armor
      }, scaled.role, e.clientX, e.clientY);
    });
    button.addEventListener("mouseleave", () => tooltip.hide());
    button.addEventListener("mouseenter", () => {
      divisionState.previewKind = "line";
      divisionState.previewUnitId = button.dataset.pickLine;
      renderDivisionGrid();
      renderDivisionStats();
    });
    button.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", JSON.stringify({ source: "palette", kind: "line", unitId: button.dataset.pickLine }));
    });
  });
  supportPalette.querySelectorAll("[data-pick-support]").forEach((button) => {
    button.addEventListener("click", () => {
      divisionState.selectedSupport = button.dataset.pickSupport;
      renderPalette();
    });
    button.addEventListener("mousemove", (e) => {
      const scaled = applyResearchByType(supportCompanyDefs.find(u => u.id === button.dataset.pickSupport), true);
      tooltip.show(scaled.name, {
        "Орг": scaled.org,
        "Soft Attack": scaled.soft,
        "Hard Attack": scaled.hard,
        "Прорыв": scaled.break,
        "Защита": scaled.def,
        "Piercing": scaled.pierce
      }, scaled.role, e.clientX, e.clientY);
    });
    button.addEventListener("mouseleave", () => tooltip.hide());
    button.addEventListener("mouseenter", () => {
      divisionState.previewKind = "support";
      divisionState.previewUnitId = button.dataset.pickSupport;
      renderDivisionGrid();
      renderDivisionStats();
    });
    button.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", JSON.stringify({ source: "palette", kind: "support", unitId: button.dataset.pickSupport }));
    });
  });
  [battalionPalette, supportPalette].forEach((palette) => {
    palette.addEventListener("mouseleave", () => {
      divisionState.previewKind = null;
      divisionState.previewUnitId = null;
      renderDivisionGrid();
      renderDivisionStats();
    });
  });
}

function applyUnitToSlot(slotKind, slotIndex, unitId) {
  if (slotKind === "line") divisionState.lineSlots[slotIndex] = unitId || null;
  if (slotKind === "support") divisionState.supportSlots[slotIndex] = unitId || null;
  renderDivisionGrid();
  renderDivisionStats();
}

function parseDragPayload(event) {
  try {
    return JSON.parse(event.dataTransfer.getData("text/plain") || "{}");
  } catch {
    return {};
  }
}

function unitIconSvg(icon) {
  const map = {
    inf: `<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="4" r="2"></circle><path d="M5 14v-3l2-2 1 1 1-1 2 2v3"></path></svg>`,
    art: `<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="4" cy="12" r="2"></circle><circle cx="10" cy="12" r="2"></circle><path d="M2 10h8l3-3M7 10V6h3"></path></svg>`,
    tank: `<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="8" width="10" height="4"></rect><path d="M6 8V6h6M12 6l2 1"></path></svg>`,
    mech: `<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="6" width="10" height="6"></rect><path d="M5 6V4h2v2m2 0V4h2v2"></path></svg>`,
    truck: `<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1" y="7" width="8" height="4"></rect><path d="M9 8h3l2 2v1H9z"></path><circle cx="4" cy="12" r="1.5"></circle><circle cx="11" cy="12" r="1.5"></circle></svg>`,
    aa: `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2v8M4 6h8M6 12h4"></path></svg>`,
    at: `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 12h12M5 12l3-8 3 8"></path></svg>`,
    eng: `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 13l4-4m0 0 2-2m-2 2 4 4m-6-9 3 3"></path></svg>`,
    recon: `<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4"></circle><path d="M10 10l3 3"></path></svg>`,
    log: `<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="4" width="12" height="8"></rect><path d="M5 7h6"></path></svg>`,
    signal: `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 13V3M4 6a6 6 0 0 1 8 0M2 8a8 8 0 0 1 12 0"></path></svg>`,
    wrench: `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9 2a3 3 0 0 0 0 4L4 11l1 1 5-5a3 3 0 0 0 4 0"></path></svg>`
  };
  return `<span class="slot-icon">${map[icon] || map.inf}</span>`;
}

function renderDivisionGrid() {
  const grid = document.getElementById("division-grid");
  const supportGrid = document.getElementById("support-grid");
  if (!grid || !supportGrid) return;
  grid.innerHTML = divisionState.lineSlots.map((unitId, index) => {
    const unit = unitId ? lineBattalionDefs.find((def) => def.id === unitId) : null;
    const unitType = unit ? unitTypeById[unit.id] || "support" : "";
    const previewClass = !unit && divisionState.previewKind === "line" && divisionState.previewUnitId ? "preview-target" : "";
    const level = divisionState.techLevels[unitType === "mobile" ? "infantry" : unitType] || 0;
    return `<button draggable="${unit ? "true" : "false"}" class="division-slot ${unit ? `unit-type-${unitType}` : "empty"} ${previewClass}" data-line-slot="${index}" title="${unit ? `${unit.name} (ур. ${level})` : "Пустой слот"}">${unit ? `${unitIconSvg(unit.icon)}<small>${unit.name} • L${level}</small>` : "Пусто"}</button>`;
  }).join("");
  supportGrid.innerHTML = divisionState.supportSlots.map((unitId, index) => {
    const unit = unitId ? supportCompanyDefs.find((def) => def.id === unitId) : null;
    const unitType = unit ? unitTypeById[unit.id] || "support" : "";
    const previewClass = !unit && divisionState.previewKind === "support" && divisionState.previewUnitId ? "preview-target" : "";
    return `<button draggable="${unit ? "true" : "false"}" class="support-slot ${unit ? `unit-type-${unitType}` : "empty"} ${previewClass}" data-support-slot="${index}" title="${unit ? `${unit.name} (ур. ${divisionState.techLevels.support || 0})` : "Пустой слот"}">${unit ? `${unitIconSvg(unit.icon)}<small>${unit.name} • L${divisionState.techLevels.support || 0}</small>` : "Пусто"}</button>`;
  }).join("");
  grid.querySelectorAll("[data-line-slot]").forEach((button) => {
    button.addEventListener("click", () => {
      applyUnitToSlot("line", Number(button.dataset.lineSlot), divisionState.selectedLine || null);
    });
    button.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      applyUnitToSlot("line", Number(button.dataset.lineSlot), null);
    });
    button.addEventListener("dragstart", (event) => {
      const slotIndex = Number(button.dataset.lineSlot);
      const unitId = divisionState.lineSlots[slotIndex];
      if (!unitId) return;
      event.dataTransfer.setData("text/plain", JSON.stringify({ source: "slot", kind: "line", fromSlot: slotIndex, unitId }));
    });
    button.addEventListener("dragover", (event) => event.preventDefault());
    button.addEventListener("drop", (event) => {
      event.preventDefault();
      const payload = parseDragPayload(event);
      if (payload.kind !== "line") return;
      const target = Number(button.dataset.lineSlot);
      if (payload.source === "slot") {
        const from = Number(payload.fromSlot);
        const prevTarget = divisionState.lineSlots[target];
        divisionState.lineSlots[target] = payload.unitId;
        divisionState.lineSlots[from] = prevTarget || null;
        renderDivisionGrid();
        renderDivisionStats();
        return;
      }
      applyUnitToSlot("line", target, payload.unitId || null);
    });
  });
  supportGrid.querySelectorAll("[data-support-slot]").forEach((button) => {
    button.addEventListener("click", () => {
      applyUnitToSlot("support", Number(button.dataset.supportSlot), divisionState.selectedSupport || null);
    });
    button.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      applyUnitToSlot("support", Number(button.dataset.supportSlot), null);
    });
    button.addEventListener("dragstart", (event) => {
      const slotIndex = Number(button.dataset.supportSlot);
      const unitId = divisionState.supportSlots[slotIndex];
      if (!unitId) return;
      event.dataTransfer.setData("text/plain", JSON.stringify({ source: "slot", kind: "support", fromSlot: slotIndex, unitId }));
    });
    button.addEventListener("dragover", (event) => event.preventDefault());
    button.addEventListener("drop", (event) => {
      event.preventDefault();
      const payload = parseDragPayload(event);
      if (payload.kind !== "support") return;
      const target = Number(button.dataset.supportSlot);
      if (payload.source === "slot") {
        const from = Number(payload.fromSlot);
        const prevTarget = divisionState.supportSlots[target];
        divisionState.supportSlots[target] = payload.unitId;
        divisionState.supportSlots[from] = prevTarget || null;
        renderDivisionGrid();
        renderDivisionStats();
        return;
      }
      applyUnitToSlot("support", target, payload.unitId || null);
    });
  });
}

function calculateDivisionStats() {
  const lineUnits = divisionState.lineSlots.filter(Boolean).map((id) => applyResearchByType(lineBattalionDefs.find((unit) => unit.id === id), false));
  const supportUnits = divisionState.supportSlots.filter(Boolean).map((id) => applyResearchByType(supportCompanyDefs.find((unit) => unit.id === id), true));
  const orgBase = lineUnits.length ? lineUnits.reduce((sum, unit) => sum + unit.org, 0) / lineUnits.length : 0;
  
  const equipment = lineUnits.concat(supportUnits).reduce((acc, unit) => {
    Object.entries(unit.equipment || {}).forEach(([key, value]) => {
      acc[key] = (acc[key] || 0) + Number(value || 0);
    });
    return acc;
  }, { infantry: 0, artillery: 0, support: 0 });

  const resources = lineUnits.concat(supportUnits).reduce((acc, unit) => {
    Object.entries(unit.resources || {}).forEach(([key, value]) => {
      acc[key] = (acc[key] || 0) + Number(value || 0);
    });
    return acc;
  }, { steel: 0, tungsten: 0, chromium: 0 });

  const lineTypes = lineUnits.reduce((acc, unit) => {
    const type = unitTypeById[unit.id];
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  
  const previewDelta = getPreviewDelta();
  
  return {
    width: lineUnits.reduce((sum, unit) => sum + unit.width, 0),
    hp: Math.round(lineUnits.reduce((sum, unit) => sum + unit.hp, 0)),
    org: Math.round(orgBase + supportUnits.reduce((sum, unit) => sum + unit.org, 0)),
    soft: Math.round(lineUnits.reduce((sum, unit) => sum + unit.soft, 0) + supportUnits.reduce((sum, unit) => sum + unit.soft, 0)),
    hard: Math.round(lineUnits.reduce((sum, unit) => sum + unit.hard, 0) + supportUnits.reduce((sum, unit) => sum + unit.hard, 0)),
    break: Math.round(lineUnits.reduce((sum, unit) => sum + unit.break, 0) + supportUnits.reduce((sum, unit) => sum + unit.break, 0)),
    def: Math.round(lineUnits.reduce((sum, unit) => sum + unit.def, 0) + supportUnits.reduce((sum, unit) => sum + unit.def, 0)),
    pierce: Math.max(...lineUnits.concat(supportUnits).map(u => u.pierce || 0), 0),
    armor: Math.max(...lineUnits.concat(supportUnits).map(u => u.armor || 0), 0),
    battalionCount: lineUnits.length,
    supportCount: supportUnits.length,
    xpCost: lineUnits.length * 5 + supportUnits.length * 10,
    icCost: Math.round((equipment.infantry * 0.55) + (equipment.artillery * 3.8) + (equipment.support * 2.2)),
    lineFillPercent: Math.round((lineUnits.length / 25) * 100),
    supportFillPercent: Math.round((supportUnits.length / 5) * 100),
    equipment,
    resources,
    lineTypes,
    previewDelta
  };
}

function statBarMarkup(label, value, max, tone) {
  const percent = Math.max(0, Math.min(100, Math.round((Number(value || 0) * 100) / Math.max(1, max))));
  const quality = percent >= 70 ? "good" : percent >= 40 ? "mid" : "low";
  return `
    <div class="division-stat-row">
      <div class="division-stat-head">
        <span>${label}</span>
        <strong>${value}</strong>
      </div>
      <div class="division-stat-bar tone-${tone} quality-${quality}">
        <i style="width:${percent}%"></i>
      </div>
    </div>
  `;
}

function evaluateTemplate(stats) {
  const warnings = [];
  const errors = [];
  if (!stats.battalionCount && stats.supportCount) {
    errors.push("Только роты поддержки без линейных батальонов.");
  }
  if (stats.width > 45) {
    warnings.push(`Боевая ширина ${stats.width} > 45: дорого в ширине фронта.`);
  }
  if (optimalWidths.has(stats.width)) {
    warnings.push(`Ширина ${stats.width}: оптимально для фронта 80.`);
  }
  const infantryCount = (stats.lineTypes.infantry || 0) + (stats.lineTypes.mobile || 0);
  if ((stats.lineTypes.armor || 0) > 0 && infantryCount === 0) {
    warnings.push("Танки без пехоты: низкая организация.");
  }
  if ((stats.lineTypes.artillery || 0) > 0 && infantryCount === 0) {
    warnings.push("Артиллерия без пехоты: низкая организация.");
  }
  let verdict = "Боеспособен";
  let verdictClass = "ok";
  if (errors.length || stats.battalionCount === 0) {
    verdict = "Нежизнеспособен";
    verdictClass = "bad";
  } else if (warnings.length || stats.org < 35) {
    verdict = "Требует доработки";
    verdictClass = "warn";
  }
  return { warnings, errors, verdict, verdictClass };
}

function getPreviewDelta() {
  if (!divisionState.previewKind || !divisionState.previewUnitId) return null;
  const before = {
    lineSlots: [...divisionState.lineSlots],
    supportSlots: [...divisionState.supportSlots]
  };
  const targetSlots = divisionState.previewKind === "line" ? before.lineSlots : before.supportSlots;
  const targetIndex = targetSlots.findIndex((slot) => !slot);
  if (targetIndex === -1) return null;
  targetSlots[targetIndex] = divisionState.previewUnitId;
  const tmpState = {
    lineSlots: before.lineSlots,
    supportSlots: before.supportSlots
  };
  const calc = (state) => {
    const lineUnits = state.lineSlots.filter(Boolean).map((id) => applyResearchByType(lineBattalionDefs.find((unit) => unit.id === id), false));
    const supportUnits = state.supportSlots.filter(Boolean).map((id) => applyResearchByType(supportCompanyDefs.find((unit) => unit.id === id), true));
    const orgBase = lineUnits.length ? lineUnits.reduce((sum, unit) => sum + unit.org, 0) / lineUnits.length : 0;
    return {
      org: Math.round(orgBase + supportUnits.reduce((sum, unit) => sum + unit.org, 0)),
      soft: Math.round(lineUnits.reduce((sum, unit) => sum + unit.soft, 0) + supportUnits.reduce((sum, unit) => sum + unit.soft, 0))
    };
  };
  const now = calc({ lineSlots: divisionState.lineSlots, supportSlots: divisionState.supportSlots });
  const after = calc(tmpState);
  return { org: after.org - now.org, soft: after.soft - now.soft };
}

function renderAiComparison(stats) {
  const container = document.getElementById("division-ai-compare");
  if (!container) return;
  if (!container.dataset.ready) {
    container.innerHTML = `
      <h3>Сравнение с AI</h3>
      <div class="template-actions">
        <select id="ai-country" class="division-select">
          <option value="GER">Германия</option>
          <option value="SOV">СССР</option>
        </select>
        <select id="ai-year" class="division-select">
          <option value="1936">1936</option>
          <option value="1939">1939</option>
          <option value="1941">1941</option>
        </select>
      </div>
      <div id="ai-compare-table"></div>
    `;
    container.dataset.ready = "1";
    container.querySelector("#ai-country").addEventListener("change", () => renderAiComparison(calculateDivisionStats()));
    container.querySelector("#ai-year").addEventListener("change", () => renderAiComparison(calculateDivisionStats()));
  }
  const country = container.querySelector("#ai-country").value;
  const year = container.querySelector("#ai-year").value;
  const aiTemplate = aiReferenceTemplates[country]?.[year];
  if (!aiTemplate) return;
  const aiStats = calculateStatsForTemplate(aiTemplate.line, aiTemplate.support);
  container.querySelector("#ai-compare-table").innerHTML = `
    <div class="compare-card">
      <h3>Вы vs ${aiTemplate.name}</h3>
      <table class="compare-table">
        <thead><tr><th>Параметр</th><th>Вы</th><th>AI</th></tr></thead>
        <tbody>
          <tr><td>Ширина</td><td>${stats.width}</td><td>${aiStats.width}</td></tr>
          <tr><td>Organization</td><td>${stats.org}</td><td>${aiStats.org}</td></tr>
          <tr><td>Soft Attack</td><td>${stats.soft}</td><td>${aiStats.soft}</td></tr>
          <tr><td>Hard Attack</td><td>${stats.hard}</td><td>${aiStats.hard}</td></tr>
        </tbody>
      </table>
    </div>
  `;
}

function calculateStatsForTemplate(line, support) {
  const lineUnits = line.map((id) => lineBattalionDefs.find((unit) => unit.id === id)).filter(Boolean);
  const supportUnits = support.map((id) => supportCompanyDefs.find((unit) => unit.id === id)).filter(Boolean);
  const orgBase = lineUnits.length ? lineUnits.reduce((sum, unit) => sum + unit.org, 0) / lineUnits.length : 0;
  return {
    width: lineUnits.reduce((sum, unit) => sum + unit.width, 0),
    org: Math.round(orgBase + supportUnits.reduce((sum, unit) => sum + unit.org, 0)),
    soft: Math.round(lineUnits.reduce((sum, unit) => sum + unit.soft, 0) + supportUnits.reduce((sum, unit) => sum + unit.soft, 0)),
    hard: Math.round(lineUnits.reduce((sum, unit) => sum + unit.hard, 0) + supportUnits.reduce((sum, unit) => sum + unit.hard, 0))
  };
}

function renderDivisionStats() {
  const statsContainer = document.getElementById("division-stats");
  if (!statsContainer) return;
  const stats = calculateDivisionStats();
  const validation = evaluateTemplate(stats);
  const warningLines = validation.warnings.map((item) => `<li>${item}</li>`).join("");
  const errorLines = validation.errors.map((item) => `<li>${item}</li>`).join("");
  const previewLine = stats.previewDelta
    ? `<div class="division-preview">Предпросмотр: ORG ${stats.previewDelta.org >= 0 ? "+" : ""}${stats.previewDelta.org}, SA ${stats.previewDelta.soft >= 0 ? "+" : ""}${stats.previewDelta.soft}</div>`
    : "";
  const whatIfOrg = Math.max(0, stats.org - 4);
  const whatIfSoft = stats.soft + 24;
  statsContainer.innerHTML = `
    <div class="division-verdict verdict-${validation.verdictClass}">${validation.verdict}</div>
    <div class="division-fill-grid">
      <div>
        <div class="division-stat-head"><span>Линейных батальонов</span><strong>${stats.battalionCount}/25</strong></div>
        <div class="division-stat-bar tone-fill"><i style="width:${stats.lineFillPercent}%"></i></div>
      </div>
      <div>
        <div class="division-stat-head"><span>Рот поддержки</span><strong>${stats.supportCount}/5</strong></div>
        <div class="division-stat-bar tone-fill"><i style="width:${stats.supportFillPercent}%"></i></div>
      </div>
    </div>
    ${statBarMarkup("Organization", stats.org, 80, "org")}
    ${statBarMarkup("HP", stats.hp, 650, "hp")}
    ${statBarMarkup("Soft Attack", stats.soft, 360, "soft")}
    ${statBarMarkup("Hard Attack", stats.hard, 260, "hard")}
    ${statBarMarkup("Combat Width", stats.width, 50, "width")}
    ${statBarMarkup("Breakthrough", stats.break, 400, "soft")}
    ${statBarMarkup("Defense", stats.def, 600, "hp")}
    ${statBarMarkup("Piercing", stats.pierce, 100, "hard")}
    ${statBarMarkup("Armor", stats.armor, 100, "hard")}
    ${statBarMarkup("Army XP Cost", stats.xpCost, 200, "xp")}
    ${statBarMarkup("Industrial Cost (IC)", stats.icCost, 1800, "xp")}
    <div class="division-resource-grid">
      <div class="res-title">Ресурсы:</div>
      <div class="res-item">Сталь: <strong>${stats.resources.steel}</strong></div>
      <div class="res-item">Вольфрам: <strong>${stats.resources.tungsten}</strong></div>
      <div class="res-item">Хром: <strong>${stats.resources.chromium}</strong></div>
    </div>
    <div class="division-resource-grid">
      <div class="res-title">Снаряжение:</div>
      <div>Infantry Eq.: <strong>${stats.equipment.infantry}</strong></div>
      <div>Artillery: <strong>${stats.equipment.artillery}</strong></div>
      <div>Support Eq.: <strong>${stats.equipment.support}</strong></div>
    </div>
    <div class="what-if-card">
      <div class="division-stat-head"><span>Что если: 1 пехота -> 1 артиллерия</span><strong>ORG ${whatIfOrg} / SA ${whatIfSoft}</strong></div>
      <div class="what-if-bars">
        <i style="width:${Math.max(0, Math.min(100, Math.round((whatIfOrg * 100) / 80)))}%"></i>
        <i style="width:${Math.max(0, Math.min(100, Math.round((whatIfSoft * 100) / 360)))}%"></i>
      </div>
    </div>
    ${errorLines ? `<ul class="division-errors">${errorLines}</ul>` : ""}
    ${warningLines ? `<ul class="division-warnings">${warningLines}</ul>` : ""}
    ${previewLine}
    <div class="division-help">Подсказка: выберите юнит справа и кликайте по слотам, чтобы заполнять шаблон.</div>
  `;
  renderAiComparison(stats);
}

function setTemplateStatus(message) {
  document.getElementById("template-status").textContent = message;
}

function resetDivisionTemplate() {
  activeTemplateId = null;
  divisionState.lineSlots = Array(25).fill(null);
  divisionState.supportSlots = Array(5).fill(null);
  divisionState.previewKind = null;
  divisionState.previewUnitId = null;
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
    showToast("Для сохранения шаблона необходимо войти в систему.", "warning", "Ошибка доступа");
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
    const isNew = !activeTemplateId;
    activeTemplateId = saved.id;
    setTemplateStatus("Шаблон сохранён.");
    showToast(`Шаблон "${payload.name}" успешно сохранен!`, "success", "Успех");
    
    if (isNew) {
      addReward(25, "Создание шаблона дивизии");
      showToast("+25 SC за создание нового шаблона!", "info", "Награда");
    }
    
    await loadTemplates();
  } catch {
    setTemplateStatus("Не удалось сохранить шаблон.");
    showToast("Произошла ошибка при сохранении шаблона.", "error", "Ошибка");
  }
}

function serializeDivisionTemplate() {
  const line = divisionState.lineSlots.map((slot) => slot || "__").join("-");
  const support = divisionState.supportSlots.map((slot) => slot || "__").join("-");
  const tech = `inf:${divisionState.techLevels.infantry},art:${divisionState.techLevels.artillery},arm:${divisionState.techLevels.armor},sup:${divisionState.techLevels.support},doc:${divisionState.doctrineLevel}`;
  return `STRAT_DIV|name=${encodeURIComponent(document.getElementById("template-name").value.trim() || "Новый шаблон")}|tech=${tech}|line=${line}|support=${support}`;
}

async function copyDivisionCode() {
  const code = serializeDivisionTemplate();
  try {
    await navigator.clipboard.writeText(code);
    setTemplateStatus("Код шаблона скопирован в буфер обмена.");
  } catch {
    setTemplateStatus(`Не удалось скопировать автоматически. Код: ${code}`);
  }
}

async function exportToPng() {
  const target = document.querySelector(".division-layout.game-like");
  if (!target) return;
  
  setTemplateStatus("Генерация изображения...");
  try {
    // Временно скрываем элементы, которые не должны попасть на скриншот
    const actions = target.querySelectorAll(".template-actions, .template-list, h3:last-of-type, .division-help");
    actions.forEach(el => el.style.visibility = "hidden");
    
    const canvas = await html2canvas(target, {
      backgroundColor: "#0a0c12",
      scale: 2,
      logging: false,
      useCORS: true,
      ignoreElements: (el) => el.classList.contains("sections-btn") || el.id === "template-list"
    });
    
    actions.forEach(el => el.style.visibility = "visible");
    
    const link = document.createElement("a");
    link.download = `${document.getElementById("template-name").value || "division"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    setTemplateStatus("Изображение экспортировано.");
    showToast("Изображение успешно создано!", "success", "Экспорт");
  } catch (err) {
    console.error(err);
    setTemplateStatus("Ошибка при экспорте в PNG.");
    showToast("Не удалось создать изображение.", "error", "Ошибка");
  }
}

function loadMetaTemplate(templateId) {
  const meta = metaTemplates[templateId];
  if (!meta) return;
  divisionState.lineSlots = Array(25).fill(null);
  divisionState.supportSlots = Array(5).fill(null);
  meta.line.slice(0, 25).forEach((unitId, index) => { divisionState.lineSlots[index] = unitId; });
  meta.support.slice(0, 5).forEach((unitId, index) => { divisionState.supportSlots[index] = unitId; });
  document.getElementById("template-name").value = meta.name;
  setTemplateStatus(`Загружен учебный шаблон ${meta.name}: ${meta.note}`);
  renderDivisionGrid();
  renderDivisionStats();
}

function setupToolsModal() {
  const modal = document.getElementById("tools-modal");
  const openModal = async (event) => {
    event.preventDefault();
    modal.classList.remove("hidden");
    await loadTemplates();
  };
  const closeModal = () => modal.classList.add("hidden");
  document.querySelectorAll("[data-open-tools]").forEach((btn) => btn.addEventListener("click", openModal));
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
  document.getElementById("export-png").addEventListener("click", exportToPng);
  document.getElementById("copy-division-code").addEventListener("click", copyDivisionCode);

  const yearButtons = document.querySelectorAll(".year-btn");
  yearButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      yearButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      divisionState.currentYear = parseInt(btn.dataset.year);
      renderPalette();
    });
  });

  const sliderConfig = [
    ["tech-infantry", "tech-infantry-value", "infantry"],
    ["tech-artillery", "tech-artillery-value", "artillery"],
    ["tech-armor", "tech-armor-value", "armor"],
    ["tech-support", "tech-support-value", "support"],
    ["doctrine-level", "doctrine-level-value", "doctrine"]
  ];
  sliderConfig.forEach(([inputId, valueId, key]) => {
    const input = document.getElementById(inputId);
    const value = document.getElementById(valueId);
    if (!input || !value) return;
    const applyValue = () => {
      const level = Number(input.value || 0);
      value.textContent = `${level}`;
      if (key === "doctrine") {
        divisionState.doctrineLevel = level;
      } else {
        divisionState.techLevels[key] = level;
      }
      renderPalette();
      renderDivisionGrid();
      renderDivisionStats();
    };
    input.addEventListener("input", applyValue);
    applyValue();
  });
  document.querySelectorAll("[data-load-meta]").forEach((button) => {
    button.addEventListener("click", () => loadMetaTemplate(button.dataset.loadMeta));
  });
}

async function loadCurrentUser() {
  try {
    currentUser = await apiFetch("/api/me");
    if (currentUser.authenticated && currentUser.balance === undefined) {
      currentUser.balance = 1000; // Стартовый баланс 1000 SC
      currentUser.ownedItems = [];
      currentUser.pinnedAchievements = [];
      currentUser.friends = [];
      currentUser.prefs = { favGame: "hoi4", bio: "" };
    }
  } catch {
    currentUser = { authenticated: false, displayName: "Гость", balance: 0, ownedItems: [], pinnedAchievements: [], friends: [], prefs: { favGame: "hoi4", bio: "" } };
  }
  renderCurrentUser();
}

function renderCurrentUser() {
  const userEconomy = document.getElementById("user-economy");
  const balanceEl = document.getElementById("user-balance");
  const loginBtn = document.getElementById("steam-login");
  const devLoginBtn = document.getElementById("dev-login");
  const logoutBtn = document.getElementById("logout");
  const heroNickname = document.getElementById("hero-nickname");
  const topUserProfile = document.getElementById("top-user-profile");
  const topAvatar = document.getElementById("top-avatar");

  if (currentUser.authenticated) {
    loginBtn.classList.add("hidden");
    devLoginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    heroNickname.textContent = currentUser.displayName;
    
    topUserProfile.classList.remove("hidden");
    topAvatar.innerHTML = "";
    if (currentUser.steamAvatarUrl) {
      const img = document.createElement("img");
      img.src = currentUser.steamAvatarUrl;
      topAvatar.appendChild(img);
    } else {
      topAvatar.textContent = (currentUser.displayName || "ST").slice(0, 2).toUpperCase();
    }
    
    userEconomy.classList.remove("hidden");
    animateNumber(balanceEl, currentUser.balance);
  } else {
    loginBtn.classList.remove("hidden");
    devLoginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    heroNickname.textContent = "Гость";
    
    topUserProfile.classList.add("hidden");
    userEconomy.classList.add("hidden");
  }
}

function addReward(amount, reason) {
  if (!currentUser.authenticated) return;
  currentUser.balance = (currentUser.balance || 0) + amount;
  renderCurrentUser();
  console.log(`Награда: +${amount} SC (${reason})`);
}

function renderShop() {
  const renderGrid = (gridId, items) => {
    const grid = document.getElementById(gridId);
    grid.innerHTML = "";
    items.forEach(item => {
      const isOwned = currentUser.ownedItems?.includes(item.id);
      const card = document.createElement("div");
      card.className = "shop-item";
      card.innerHTML = `
        <div class="shop-item-title">${item.title}</div>
        <div class="shop-item-desc">${item.desc}</div>
        <div class="shop-item-footer">
          <div class="shop-item-price">🪙 ${item.price}</div>
          <button class="sections-btn shop-item-btn ${isOwned ? 'owned' : ''}" 
                  ${isOwned ? 'disabled' : ''} 
                  data-item-id="${item.id}">
            ${isOwned ? 'Куплено' : 'Купить'}
          </button>
        </div>
      `;
      if (!isOwned) {
        card.querySelector("button").addEventListener("click", () => buyItem(item));
      }
      grid.appendChild(card);
    });
  };

  renderGrid("shop-cosmetics", shopItems.cosmetics);
  renderGrid("shop-functional", shopItems.functional);
}

async function buyItem(item) {
  if (currentUser.balance < item.price) {
    showToast("Недостаточно Strategium Credits!", "error", "Ошибка покупки");
    return;
  }

  if (confirm(`Купить "${item.title}" за ${item.price} SC?`)) {
    currentUser.balance -= item.price;
    if (!currentUser.ownedItems) currentUser.ownedItems = [];
    currentUser.ownedItems.push(item.id);
    renderCurrentUser();
    renderShop();
    showToast(`Вы успешно приобрели "${item.title}"!`, "success", "Покупка совершена");
  }
}

function setupShopModal() {
  const modal = document.getElementById("shop-modal");
  const openModal = (event) => {
    event.preventDefault();
    if (!currentUser.authenticated) {
      alert("Пожалуйста, войдите в систему, чтобы открыть магазин.");
      return;
    }
    modal.classList.remove("hidden");
    renderShop();
  };
  const closeModal = () => modal.classList.add("hidden");
  
  document.querySelectorAll("[data-open-shop]").forEach(btn => btn.addEventListener("click", openModal));
  document.getElementById("shop-modal-close").addEventListener("click", closeModal);
  document.getElementById("shop-modal-close-bg").addEventListener("click", closeModal);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });
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
    steamAchievementSummary = null;
    selectedSteamGameSlug = null;
    renderCurrentUser();
    resetDivisionTemplate();
    await loadTemplates();
  });
}

function setupWikiModal() {
  const modal = document.getElementById("wiki-modal");
  const openModal = (event) => {
    event?.preventDefault();
    modal.classList.remove("hidden");
  };
  const closeModal = () => modal.classList.add("hidden");
  document.querySelectorAll("[data-open-wiki]").forEach((btn) => btn.addEventListener("click", openModal));
  document.getElementById("wiki-modal-close").addEventListener("click", closeModal);
  document.getElementById("wiki-modal-close-bg").addEventListener("click", closeModal);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });
}

function handleLoader() {
  const wrapper = document.getElementById("loader-wrapper");
  const progress = wrapper.querySelector(".loader-progress");
  const text = wrapper.querySelector(".loader-text");
  
  const steps = [
    { p: 20, t: "Инициализация систем..." },
    { p: 45, t: "Синхронизация со Steam..." },
    { p: 70, t: "Загрузка экономики..." },
    { p: 100, t: "Готово к развертыванию" }
  ];

  let currentStep = 0;
  const interval = setInterval(() => {
    if (currentStep < steps.length) {
      progress.style.width = `${steps[currentStep].p}%`;
      text.textContent = steps[currentStep].t;
      currentStep++;
    } else {
      clearInterval(interval);
      setTimeout(() => {
        wrapper.classList.add("fade-out");
        setTimeout(() => wrapper.remove(), 600);
      }, 500);
    }
  }, 400);
}

function setupNewsFilters() {
  const filters = document.querySelectorAll("[data-news-filter]");
  filters.forEach(btn => {
    btn.addEventListener("click", () => {
      filters.forEach(f => f.classList.remove("active"));
      btn.classList.add("active");
      const filter = btn.dataset.newsFilter;
      
      // В реальности здесь был бы вызов API с фильтром
      // Для демо просто показываем тост
      showToast(`Фильтр применен: ${btn.textContent}`, "info", "Новости");
      
      // Имитируем перезагрузку новостей
      const feed = document.getElementById("news-feed");
      feed.style.opacity = "0.5";
      setTimeout(() => {
        feed.style.opacity = "1";
      }, 300);
    });
  });
}

renderNews(fallbackNews);
setupSearch();
setupQuickActions();
setupStaggeredReveal();
setupAuth();
setupFeedModal();
setupProfileModal();
setupSettingsModal();
setupLeaderboardModal();
setupFactionsModal();
setupConstructorsModal();
setupModdingModal();
setupShopModal();
setupWikiModal();
setupNewsFilters();
setupToolsModal();
loadCurrentUser();
loadNews();
handleLoader();
