import test from 'node:test';
import assert from 'node:assert/strict';
import { applyArmorMitigation } from '../../src/engine/combat/armorMitigation.mjs';

class Decimal {
  constructor(value) { this.value = Number(value); }
  minus(other) { return new Decimal(this.value - other.value); }
  eq(other) { return this.value === Number(other); }
  static max(a, b) { return new Decimal(Math.max(Number(a), b.value)); }
}
test('zero armor preserves exact incoming object value', () => {
  const damage = new Decimal(100);
  assert.equal(applyArmorMitigation(damage, new Decimal(0), Decimal).value,100);
});
test('armor subtracts before later absorb modifiers', () => {
  assert.equal(applyArmorMitigation(new Decimal(100),new Decimal(30),Decimal).value,70);
});
test('armor never produces negative damage', () => {
  assert.equal(applyArmorMitigation(new Decimal(10),new Decimal(40),Decimal).value,0);
});
