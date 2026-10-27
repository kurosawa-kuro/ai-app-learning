const { test } = require('node:test');
const assert = require('node:assert/strict');
require('../../src/main/resources/static/examples/janken-rules.js');
const { resolveRound } = globalThis.JankenRules;

test('all nine hand pairs preserve win/draw/lose and matching skill bonuses', () => {
  const hands = ['rock', 'scissors', 'paper'];
  const outcomes = [['draw', 'win', 'lose'], ['lose', 'draw', 'win'], ['win', 'lose', 'draw']];
  hands.forEach((hand, row) => hands.forEach((cpu, col) => {
    const outcome = outcomes[row][col];
    for (const skill of ['win', 'lose', 'draw']) {
      assert.deepEqual(resolveRound(hand, cpu, skill), {
        outcome, base: outcome === 'win' ? 2 : 1, bonus: skill === outcome ? 1 : 0
      });
    }
  }));
});

test('unknown values are rejected without relying on form controls', () => {
  assert.throws(() => resolveRound('unknown', 'rock', 'win'), RangeError);
  assert.throws(() => resolveRound('rock', 'rock', 'unknown'), RangeError);
});
