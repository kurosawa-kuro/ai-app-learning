(() => {
  const form = document.querySelector('[data-post-form]');
  if (!form) return;
  const picker = form.querySelector('#author-picker');
  const author = form.querySelector('#userId');
  const summary = form.querySelector('[data-post-error]');
  const image = form.querySelector('#image');
  const removeImage = form.querySelector('[name="removeImage"]');
  image?.addEventListener('change', () => { if (image.files.length && removeImage) removeImage.checked = false; });
  removeImage?.addEventListener('change', () => { if (removeImage.checked && image) { image.value = ''; image.dispatchEvent(new Event('change')); } });
  const csrf = form.querySelector('input[name="_csrf"]');
  function showError(message, fields = {}) {
    summary.replaceChildren();
    const text = document.createElement('p'); text.textContent = message; summary.append(text);
    const list = document.createElement('ul');
    for (const [id, message] of Object.entries(fields)) {
      const field = document.getElementById(id), error = document.getElementById(`${id}-error`);
      if (error) error.textContent = message;
      field?.setAttribute('aria-invalid', 'true');
      const li = document.createElement('li'), link = document.createElement('a');
      link.href = `#${id}`; link.textContent = message;
      link.addEventListener('click', () => { if (field?.closest('details')) field.closest('details').open = true; field?.focus(); });
      li.append(link); list.append(li);
    }
    if (list.children.length) summary.append(list);
    summary.hidden = false; summary.focus();
  }
  function selectAuthor() {
    form.querySelector('[data-author-name]').textContent = author.selectedOptions[0]?.textContent || '選択してください';
    if (author.value) { picker.open = false; picker.querySelector('summary').focus(); }
  }
  author?.addEventListener('change', selectAuthor);
  document.addEventListener('app:user-selected', event => {
    const user = event.detail;
    if (!picker) return;
    if (![...author.options].some(option => option.value === user.id)) author.add(new Option(user.name, user.id));
    author.value = user.id;
    form.querySelector('[data-author-name]').textContent = user.name;
    picker.open = false;
  });
  form.addEventListener('invalid', event => { if (picker?.contains(event.target)) picker.open = true; }, true);
  form.querySelector('[data-add-author]')?.addEventListener('click', async event => {
    const button = event.currentTarget, input = form.querySelector('#newAuthorName');
    const error = form.querySelector('#new-author-error');
    if (!input.value.trim()) { error.textContent = '投稿者名を入力してください。'; input.focus(); return; }
    button.disabled = true; button.setAttribute('aria-busy', 'true'); error.textContent = '';
    const data = new FormData(); data.set('name', input.value); data.set('_csrf', csrf.value);
    try {
      const response = await fetch('/posts/authors', { method: 'POST', body: data });
      if (!response.headers.get('content-type')?.includes('json')) throw new Error();
      const result = await response.json();
      if (!response.ok) { error.textContent = result.error; return; }
      author.add(new Option(result.name, result.id, true, true)); input.value = ''; selectAuthor();
    } catch { error.textContent = '追加を確認できませんでした。ユーザー管理で追加済みか確認してから再試行してください。'; }
    finally { button.disabled = false; button.removeAttribute('aria-busy'); }
  });
  const clear = form.querySelector('[data-clear-image]');
  clear?.addEventListener('click', () => { image.value = ''; document.getElementById('image-error').textContent = ''; });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (form.getAttribute('aria-busy') === 'true') return;
    summary.hidden = true;
    form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
    form.querySelectorAll('.ui-field-error').forEach(el => el.textContent = '');
    if (image?.files[0]?.size > 5 * 1024 * 1024) { showError('画像を確認してください。', { image: '画像は5MB以下にしてください。' }); return; }
    const data = new FormData(form);
    AppUI.busy(form, true);
    let saved = false;
    try {
      const response = await fetch(form.action, { method: 'POST', body: data, headers: { 'X-UI-Form': 'true', 'X-CSRF-TOKEN': csrf.value } });
      if (response.status === 403) {
        try {
          const renewed = await fetch('/csrf', { cache: 'no-store' });
          if (!renewed.ok) throw new Error();
          const token = (await renewed.json()).token;
          if (!token) throw new Error();
          document.querySelectorAll('input[name="_csrf"]').forEach(input => input.value = token);
          document.querySelector('meta[name="csrf-token"]').content = token;
          showError('送信の準備を更新しました。本文と画像は残っています。もう一度「投稿を保存」を押してください。');
        } catch { showError('接続を回復できませんでした。本文と画像は残っています。少し待ってから「投稿を保存」を押してください。'); }
        return;
      }
      if (!response.headers.get('content-type')?.includes('json')) {
        showError(response.status === 413 ? '画像は5MB以下にしてください。タイトルと本文は残っています。' : '保存を確認できませんでした。入力内容は残っています。投稿一覧を確認してから再試行してください。'); return;
      }
      const result = await response.json();
      if (!response.ok) { showError(result.error || '保存できませんでした。入力内容は残っています。', result.fields); return; }
      saved = true;
      form.dataset.saved = 'true';
      if (!form.querySelector('[name="version"]')) sessionStorage.removeItem('post-return-url');
      window.location.assign(result.redirect);
    } catch { showError('通信が途切れました。入力内容は残っています。投稿一覧で保存済みか確認してから再試行してください。'); }
    finally { if (!saved) AppUI.busy(form, false); }
  });
})();
