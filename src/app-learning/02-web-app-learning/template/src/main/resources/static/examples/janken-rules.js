// Pure rules: no DOM, network, persistence, or random source.
(() => {
  const skills = Object.freeze({ win: ['かちボーナス', '勝ったら +1ポイント'], lose: ['まけボーナス', '負けたら +1ポイント'], draw: ['あいこボーナス', 'あいこなら +1ポイント'] });
  const affinities = Object.freeze({ hinoko: ['win', 'lose'], shizuku: ['lose', 'draw'], konoha: ['win', 'draw'] });
  const names = Object.freeze({ rock: 'グー', scissors: 'チョキ', paper: 'パー' });
  const beats = { rock: 'scissors', scissors: 'paper', paper: 'rock' };
  function resolveRound(hand, cpu, skill) {
    if (!Object.hasOwn(names, hand) || !Object.hasOwn(names, cpu) || !Object.hasOwn(skills, skill))
      throw new RangeError('Unknown hand or skill');
    const outcome = hand === cpu ? 'draw' : beats[hand] === cpu ? 'win' : 'lose';
    return { outcome, base: outcome === 'win' ? 2 : 1, bonus: skill === outcome ? 1 : 0 };
  }
  globalThis.JankenRules = Object.freeze({ skills, affinities, names, resolveRound });
})();
