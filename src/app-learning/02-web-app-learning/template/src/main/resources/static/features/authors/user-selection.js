(() => {
  const { placePopup, popupTrigger } = window.AppUI;
  const userPopup = document.getElementById('user-popup');
  if (userPopup) {
    const list = userPopup.querySelector('[data-user-options-list]');
    const search = userPopup.querySelector('input[type="search"]');
    const error = userPopup.querySelector('[data-user-error]');
    const status = document.querySelector('[data-user-status]');
    let users = [], switching = false, loadVersion = 0;
    const avatar = user => {
      const span = document.createElement('span'); span.className = 'ui-avatar'; span.setAttribute('aria-hidden', 'true');
      const initial = document.createElement('span'); initial.textContent = Array.from(user?.name || '未')[0]; span.append(initial);
      if (user?.iconUrl) {
        const image = document.createElement('img'); image.src = user.iconUrl; image.alt = ''; image.dataset.avatarImage = '';
        image.addEventListener('error', () => image.remove()); span.append(image);
      }
      return span;
    };
    const updateSelection = user => {
      userPopup.dataset.selectedUser = user?.id || '';
      document.getElementById('sidebar-current-user').textContent = user?.name || '未選択';
      document.querySelector('[data-current-avatar]').replaceChildren(avatar(user));
    };
    function renderUsers() {
      list.replaceChildren();
      const visible = users.filter(user => user.name.toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase()));
      if (!visible.length) {
        const message = document.createElement('p'); message.textContent = users.length ? '一致するユーザーがいません。' : 'ユーザーがまだいません。下のリンクから追加できます。'; list.append(message);
      }
      visible.forEach(user => {
        const button = document.createElement('button'); button.type = 'button'; button.disabled = switching;
        button.setAttribute('aria-pressed', String(user.id === userPopup.dataset.selectedUser));
        const name = document.createElement('span'); name.textContent = user.name;
        const check = document.createElement('span'); check.textContent = user.id === userPopup.dataset.selectedUser ? '選択中' : '';
        name.className = 'ui-user-option-name';
        button.append(avatar(user), name, check); button.addEventListener('click', () => selectUser(user)); list.append(button);
      });
      placePopup(userPopup);
    }
    async function selectUser(user) {
      if (switching) return;
      switching = true; error.hidden = true;
      list.querySelectorAll('button').forEach(button => { button.disabled = true; });
      userPopup.setAttribute('aria-busy', 'true');
      try {
        const token = document.querySelector('meta[name="csrf-token"]').content;
        const header = document.querySelector('meta[name="csrf-header"]').content;
        const response = await fetch(userPopup.dataset.userOptions, { method: 'POST',
          headers: { [header]: token }, body: new URLSearchParams({ userId: user.id }) });
        if (!response.headers.get('content-type')?.includes('json')) throw new Error();
        const result = await response.json();
        if (!response.ok) { error.textContent = result.error || '切り替えられませんでした。再試行してください。'; error.hidden = false; return; }
        loadVersion++;
        updateSelection(result);
        document.dispatchEvent(new CustomEvent('app:user-selected', { detail: result }));
        status.textContent = 'ユーザーを切り替えました。';
        if (userPopup.matches(':popover-open')) { userPopup.hidePopover(); popupTrigger(userPopup).focus(); }
      } catch {
        error.textContent = '切替結果を確認できませんでした。メニューを開き直して選択を確認してください。'; error.hidden = false;
      } finally {
        switching = false; userPopup.removeAttribute('aria-busy'); renderUsers();
      }
    }
    search.addEventListener('input', renderUsers);
    userPopup.addEventListener('beforetoggle', event => {
      if (event.newState === 'open') {
        search.value = ''; error.hidden = true; list.textContent = '読み込み中…';
      }
    });
    userPopup.addEventListener('toggle', async event => {
      if (event.newState !== 'open') { loadVersion++; return; }
      const version = ++loadVersion;
      try {
        const response = await fetch(userPopup.dataset.userOptions, { cache: 'no-store' });
        if (!response.ok || !response.headers.get('content-type')?.includes('json')) throw new Error();
        const result = await response.json();
        if (version !== loadVersion || !userPopup.matches(':popover-open')) return;
        users = result.users; updateSelection(result.selected); renderUsers();
      } catch {
        if (version !== loadVersion) return;
        list.replaceChildren(); error.textContent = 'ユーザー一覧を読み込めませんでした。メニューを開き直して再試行してください。'; error.hidden = false;
        placePopup(userPopup);
      }
    });
  }
})();
