(() => {
  document.querySelectorAll('[data-post-media]').forEach(media => {
    const img = media.querySelector('img'), status = media.querySelector('[role="status"]');
    const retry = media.querySelector('[data-image-retry]');
    function loaded() {
      media.dataset.imageState = 'loaded'; status.textContent = ''; retry.hidden = true;
    }
    function failed() {
      media.dataset.imageState = 'error'; status.textContent = '画像を読み込めませんでした。本文は引き続き読めます。'; retry.hidden = false;
    }
    img.addEventListener('load', loaded); img.addEventListener('error', failed);
    if (img.complete) img.naturalWidth ? loaded() : failed();
    retry.addEventListener('click', () => {
      media.dataset.imageState = 'loading'; status.textContent = '画像を読み込み中…'; retry.hidden = true;
      const url = new URL(img.src); url.searchParams.set('retry', Date.now()); img.src = url;
    });
  });
  const dialog = document.getElementById('image-viewer');
  let opener, previousOverflow;
  document.querySelectorAll('[data-image-enlarge]').forEach(button => button.addEventListener('click', () => {
    const original = button.querySelector('img');
    if (!original.complete || !original.naturalWidth) return;
    opener = button; previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const img = dialog.querySelector('img'); img.src = original.src; img.alt = original.alt;
    dialog.showModal(); dialog.querySelector('button').focus();
  }));
  dialog?.querySelector('[data-close-image]').addEventListener('click', () => dialog.close());
  dialog?.addEventListener('close', () => { document.body.style.overflow = previousOverflow || ''; opener?.focus({ preventScroll: true }); });
  // Store only same-tab navigation position and an internal URL; never store draft text or images.
  if (location.pathname === '/posts') {
    const key = `post-scroll:${location.pathname}${location.search}`;
    document.querySelectorAll('.post-list-title, .post-read-more').forEach(link => link.addEventListener('click', () => {
      sessionStorage.setItem('post-return-url', location.pathname + location.search);
      sessionStorage.setItem(key, String(scrollY));
    }));
    if (sessionStorage.getItem('post-restore') === key) {
      sessionStorage.removeItem('post-restore');
      requestAnimationFrame(() => scrollTo(0, Number(sessionStorage.getItem(key)) || 0));
    }
  } else if (/^\/posts\/[0-9a-f-]{36}$/.test(location.pathname)) {
    const back = document.querySelector('#actions a');
    const url = sessionStorage.getItem('post-return-url');
    if (back && url && /^\/posts(?:\?|$)/.test(url)) {
      back.href = url;
      back.addEventListener('click', () => sessionStorage.setItem('post-restore', `post-scroll:${url}`));
    }
  }
})();
