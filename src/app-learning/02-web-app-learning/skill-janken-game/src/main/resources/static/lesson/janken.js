(() => {
  const game = document.querySelector('[data-janken]');
  if (!game) return;
  const $ = selector => game.querySelector(selector);
  const { skills, affinities, names } = JankenRules;
  const character = $('#character'), skill = $('#skill'), play = $('#play-round');
  const playerSelect = $('#player'), loadedPlayer = playerSelect.value;
  const status = $('#janken-status'), lineStatus = $('#line-status');
  const lineCharacter = $('#line-character'), lineText = $('#line-text'), material = $('#line-material');
  let resolved = false, busy = false, roundId = null, draftId = null, leaving = false;
  let lineOwner = lineCharacter.value, cleanLine = '', cleanMaterial = '';
  const dirtyLine = () => lineText.value !== cleanLine || material.value !== cleanMaterial;
  const markClean = () => { cleanLine = lineText.value; cleanMaterial = material.value; };
  const target = () => { $('#line-target').textContent = `${playerSelect.options[playerSelect.selectedIndex]?.text || '未選択'}さん ／ ${lineCharacter.options[lineCharacter.selectedIndex].text}のセリフ`; };
  function mayLeave() {
    if (busy || (roundId && !resolved)) { status.textContent = '処理結果を確認してからプレイヤーを切り替えてください。'; return false; }
    return !dirtyLine() || confirm('保存していないセリフの入力があります。破棄してプレイヤーを切り替えますか？');
  }
  const switchForm = $('[data-player-switch]');
  switchForm.addEventListener('submit', event => {
    if (!mayLeave()) { event.preventDefault(); playerSelect.value = loadedPlayer; return; }
    leaving = true; play.disabled = true;
  });
  playerSelect.addEventListener('change', () => switchForm.requestSubmit());
  switchForm.querySelector('button').hidden = true;
  document.addEventListener('app:before-user-select', event => { if (!mayLeave()) event.preventDefault(); });
  document.addEventListener('app:user-selected', event => { leaving = true; location.assign('/janken?user=' + encodeURIComponent(event.detail.id)); });
  addEventListener('beforeunload', event => {
    if (!leaving && (busy || (roundId && !resolved) || dirtyLine())) { event.preventDefault(); event.returnValue = ''; }
  });
  function help() { $('#skill-description').textContent = skills[skill.value][1] + '。勝敗は変わりません。'; }
  function setup() { skill.replaceChildren(...affinities[character.value].map(id => new Option(skills[id][0], id))); help(); }
  character.addEventListener('change', setup); skill.addEventListener('change', help); setup(); target();
  lineCharacter.addEventListener('change', () => {
    if (busy || (dirtyLine() && !confirm('保存していないセリフを破棄して、なかまを切り替えますか？'))) { lineCharacter.value = lineOwner; return; }
    lineOwner = lineCharacter.value; draftId = null; lineText.value = ''; material.value = ''; markClean(); target(); lineStatus.textContent = '';
  });
  material.addEventListener('input', () => { draftId = null; });
  async function send(path, fields) {
    const data = new FormData(); Object.entries(fields).forEach(([key, value]) => data.set(key, value));
    const response = await fetch(path, { method: 'POST', headers: { 'X-UI-Form': 'true', 'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]').content }, body: data });
    if (response.status === 403) {
      const fresh = await (await fetch('/csrf', { cache: 'no-store' })).json();
      document.querySelector('meta[name=csrf-token]').content = fresh.token;
      throw Error('送信準備を更新しました。入力を残しています。もう一度押してください。');
    }
    if (!(response.headers.get('content-type') || '').includes('json')) throw Error('結果を確認できませんでした。同じ内容で再試行してください。');
    const value = await response.json();
    if (!response.ok) throw Error(value.error || '操作できませんでした。');
    return value;
  }
  game.querySelectorAll('[name=hand]').forEach(input => input.addEventListener('change', () => { if (!resolved) play.disabled = !loadedPlayer; }));
  play.onclick = async () => {
    if (busy || resolved || !loadedPlayer || leaving) return;
    const hand = $('[name=hand]:checked')?.value; if (!hand) return;
    busy = true; play.disabled = true; roundId ||= crypto.randomUUID();
    [character, skill, playerSelect, ...game.querySelectorAll('[name=hand]')].forEach(input => { input.disabled = true; });
    status.textContent = '対戦結果を保存しています…';
    try {
      const result = await send('/janken/round', { requestId: roundId, user: loadedPlayer, character: character.value, skill: skill.value, hand });
      resolved = true;
      $('#round-title').textContent = { win: 'あなたの勝ち！', draw: 'あいこ！', lose: '今回はCPUの勝ち' }[result.outcome];
      $('#round-detail').textContent = `あなた：${names[result.hand]} ／ CPU：${names[result.cpu]}`;
      $('#round-points').textContent = result.points + 'ポイント獲得'; $('#round-line').textContent = result.line;
      $('#total-points').textContent = Number($('#total-points').textContent) + result.points;
      $('#game-result').hidden = false; $('#game-result').focus(); status.textContent = '対戦を保存しました。';
    } catch (error) { status.textContent = error.message; play.disabled = false; }
    finally { busy = false; }
  };
  $('#next-round').onclick = () => {
    resolved = false; roundId = null; $('#game-result').hidden = true;
    [character, skill, playerSelect, ...game.querySelectorAll('[name=hand]')].forEach(input => { input.disabled = false; });
    game.querySelectorAll('[name=hand]').forEach(input => { input.checked = false; });
    play.disabled = true; $('[name=hand]').focus();
  };
  $('#line-generate').onclick = async event => {
    if (busy || leaving) return;
    if (!material.value.trim()) { lineStatus.textContent = 'どんな応援にしたいか入力してください。'; return; }
    if (lineText.value.trim() && !confirm('入力中のセリフを新しいAI案に置き換えますか？ 生成に失敗した場合は今の文章を残します。')) return;
    busy = true; event.target.disabled = true; lineCharacter.disabled = true; lineText.readOnly = true; material.readOnly = true;
    draftId ||= crypto.randomUUID(); lineStatus.textContent = 'セリフ案を作っています…';
    try {
      const result = await send('/janken/line/draft', { requestId: draftId, character: lineOwner, material: material.value });
      lineStatus.textContent = result.message;
      if (result.state === 'SUCCESS') { lineText.value = result.text; draftId = null; }
      else draftId = null;
    } catch (error) { lineStatus.textContent = error.message; }
    finally { busy = false; event.target.disabled = false; lineCharacter.disabled = false; lineText.readOnly = false; material.readOnly = false; }
  };
  $('#line-adopt').onclick = async event => {
    if (busy || !loadedPlayer || leaving) return;
    busy = true; event.target.disabled = true; lineCharacter.disabled = true; lineText.readOnly = true; material.readOnly = true;
    try {
      const result = await send('/janken/line', { user: loadedPlayer, character: lineOwner, line: lineText.value });
      markClean(); lineStatus.textContent = result.message;
    } catch (error) { lineStatus.textContent = error.message; }
    finally { busy = false; event.target.disabled = false; lineCharacter.disabled = false; lineText.readOnly = false; material.readOnly = false; }
  };
})();
