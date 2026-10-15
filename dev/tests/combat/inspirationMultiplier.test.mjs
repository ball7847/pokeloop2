import test from 'node:test';
import assert from 'node:assert/strict';
import { inspirationMultiplier } from '../../src/engine/combat/inspirationMultiplier.mjs';

class DecimalStub {
  constructor(n) { this.value = Number(n); }
  plus(other) { return new DecimalStub(this.value + other.value); }
  times(other) { return new DecimalStub(this.value * other); }
}
test('zero stacks leave damage unchanged', () => {
  assert.equal(inspirationMultiplier(0, DecimalStub).value, 1);
});
test('100 stacks grant the original x2 multiplier', () => {
  assert.equal(inspirationMultiplier(100, DecimalStub).value, 2);
});
test('200 stacks grant the original x3 multiplier', () => {
  assert.equal(inspirationMultiplier(200, DecimalStub).value, 3);
});
test('constructs damage factor with the supplied Decimal class', () => {
  assert.ok(inspirationMultiplier(33, DecimalStub) instanceof DecimalStub);
});
