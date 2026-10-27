(() => {
  const panel = document.querySelector('[data-ai-draft]');
  if (!panel) return;
  const form = panel.closest('form'), body = form.querySelector('[name="body"]');
  const generate = panel.querySelector('[data-ai-generate]'), check = panel.querySelector('[data-ai-check]');
  const status = panel.querySelector('[data-ai-status]'), result = panel.querySelector('[data-ai-result]');
  const text = panel.querySelector('[data-ai-text]'), apply = panel.querySelector('[data-ai-apply]');
  let requestId, original, applied = false, busy = false;
  const show = data => {
    status.textContent = data.message + (data.model ? `（${data.model}）` : '');
    result.hidden = data.state !== 'SUCCESS';
    text.value = data.text || '';
    apply.disabled = false;
    check.hidden = !['RUNNING', 'UNKNOWN'].includes(data.state);
  };
  async function execute(readOnly) {
    if (busy) return;
    if (!readOnly) {
      if (!body.value.trim()) { status.textContent = '本文に下書きの素材を入力してください。'; body.focus(); return; }
      if (applied) { status.textContent = '先に下書きを破棄するか、投稿を保存してください。'; return; }
      requestId = crypto.randomUUID(); original = body.value;
    }
    busy = true; generate.disabled = check.disabled = true;
    status.textContent = readOnly ? '結果を確認中…' : '生成中…'; result.hidden = true;
    try {
      let response;
      if (readOnly) response = await fetch(`/ai/drafts/${requestId}`, {headers: {Accept: 'application/json'}});
      else {
        const data = new FormData(); data.set('requestId', requestId); data.set('input', body.value);
        const image = form.querySelector('[name="image"]')?.files?.[0]; if (image) data.set('image', image);
        data.set('_csrf', form.querySelector('[name="_csrf"]').value);
        response = await fetch('/ai/drafts', {method: 'POST', body: data, headers: {Accept: 'application/json'}});
      }
      const data = await response.json();
      if (!response.ok) { status.textContent = data.message || '要求を処理できませんでした。'; check.hidden = response.status < 500; }
      else show(data);
    } catch (_) {
      status.textContent = '通信が途切れました。同じ要求の結果を確認してください。自動再送はしません。'; check.hidden = false;
    } finally { busy = false; generate.disabled = check.disabled = false; }
  }
  generate.addEventListener('click', () => execute(false));
  check.addEventListener('click', () => execute(true));
  apply.addEventListener('click', () => {
    if (body.value !== original && !confirm('生成中に本文が変更されています。生成結果で置き換えますか？')) return;
    original = body.value; body.value = text.value; body.dispatchEvent(new Event('input', {bubbles: true}));
    applied = true; apply.disabled = true; status.textContent = '本文へ反映しました。内容を確認・手直しして投稿を保存してください。';
  });
  panel.querySelector('[data-ai-discard]').addEventListener('click', () => {
    if (applied && body.value !== text.value && !confirm('反映後の手直しも取り消し、反映前の本文へ戻しますか？')) return;
    if (applied) { body.value = original; body.dispatchEvent(new Event('input', {bubbles: true})); }
    applied = false; result.hidden = true; status.textContent = '下書きを破棄しました。';
  });
})();
