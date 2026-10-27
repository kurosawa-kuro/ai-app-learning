document.documentElement.classList.add("dark");
document.documentElement.style.colorScheme = "dark";
localStorage.setItem("dark-mode", "true");

const body = document.body;
const toggleButton = document.querySelector("[data-sidebar-toggle]");
const closeButton = document.querySelector("[data-sidebar-close]");
const backdrop = document.querySelector("[data-sidebar-backdrop]");

const setSidebarOpen = (open) => {
  body.dataset.sidebarOpen = open ? "true" : "false";
};

setSidebarOpen(false);

if (toggleButton) {
  toggleButton.addEventListener("click", () => {
    setSidebarOpen(body.dataset.sidebarOpen !== "true");
  });
}

if (closeButton) {
  closeButton.addEventListener("click", () => setSidebarOpen(false));
}

if (backdrop) {
  backdrop.addEventListener("click", () => setSidebarOpen(false));
}

const sortTableRows = (select) => {
  const table = document.getElementById(select.dataset.tableSort);
  const tbody = table?.querySelector("tbody");
  if (!tbody) return;

  const rows = Array.from(tbody.querySelectorAll("tr"));
  const comparators = {
    "mrr-desc": (a, b) => Number(b.dataset.mrr) - Number(a.dataset.mrr),
    "mrr-asc": (a, b) => Number(a.dataset.mrr) - Number(b.dataset.mrr),
    "expansion-desc": (a, b) => Number(b.dataset.expansion) - Number(a.dataset.expansion),
    "health-risk": (a, b) => Number(a.dataset.healthRank) - Number(b.dataset.healthRank),
    "time-desc": (a, b) => Number(b.dataset.timeRank) - Number(a.dataset.timeRank),
    "total-desc": (a, b) => Number(b.dataset.total) - Number(a.dataset.total),
    "priority-desc": (a, b) => Number(b.dataset.priorityRank) - Number(a.dataset.priorityRank),
    "payment-risk": (a, b) => Number(b.dataset.paymentRank) - Number(a.dataset.paymentRank),
  };

  const comparator = comparators[select.value];
  if (!comparator) return;

  rows.sort(comparator).forEach((row) => tbody.appendChild(row));
};

document.querySelectorAll("[data-table-sort]").forEach((select) => {
  select.addEventListener("change", () => sortTableRows(select));
  sortTableRows(select);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setSidebarOpen(false);
  }
});
