(() => {
  const forms = [...document.querySelectorAll('[data-unsaved-form]')];
  const snapshot = form => JSON.stringify([...new FormData(form)].map(([key, value]) => [key,
    value instanceof File ? `${value.name}:${value.size}:${value.lastModified}` : value]));
  const initial = new Map(forms.map(form => [form, snapshot(form)]));
  const serverError = !!document.querySelector('.ui-notice--error:not([hidden])');
  const dirty = () => forms.some(form => form.dataset.saved !== 'true' && (serverError || snapshot(form) !== initial.get(form)));
  addEventListener('beforeunload', event => {
    if (!dirty()) return;
    event.preventDefault(); event.returnValue = '';
  });
  // Native user/settings forms navigate after submit. Enhanced post forms mark success explicitly.
  forms.forEach(form => form.addEventListener('submit', () => {
    if (!form.matches('[data-post-form]') && form.checkValidity()) form.dataset.saved = 'true';
  }));
})();
