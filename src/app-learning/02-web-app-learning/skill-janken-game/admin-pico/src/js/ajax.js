const ajaxState = {
  users: [],
  posts: [],
  todos: [],
  createdUsers: [],
  filter: "all",
  query: "",
  page: 1,
  pageSize: 6,
};

const ajaxElements = {
  search: document.querySelector("#ajax-search"),
  focusFormButton: document.querySelector("[data-ajax-focus-form]"),
  createForm: document.querySelector("#ajax-create-form"),
  createName: document.querySelector("#ajax-create-name"),
  createEmail: document.querySelector("#ajax-create-email"),
  createNote: document.querySelector("#ajax-create-note"),
  createStatus: document.querySelector("#ajax-create-status"),
  feed: document.querySelector("#ajax-feed"),
  pager: document.querySelector("#ajax-pager"),
  pagerSummary: document.querySelector("#ajax-pager-summary"),
  refresh: document.querySelector("[data-ajax-refresh]"),
  filters: Array.from(document.querySelectorAll("[data-ajax-filter]")),
  lastUpdated: document.querySelector("#ajax-last-updated"),
  usersCount: document.querySelector("#ajax-users-count"),
  postsCount: document.querySelector("#ajax-posts-count"),
  openTodos: document.querySelector("#ajax-open-todos"),
  createdCount: document.querySelector("#ajax-created-count"),
  usersStatus: document.querySelector("#ajax-users-status"),
  postsStatus: document.querySelector("#ajax-posts-status"),
  todosStatus: document.querySelector("#ajax-todos-status"),
};

const ajaxEndpoints = {
  users: "https://jsonplaceholder.typicode.com/users",
  posts: "https://jsonplaceholder.typicode.com/posts",
  todos: "https://jsonplaceholder.typicode.com/todos",
};

const ajaxThumbClassMap = {
  users: "admin-news-card__thumb--product",
  posts: "admin-news-card__thumb--economy",
  todos: "admin-news-card__thumb--ai",
  created: "admin-news-card__thumb--feature",
};

const formatClock = (date = new Date()) =>
  new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
    hour12: false,
  }).format(date).replace(":", ":") + " JST";

const setAjaxStatus = (element, text, tone) => {
  if (!element) return;
  element.textContent = text;
  element.dataset.tone = tone || "neutral";
};

const updateAjaxKpis = () => {
  ajaxElements.usersCount.textContent = String(ajaxState.users.length);
  ajaxElements.postsCount.textContent = String(ajaxState.posts.length);
  ajaxElements.openTodos.textContent = String(
    ajaxState.todos.filter((todo) => !todo.completed).length
  );
  ajaxElements.createdCount.textContent = String(ajaxState.createdUsers.length);
};

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const buildAjaxRecords = () => {
  const userRecords = ajaxState.users.slice(0, 6).map((user) => ({
    kind: "users",
    id: `USER-${user.id}`,
    status: "取得済み",
    statusTone: "lime",
    category: user.company?.name || "ユーザー",
    owner: user.name,
    title: `${user.name} / ${user.username}`,
    description: `${user.email} | ${user.phone}`,
    time: user.website || "users endpoint",
    thumbTitle: "User",
  }));

  const createdRecords = ajaxState.createdUsers.map((user, index) => ({
    kind: "created",
    id: `POST-${user.id || index + 1}`,
    status: "POST 応答",
    statusTone: "neutral",
    category: "作成送信",
    owner: user.name,
    title: `${user.name} を作成送信`,
    description: `${user.email} | ${user.note || "補足なし"}`,
    time: user.createdAt,
    thumbTitle: "Created",
  }));

  const postRecords = ajaxState.posts.slice(0, 6).map((post) => ({
    kind: "posts",
    id: `POST-${post.id}`,
    status: "取得済み",
    statusTone: "lime",
    category: `userId ${post.userId}`,
    owner: "posts",
    title: post.title,
    description: post.body,
    time: "posts endpoint",
    thumbTitle: "Post",
  }));

  const todoRecords = ajaxState.todos.slice(0, 6).map((todo) => ({
    kind: "todos",
    id: `TODO-${todo.id}`,
    status: todo.completed ? "完了" : "未完了",
    statusTone: todo.completed ? "neutral" : "pink",
    category: `userId ${todo.userId}`,
    owner: "todos",
    title: todo.title,
    description: todo.completed
      ? "完了済みの Todo レコードです。"
      : "未完了の Todo レコードです。",
    time: "todos endpoint",
    thumbTitle: "Todo",
  }));

  return [...createdRecords, ...userRecords, ...postRecords, ...todoRecords];
};

const getFilteredAjaxRecords = () => {
  const query = ajaxState.query.trim().toLowerCase();

  return buildAjaxRecords().filter((record) => {
    const matchFilter =
      ajaxState.filter === "all" ||
      (ajaxState.filter === "users" && record.kind === "users") ||
      (ajaxState.filter === "posts" && record.kind === "posts") ||
      (ajaxState.filter === "todos" && record.kind === "todos");

    if (!matchFilter) return false;
    if (!query) return true;

    return [
      record.id,
      record.category,
      record.owner,
      record.title,
      record.description,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
};

const renderAjaxPager = (totalItems) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / ajaxState.pageSize));
  ajaxState.page = Math.min(ajaxState.page, totalPages);
  ajaxElements.pager.innerHTML = "";

  const addButton = (label, page, options = {}) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "admin-pager__button";
    button.textContent = label;
    if (options.current) {
      button.setAttribute("aria-current", "page");
    }
    if (options.ariaLabel) {
      button.setAttribute("aria-label", options.ariaLabel);
    }
    if (options.disabled) {
      button.disabled = true;
    }
    button.addEventListener("click", () => {
      ajaxState.page = page;
      renderAjaxFeed();
    });
    ajaxElements.pager.appendChild(button);
  };

  addButton("前へ", Math.max(1, ajaxState.page - 1), {
    ariaLabel: "前のページ",
    disabled: ajaxState.page === 1,
  });

  for (let page = 1; page <= totalPages; page += 1) {
    addButton(String(page), page, { current: page === ajaxState.page });
  }

  addButton("次へ", Math.min(totalPages, ajaxState.page + 1), {
    ariaLabel: "次のページ",
    disabled: ajaxState.page === totalPages,
  });
};

const renderAjaxFeed = () => {
  const records = getFilteredAjaxRecords();
  const totalItems = records.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ajaxState.pageSize));
  ajaxState.page = Math.min(ajaxState.page, totalPages);

  const start = (ajaxState.page - 1) * ajaxState.pageSize;
  const pageItems = records.slice(start, start + ajaxState.pageSize);

  ajaxElements.feed.innerHTML = "";

  if (pageItems.length === 0) {
    ajaxElements.feed.innerHTML = `
      <article class="admin-card admin-card--compact">
        <div class="admin-card__body">
          <strong>該当データがありません。</strong>
          <p>検索語を減らすか、フィルタを「全体」に戻してください。</p>
        </div>
      </article>
    `;
    ajaxElements.pagerSummary.textContent = "0 件";
    ajaxElements.pager.innerHTML = "";
    return;
  }

  pageItems.forEach((record) => {
    const article = document.createElement("article");
    article.className = "admin-news-card";

    const toneClass =
      record.statusTone === "lime"
        ? "admin-badge--lime"
        : record.statusTone === "pink"
          ? "admin-badge--pink"
          : "admin-badge--neutral";

    article.innerHTML = `
      <div class="admin-news-card__meta">
        <div class="admin-news-card__tags">
          <span class="admin-badge ${toneClass}">${escapeHtml(record.status)}</span>
          <span class="admin-badge admin-badge--neutral">${escapeHtml(record.category)}</span>
          <span class="admin-badge admin-badge--neutral">${escapeHtml(record.owner)}</span>
        </div>
        <span class="admin-news-card__action">READ</span>
      </div>
      <div class="admin-news-card__thumb ${ajaxThumbClassMap[record.kind] || ajaxThumbClassMap.posts}">
        <span class="admin-news-card__eyebrow">${escapeHtml(record.id)}</span>
        <strong>${escapeHtml(record.thumbTitle)}</strong>
      </div>
      <div class="admin-news-card__content">
        <h3>${escapeHtml(record.title)}</h3>
        <p>${escapeHtml(record.description)}</p>
        <small>${escapeHtml(record.time)}</small>
      </div>
    `;

    ajaxElements.feed.appendChild(article);
  });

  ajaxElements.pagerSummary.textContent = `${start + 1} - ${start + pageItems.length} / ${totalItems} 件を表示`;
  renderAjaxPager(totalItems);
};

const setAjaxLastUpdated = () => {
  ajaxElements.lastUpdated.textContent = `${formatClock()} 更新`;
};

const fetchJson = async (key) => {
  setAjaxStatus(ajaxElements[`${key}Status`], "取得中", "neutral");
  const response = await fetch(ajaxEndpoints[key]);
  if (!response.ok) {
    throw new Error(`${key} endpoint returned ${response.status}`);
  }
  const data = await response.json();
  setAjaxStatus(ajaxElements[`${key}Status`], `取得成功 (${data.length} 件)`, "lime");
  return data;
};

const loadAjaxData = async () => {
  try {
    const [users, posts, todos] = await Promise.all([
      fetchJson("users"),
      fetchJson("posts"),
      fetchJson("todos"),
    ]);

    ajaxState.users = users;
    ajaxState.posts = posts;
    ajaxState.todos = todos;
    updateAjaxKpis();
    setAjaxLastUpdated();
    renderAjaxFeed();
  } catch (error) {
    ajaxElements.feed.innerHTML = `
      <article class="admin-card admin-card--compact">
        <div class="admin-card__body">
          <strong>取得に失敗しました。</strong>
          <p>${escapeHtml(error.message)}</p>
        </div>
      </article>
    `;
    ajaxElements.pagerSummary.textContent = "取得失敗";
    ajaxElements.pager.innerHTML = "";
    setAjaxStatus(ajaxElements.usersStatus, "失敗", "pink");
    setAjaxStatus(ajaxElements.postsStatus, "失敗", "pink");
    setAjaxStatus(ajaxElements.todosStatus, "失敗", "pink");
  }
};

const setCreateStatus = (title, message, toneClass) => {
  ajaxElements.createStatus.className = `admin-note ${toneClass || "admin-note--neutral"}`;
  ajaxElements.createStatus.innerHTML = `<strong>${escapeHtml(title)}</strong><div>${escapeHtml(message)}</div>`;
};

const submitAjaxCreate = async (event) => {
  event.preventDefault();

  const payload = {
    name: ajaxElements.createName.value.trim(),
    email: ajaxElements.createEmail.value.trim(),
    note: ajaxElements.createNote.value.trim(),
  };

  if (!payload.name || !payload.email) return;

  setCreateStatus("送信中", "JSONPlaceholder へ POST しています。", "admin-note--neutral");

  try {
    const response = await fetch(ajaxEndpoints.users, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`create endpoint returned ${response.status}`);
    }

    const data = await response.json();
    ajaxState.createdUsers.unshift({
      id: data.id || Date.now(),
      name: payload.name,
      email: payload.email,
      note: payload.note,
      createdAt: formatClock(),
    });

    updateAjaxKpis();
    renderAjaxFeed();
    setCreateStatus(
      "送信成功",
      "JSONPlaceholder はダミー API のため、応答は返りますが永続保存はされません。",
      "admin-note--neutral"
    );
    ajaxElements.createForm.reset();
  } catch (error) {
    setCreateStatus("送信失敗", error.message, "");
  }
};

const bindAjaxEvents = () => {
  ajaxElements.search?.addEventListener("input", (event) => {
    ajaxState.query = event.target.value;
    ajaxState.page = 1;
    renderAjaxFeed();
  });

  ajaxElements.refresh?.addEventListener("click", () => {
    loadAjaxData();
  });

  ajaxElements.filters.forEach((button) => {
    button.addEventListener("click", () => {
      ajaxState.filter = button.dataset.ajaxFilter;
      ajaxState.page = 1;
      ajaxElements.filters.forEach((item) => {
        item.setAttribute("aria-pressed", item === button ? "true" : "false");
      });
      renderAjaxFeed();
    });
  });

  ajaxElements.focusFormButton?.addEventListener("click", () => {
    ajaxElements.createName?.focus();
  });

  ajaxElements.createForm?.addEventListener("submit", submitAjaxCreate);
};

bindAjaxEvents();
updateAjaxKpis();
loadAjaxData();
