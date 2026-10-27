(() => {
  const game = document.querySelector('[data-janken]');
  if (!game) return;
  // Fixed sample data: not the production GAS masters or saved player state.
  const skills = { win: ['かちボーナス', '勝ったら +1ポイント'], lose: ['まけボーナス', '負けたら +1ポイント'], draw: ['あいこボーナス', 'あいこなら +1ポイント'] };
  const affinities = { hinoko: ['win', 'lose'], shizuku: ['lose', 'draw'], konoha: ['win', 'draw'] };
  const names = { rock: 'グー', scissors: 'チョキ', paper: 'パー' };
  const beats = { rock: 'scissors', scissors: 'paper', paper: 'rock' };
  const character = game.querySelector('#character'), skill = game.querySelector('#skill');
  const play = game.querySelector('#play-round'), result = game.querySelector('#game-result');
  let total = 0, resolved = false;
  const skillHelp = () => game.querySelector('#skill-description').textContent = `${skills[skill.value][1]}。勝敗は変わりません。`;
  function setup() {
    skill.replaceChildren(...affinities[character.value].map(id => new Option(skills[id][0], id)));
    skillHelp();
  }
  character.addEventListener('change', setup); skill.addEventListener('change', skillHelp); setup();
  game.querySelectorAll('[name="hand"]').forEach(input => input.addEventListener('change', () => { if (!resolved) play.disabled = false; }));
  play.addEventListener('click', () => {
    if (resolved) return;
    const hand = game.querySelector('[name="hand"]:checked')?.value;
    if (!hand) return;
    resolved = true; play.disabled = true;
    const cpu = Object.keys(names)[Math.floor(Math.random() * 3)];
    const outcome = hand === cpu ? 'draw' : beats[hand] === cpu ? 'win' : 'lose';
    const base = outcome === 'win' ? 2 : 1, bonus = skill.value === outcome ? 1 : 0;
    total += base + bonus;
    game.querySelector('#round-title').textContent = { win: 'あなたの勝ち！', draw: 'あいこ！', lose: '今回はCPUの勝ち' }[outcome];
    game.querySelector('#round-detail').textContent = `あなた：${names[hand]} ／ CPU：${names[cpu]}`;
    game.querySelector('#round-points').textContent = `${base + bonus}ポイント獲得（基本 ${base}点 ＋ スキル ${bonus}点）`;
    game.querySelector('#total-points').textContent = total;
    game.querySelectorAll('select, [name="hand"]').forEach(input => input.disabled = true);
    result.hidden = false; result.focus();
  });
  game.querySelector('#next-round').addEventListener('click', () => {
    resolved = false; result.hidden = true;
    game.querySelectorAll('select, [name="hand"]').forEach(input => input.disabled = false);
    game.querySelectorAll('[name="hand"]').forEach(input => input.checked = false);
    game.querySelector('[name="hand"]').focus();
  });
})();
