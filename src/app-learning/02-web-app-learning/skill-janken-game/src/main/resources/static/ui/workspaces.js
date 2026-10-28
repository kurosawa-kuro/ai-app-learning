// Enhance ordinary section links without discarding forms or their drafts.
(() => {
  const nav = document.querySelector('[data-workspace-nav]');
  if (!nav) return;
  const links = [...nav.querySelectorAll('a[href^="#"]')];
  const panels = [...document.querySelectorAll('[data-workspace-panel]')];
  const exists = id => panels.some(panel => panel.dataset.workspacePanel === id);
  function show(id, focus = false) {
    if (!exists(id)) id = panels[0]?.dataset.workspacePanel;
    panels.forEach(panel => { panel.hidden = panel.dataset.workspacePanel !== id; });
    links.forEach(link => {
      if (link.hash === '#' + id) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    if (focus) {
      const heading = document.getElementById(id);
      heading?.setAttribute('tabindex', '-1');
      heading?.focus({ preventScroll: true });
    }
  }
  nav.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    history.pushState(null, '', link.hash);
    show(link.hash.slice(1), true);
  });
  addEventListener('hashchange', () => show(location.hash.slice(1)));
  addEventListener('popstate', () => show(location.hash.slice(1)));
  document.addEventListener('invalid', event => {
    const panel = event.target.closest('[data-workspace-panel]');
    if (panel) show(panel.dataset.workspacePanel);
  }, true);
  show(nav.dataset.initialPanel || location.hash.slice(1));
})();
