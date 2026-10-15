import test from 'node:test';
import assert from 'node:assert/strict';
import { applyAbsorbMitigation } from '../../src/engine/combat/absorbMitigation.mjs';

class Decimal {
  constructor(value) { this.value=Number(value); }
  div(other) { return new Decimal(this.value/Number(other)); }
  times(other) { return new Decimal(this.value*(other instanceof Decimal?other.value:Number(other))); }
  minus(other) { return new Decimal(this.value-other.value); }
  static min(a,b) { return new Decimal(Math.min(a.value,Number(b))); }
}
test('25% absorb retains 75% of post-armor damage',()=>{
  const result=applyAbsorbMitigation(new Decimal(80),new Decimal(25),Decimal);
  assert.equal(result.remaining.value,60);
  assert.equal(result.prevented.value,20);
});
test('absorb is capped at 100%',()=>{
  const result=applyAbsorbMitigation(new Decimal(100),new Decimal(120),Decimal);
  assert.equal(result.remaining.value,0);
  assert.equal(result.prevented.value,100);
});
test('zero absorbed amount leaves damage unchanged',()=>{
  const result=applyAbsorbMitigation(new Decimal(0),new Decimal(50),Decimal);
  assert.equal(result.remaining.value,0);
});
