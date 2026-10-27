(() => {
  document.addEventListener('error', event => {
    if (event.target.matches?.('[data-avatar-image]')) event.target.remove();
  }, true);
  document.querySelectorAll('[data-image-picker]').forEach(picker => {
    const input = picker.querySelector('[data-image-input]');
    const preview = picker.querySelector('[data-image-preview]');
    const error = picker.querySelector('[data-image-preview-error]');
    let url;
    function update() {
      if (url) URL.revokeObjectURL(url);
      url = null; preview.hidden = true; preview.removeAttribute('src'); error.textContent = '';
      const file = input.files[0];
      if (!file) return;
      if (!['image/jpeg', 'image/png'].includes(file.type)) { error.textContent = 'JPEGまたはPNGを選択してください。'; return; }
      if (file.size > 5 * 1024 * 1024) { error.textContent = '画像は5MB以下にしてください。'; return; }
      url = URL.createObjectURL(file); preview.src = url; preview.hidden = false;
    }
    preview.addEventListener('error', () => { if (url) { preview.hidden = true; error.textContent = 'プレビューできませんでした。別のJPEG・PNGを選択してください。'; } });
    input.addEventListener('change', update);
    picker.querySelector('[data-clear-image]')?.addEventListener('click', () => { input.value = ''; update(); });
    window.addEventListener('pagehide', () => { if (url) URL.revokeObjectURL(url); });
  });
})();
