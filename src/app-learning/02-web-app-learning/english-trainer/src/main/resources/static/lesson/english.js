(() => {
  const forms = [...document.querySelectorAll('[data-learning-form]')];
  const pending = new Set();
  const snapshots = new Map();
  const snapshot = form => JSON.stringify([...new FormData(form)]);
  forms.forEach(form => snapshots.set(form, snapshot(form)));
  const dirty = () => forms.some(form => snapshot(form) !== snapshots.get(form));
  let leaving = false;
  function mayLeave() {
    if (pending.size) { alert('回答を送信しています。結果を確認してから学習する人を切り替えてください。'); return false; }
    return !dirty() || confirm('送信していない回答があります。破棄して学習する人を切り替えますか？');
  }
  function leave() { leaving = true; forms.forEach(form => { form.dataset.saved = 'true'; }); }
  const switchForm = document.querySelector('[data-learner-switch]');
  const learner = switchForm?.querySelector('[name=user]'), loadedLearner = learner?.value;
  switchForm?.addEventListener('submit', event => {
    if (!mayLeave()) { event.preventDefault(); learner.value = loadedLearner; return; }
    leave();
  });
  learner?.addEventListener('change', () => switchForm.requestSubmit());
  if (switchForm) switchForm.querySelector('button').hidden = true;
  document.addEventListener('app:before-user-select', event => { if (!mayLeave()) event.preventDefault(); });
  document.addEventListener('app:user-selected', event => { leave(); location.assign('/learning?user=' + encodeURIComponent(event.detail.id)); });
  addEventListener('beforeunload', event => {
    if (!leaving && (pending.size || dirty())) { event.preventDefault(); event.returnValue = ''; }
  });
  forms.forEach(form => {
    let id = null, busy = false;
    const input = form.querySelector('[name=input]'), question = form.querySelector('[name=question]');
    const feedback = form.querySelector('[data-learning-feedback]'), submitted = form.querySelector('[data-learning-submitted]');
    const status = form.querySelector('[data-learning-status]'), button = form.querySelector('button');
    const showQuestion = () => { const text = form.querySelector('[data-question-text]'); if (text) text.textContent = question.options[question.selectedIndex]?.text || ''; };
    showQuestion();
    form.addEventListener('input', () => {
      id = null; form.dataset.saved = 'false'; feedback.textContent = ''; submitted.hidden = true;
      status.textContent = '入力中です。送信すると、この回答へのフィードバックを表示します。'; showQuestion();
    });
    form.addEventListener('submit', async event => {
      event.preventDefault(); form.dataset.saved = 'false'; if (busy || leaving) return;
      const data = new FormData(form); id ||= crypto.randomUUID(); data.set('requestId', id);
      const sentInput = input.value, sentQuestion = question?.options[question.selectedIndex]?.text;
      busy = true; pending.add(form); button.disabled = true; input.readOnly = true;
      if (question) question.disabled = true;
      form.setAttribute('aria-busy', 'true'); status.textContent = '考えています…'; feedback.textContent = ''; submitted.hidden = true;
      let saved = false;
      try {
        const response = await fetch('/learning', { method: 'POST', headers: { 'X-UI-Form': 'true', 'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]').content }, body: data });
        if (response.status === 403) {
          const fresh = await (await fetch('/csrf', { cache: 'no-store' })).json();
          document.querySelector('meta[name=csrf-token]').content = fresh.token;
          document.querySelectorAll('[name=_csrf]').forEach(field => { field.value = fresh.token; });
          throw Error('送信準備を更新しました。入力を残しています。もう一度押してください。');
        }
        if (!(response.headers.get('content-type') || '').includes('json')) throw Error('結果を確認できませんでした。入力を残しています。再試行してください。');
        const value = await response.json(); if (!response.ok) throw Error(value.error || '保存できませんでした。');
        status.textContent = value.message;
        if (value.state === 'SUCCESS') {
          submitted.textContent = (sentQuestion ? '問題：' + sentQuestion + '\n' : '') + '送信した回答：' + sentInput;
          submitted.hidden = false; feedback.textContent = value.text; saved = true;
        } else id = null;
      } catch (error) { status.textContent = error.message; }
      finally {
        busy = false; pending.delete(form); button.disabled = false; input.readOnly = false;
        if (question) question.disabled = false;
        form.setAttribute('aria-busy', 'false'); form.dataset.saved = String(saved);
        if (saved) snapshots.set(form, snapshot(form));
      }
    });
  });
})();
