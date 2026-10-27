  document.addEventListener('error', event => {
    if (event.target.matches?.('[data-avatar-image]')) event.target.remove();
  }, true);
(() => {
  const sidebar = document.getElementById('sidebar');
  const toggle = document.querySelector('[data-sidebar-toggle]');
  const main = document.getElementById('main');
  const mobile = matchMedia('(max-width: 1024px)');
  const focusable = root => [...root.querySelectorAll('a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')].filter(el => el.getClientRects().length);
  const popups = [...document.querySelectorAll('.ui-popup[popover]')];
  const popupTrigger = popup => document.querySelector(`[popovertarget="${popup.id}"]:not([popovertargetaction="hide"])`);
  function placePopup(popup) {
    if (!popup.matches(':popover-open')) return;
    const trigger = popupTrigger(popup), box = trigger.getBoundingClientRect();
    const inSidebar = sidebar?.contains(trigger);
    const x = inSidebar && !mobile.matches ? sidebar.getBoundingClientRect().right + 12 : box.left;
    const preferredTop = box.bottom + 8 + popup.offsetHeight > innerHeight - 16 ? box.top - popup.offsetHeight - 8 : box.bottom + 8;
    popup.style.left = `${Math.max(16, Math.min(x, innerWidth - popup.offsetWidth - 16))}px`;
    popup.style.top = `${Math.max(16, Math.min(preferredTop, innerHeight - popup.offsetHeight - 16))}px`;
  }
  popups.forEach(popup => popup.addEventListener('toggle', event => {
    const open = event.newState === 'open';
    const trigger = popupTrigger(popup);
    trigger.setAttribute('aria-expanded', String(open));
    if (open) {
      placePopup(popup);
      (popup.querySelector('input[type="search"], nav a') || focusable(popup)[0])?.focus();
    }
  }));
  window.addEventListener('resize', () => popups.forEach(placePopup));
  document.addEventListener('keydown', event => {
    const popup = popups.find(item => item.matches(':popover-open'));
    if (!popup) return;
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopImmediatePropagation();
      popup.hidePopover(); popupTrigger(popup).focus();
    } else if (event.key === 'Tab') {
      // Keep keyboard interaction in the popup; Escape returns to its trigger.
      const items = focusable(popup), first = items[0], last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      event.stopImmediatePropagation();
    }
  }, true);
  popups.forEach(popup => popup.querySelector('[popovertargetaction="hide"]')?.addEventListener('click', () => popupTrigger(popup).focus()));
  const syncDrawer = () => {
    if (!sidebar) return;
    const open = mobile.matches && document.body.dataset.sidebarOpen === 'true';
    if (mobile.matches && !open) popups.filter(p => sidebar.contains(p) && p.matches(':popover-open')).forEach(p => p.hidePopover());
    toggle.setAttribute('aria-expanded', String(open));
    main.inert = open;
    sidebar.inert = mobile.matches && !open;
    if (open) requestAnimationFrame(() => { if (document.body.dataset.sidebarOpen === 'true') focusable(sidebar)[0]?.focus(); });
    else if (sidebar.contains(document.activeElement) && mobile.matches) toggle.focus();
  };
  new MutationObserver(syncDrawer).observe(document.body, { attributes: true, attributeFilter: ['data-sidebar-open'] });
  mobile.addEventListener('change', syncDrawer);
  syncDrawer();
  // The drawer can still be visibility:hidden on the first animation frame.
  // Transfer focus once the opening transition actually completes as well.
  sidebar?.addEventListener('transitionend', () => {
    if (mobile.matches && document.body.dataset.sidebarOpen === 'true' && !sidebar.contains(document.activeElement))
      focusable(sidebar)[0]?.focus();
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Tab' || !sidebar || !mobile.matches || document.body.dataset.sidebarOpen !== 'true') return;
    const items = focusable(sidebar);
    const first = items[0], last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  const dialog = document.getElementById('ui-confirm');
  let pendingForm, opener, confirmedForm;
  dialog.querySelector('[data-confirm-cancel]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => opener?.focus());
  dialog.querySelector('[data-confirm-accept]').addEventListener('click', () => {
    confirmedForm = pendingForm;
    dialog.close();
    pendingForm.requestSubmit();
  });
  function busy(form, active) {
    form.setAttribute('aria-busy', String(active));
    form.querySelectorAll('button[type="submit"]').forEach(button => {
      if (!active && !button.dataset.idleText) return;
      if (active) button.dataset.wasDisabled = String(button.disabled);
      button.dataset.idleText ??= button.textContent;
      button.disabled = active || button.dataset.wasDisabled === 'true';
      button.setAttribute('aria-busy', String(active));
      button.textContent = active ? (form.dataset.busyText || '保存中…') : button.dataset.idleText;
    });
  }
  document.addEventListener('submit', event => {
    const form = event.target;
    if (form.dataset.confirm && form !== confirmedForm) {
      event.preventDefault();
      pendingForm = form; opener = event.submitter;
      dialog.querySelector('#ui-confirm-description').textContent = form.dataset.confirm;
      dialog.showModal(); dialog.querySelector('[data-confirm-cancel]').focus();
      return;
    }
    if (form.matches('[data-ui-form]') && !form.matches('[data-post-form]')) busy(form, true);
  });
  window.addEventListener('pageshow', () => document.querySelectorAll('form[data-ui-form]').forEach(form => busy(form, false)));
  const summary = document.querySelector('[data-error-summary]');
  summary?.focus();
  summary?.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', () => {
    const field = document.getElementById(link.hash.slice(1));
    const details = field?.closest('details'); if (details) details.open = true;
    field?.focus();
  }));
  window.AppUI = { busy, placePopup, popupTrigger };

})();
