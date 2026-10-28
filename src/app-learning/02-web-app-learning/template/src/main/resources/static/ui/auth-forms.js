// Loaded only on signed-in pages. Keep native form input/files when sign-in expires.
(() => {
  document.addEventListener('submit', async event => {
    const form = event.target;
    if (event.defaultPrevented || !(form instanceof HTMLFormElement) || form.matches('[data-post-form]')) return;
    const action = new URL(event.submitter?.getAttribute('formaction') || form.action, location.href);
    const method = (event.submitter?.getAttribute('formmethod') || form.method).toUpperCase();
    if (method !== 'POST' || action.origin !== location.origin || action.pathname === '/logout') return;
    event.preventDefault();
    if (form.dataset.authSending === 'true') return;
    form.dataset.authSending = 'true';
    const data = new FormData(form);
    if (event.submitter?.name) data.set(event.submitter.name, event.submitter.value);
    const notice = form.querySelector('[data-auth-error]') || document.createElement('p');
    notice.dataset.authError = ''; notice.setAttribute('role', 'alert'); notice.tabIndex = -1;
    if (!notice.parentNode) form.prepend(notice);
    notice.hidden = true;
    const fail = (message, login = false) => {
      form.dataset.saved = 'false'; notice.replaceChildren(document.createTextNode(message)); notice.hidden = false;
      if (login) {
        const link = document.createElement('a'); link.href = '/login'; link.target = '_blank'; link.rel = 'noopener';
        link.textContent = ' 別タブでログイン'; notice.append(link);
      }
      notice.focus();
    };
    try {
      const prepared = await fetch('/csrf', { cache: 'no-store', headers: { 'X-UI-Form': 'true' } });
      if (prepared.status === 401) { fail('ログインの期限が切れました。入力は残っています。別タブでログイン後、もう一度送信してください。', true); return; }
      if (!prepared.ok) throw new Error();
      const { token } = await prepared.json();
      if (!token) throw new Error();
      data.set('_csrf', token);
      form.querySelectorAll('input[name="_csrf"]').forEach(input => input.value = token);
      const response = await fetch(action, { method: 'POST', body: data, headers: { 'X-CSRF-TOKEN': token } });
      if (response.status === 401) { fail('ログインの期限が切れました。入力は残っています。別タブでログイン後、もう一度送信してください。', true); return; }
      if (response.status === 403) { fail('送信の準備を更新できませんでした。入力は残っています。もう一度送信してください。'); return; }
      if (response.status >= 500) throw new Error();
      if (response.redirected) {
        if (new URL(response.url).pathname === '/login') { fail('再ログインが必要です。入力は残っています。', true); return; }
        // Render the redirect's HTML once; a second GET would consume flash messages twice.
      }
      if (response.headers.get('content-type')?.includes('text/html')) {
        const html = await response.text(); form.dataset.saved = 'true';
        if (response.redirected) history.pushState(null, '', response.url);
        document.open(); document.write(html); document.close(); return;
      }
      fail('送信結果を確認できませんでした。入力は残っています。履歴を確認してから再試行してください。');
    } catch { fail('通信が途切れました。入力は残っています。履歴を確認してから再試行してください。'); }
    finally { form.dataset.authSending = 'false'; window.AppUI?.busy(form, false); }
  });
})();
