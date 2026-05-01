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
  toggle.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    list.classList.toggle("hidden");
  });
  list.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      list.classList.add("hidden");
    }
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".sections-menu")) {
      list.classList.add("hidden");
    }
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
    strong.textContent = value;
    const span = document.createElement("span");
    span.textContent = label;
    item.append(strong, span);
    stats.appendChild(item);
  });
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
  };
  const closeModal = () => modal.classList.add("hidden");
  document.querySelectorAll("[data-open-profile]").forEach((button) => {
    button.addEventListener("click", openModal);
  });
  document.getElementById("profile-modal-close").addEventListener("click", closeModal);
  document.getElementById("profile-modal-close-bg").addEventListener("click", closeModal);
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
    return;
  }

  const button = document.getElementById("refresh-steam-stats");
  button.disabled = true;
  setAchievementsStatus("Обновляем Steam-статистику...");
  try {
    const result = await apiFetch("/api/steam/stats/refresh", { method: "POST" });
    setAchievementsStatus(`Обновлено игр: ${result.refreshedGames}.`);
    await loadSteamAchievements();
  } catch {
    setAchievementsStatus("Не удалось обновить статистику. Проверьте Steam privacy и STEAM_WEB_API_KEY.");
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
  document.getElementById("open-achievements-modal").addEventListener("click", openModal);
  document.getElementById("open-achievements-modal-top").addEventListener("click", openModal);
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
    rank.textContent = `#${entry.rank}`;
    const user = document.createElement("div");
    const name = document.createElement("span");
    name.textContent = entry.displayName;
    const meta = document.createElement("small");
    meta.textContent = `${entry.totalUnlocked}/${entry.totalAchievements} достижений • ${entry.progressPercent}% • ${formatSteamHours(entry.totalPlaytimeMinutes)}`;
    user.append(name, meta);
    const side = document.createElement("div");
    side.className = "leaderboard-row-side";
    const games = document.createElement("span");
    games.className = "leaderboard-games";
    games.textContent = `${entry.gamesCount} игр`;
    const compareBtn = document.createElement("button");
    compareBtn.type = "button";
    compareBtn.className = "sections-btn";
    compareBtn.textContent = "Сравнить";
    compareBtn.addEventListener("click", () => openSelfCompare(entry));
    side.append(games, compareBtn);
    row.append(rank, user, side);
    list.appendChild(row);
  });
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
  try {
    const response = await apiFetch(`/api/steam/leaderboard?scope=${encodeURIComponent(scope)}&sort=${encodeURIComponent(sort)}`);
    renderLeaderboard(response);
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
  document.getElementById("open-leaderboard-modal").addEventListener("click", openModal);
  document.getElementById("open-leaderboard-modal-top").addEventListener("click", openModal);
  document.getElementById("leaderboard-modal-close").addEventListener("click", closeModal);
  document.getElementById("leaderboard-modal-close-bg").addEventListener("click", closeModal);
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

const unitTypeById = {
  infantry: "infantry",
  artillery: "artillery",
  motorized: "mobile",
  mechanized: "mobile",
  medium_tank: "armor",
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
  selectedSupport: null
};

function renderPalette() {
  const battalionPalette = document.getElementById("battalion-palette");
  const supportPalette = document.getElementById("support-palette");
  battalionPalette.innerHTML = lineBattalionDefs.map((unit) => `
    <button class="palette-item unit-type-${unitTypeById[unit.id] || "support"} ${divisionState.selectedLine === unit.id ? "active" : ""}" data-pick-line="${unit.id}">
      ${unit.icon} • ${unit.name}
      <small>W:${unit.width} ORG:${unit.org} SA:${unit.soft} HA:${unit.hard}</small>
    </button>
  `).join("");
  supportPalette.innerHTML = supportCompanyDefs.map((unit) => `
    <button class="palette-item unit-type-${unitTypeById[unit.id] || "support"} ${divisionState.selectedSupport === unit.id ? "active" : ""}" data-pick-support="${unit.id}">
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
    const unitType = unit ? unitTypeById[unit.id] || "support" : "";
    return `<button class="division-slot ${unit ? `unit-type-${unitType}` : "empty"}" data-line-slot="${index}" title="${unit ? unit.name : "Пустой слот"}">${unit ? `<span>${unit.icon}</span><small>${unit.name}</small>` : "Пусто"}</button>`;
  }).join("");
  supportGrid.innerHTML = divisionState.supportSlots.map((unitId, index) => {
    const unit = unitId ? supportCompanyDefs.find((def) => def.id === unitId) : null;
    const unitType = unit ? unitTypeById[unit.id] || "support" : "";
    return `<button class="support-slot ${unit ? `unit-type-${unitType}` : "empty"}" data-support-slot="${index}" title="${unit ? unit.name : "Пустой слот"}">${unit ? `<span>${unit.icon}</span><small>${unit.name}</small>` : "Пусто"}</button>`;
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
    xpCost: lineUnits.length * 5 + supportUnits.length * 10,
    lineFillPercent: Math.round((lineUnits.length / 25) * 100),
    supportFillPercent: Math.round((supportUnits.length / 5) * 100)
  };
}

function statBarMarkup(label, value, max, tone) {
  const percent = Math.max(0, Math.min(100, Math.round((Number(value || 0) * 100) / Math.max(1, max))));
  return `
    <div class="division-stat-row">
      <div class="division-stat-head">
        <span>${label}</span>
        <strong>${value}</strong>
      </div>
      <div class="division-stat-bar tone-${tone}">
        <i style="width:${percent}%"></i>
      </div>
    </div>
  `;
}

function renderDivisionStats() {
  const stats = calculateDivisionStats();
  document.getElementById("division-stats").innerHTML = `
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
    ${statBarMarkup("Army XP Cost", stats.xpCost, 200, "xp")}
    <div class="division-help">Подсказка: выберите юнит справа и кликайте по слотам, чтобы заполнять шаблон.</div>
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
  const dot = document.getElementById("user-status-dot");
  const label = document.getElementById("user-status-label");
  const mode = currentUser.authenticated
    ? (currentUser.steamId ? "steam" : "dev")
    : "guest";
  dot.dataset.status = mode;
  dot.title = mode === "steam" ? "Steam подключен" : mode === "dev" ? "Dev вход" : "Гость";
  label.textContent = mode === "steam" ? "Онлайн (Steam)" : mode === "dev" ? "Онлайн (Dev)" : "Оффлайн";
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
    steamAchievementSummary = null;
    selectedSteamGameSlug = null;
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
setupProfileModal();
setupSettingsModal();
setupAchievementsModal();
setupLeaderboardModal();
renderPalette();
renderDivisionGrid();
renderDivisionStats();
setupToolsModal();
loadCurrentUser();
loadNews();
