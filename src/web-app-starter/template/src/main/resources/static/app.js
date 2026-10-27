// Accessibility for the admin-pico drawer, which admin.js opens by toggling body[data-sidebar-open].
const toggle = document.querySelector("[data-sidebar-toggle]");
const sidebar = document.getElementById("sidebar");
new MutationObserver(() => {
  const open = document.body.dataset.sidebarOpen === "true";
  toggle?.setAttribute("aria-expanded", String(open));
  if (open) sidebar?.querySelector("a, button:not([hidden])")?.focus();
  else if (sidebar?.contains(document.activeElement)) toggle?.focus();
}).observe(document.body, { attributes: true, attributeFilter: ["data-sidebar-open"] });
