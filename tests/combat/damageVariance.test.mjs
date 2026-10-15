import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDamageVariance } from '../../src/engine/combat/damageVariance.mjs';

class Decimal {
  constructor(value) { this.value = Number(value); }
  div(n) { return new Decimal(this.value / n); }
  eq(other) { return this.value === other.value; }
  minus(other) { return new Decimal(this.value - other.value); }
  plus(other) { return new Decimal(this.value + other.value); }
  times(n) { return new Decimal(this.value * n); }
}
test('equal min/max damage does not consume random', () => {
  const {factor,isRandom} = calculateDamageVariance(new Decimal(100),new Decimal(100),() => {throw Error('unexpected random');});
  assert.equal(factor.value,1);
  assert.equal(isRandom,false);
});
test('lower variance boundary matches original', () => {
  const result=calculateDamageVariance(new Decimal(75),new Decimal(125),()=>0);
  assert.equal(result.factor.value,0.75);
  assert.equal(result.isRandom,true);
});
test('upper variance boundary matches original', () => {
  const result=calculateDamageVariance(new Decimal(75),new Decimal(125),()=>1);
  assert.equal(result.factor.value,1.25);
});
test('middle variance matches original', () => {
  const result=calculateDamageVariance(new Decimal(75),new Decimal(125),()=>0.5);
  assert.equal(result.factor.value,1);
});
