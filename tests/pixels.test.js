import test from 'node:test';
import assert from 'node:assert/strict';
import { replaceColor, countColor } from '../pixels.js';
test('同色の離れたピクセルをすべて変更し、近似色と異なるアルファは保持する', () => {
  const data = new Uint8ClampedArray([12,34,56,255, 12,34,57,255, 12,34,56,128, 12,34,56,255]);
  assert.equal(countColor(data, [12,34,56,255]), 2);
  assert.equal(replaceColor(data, [12,34,56,255], [90,80,70,255]), 2);
  assert.deepEqual([...data], [90,80,70,255, 12,34,57,255, 12,34,56,128, 90,80,70,255]);
});
test('透明への置換と透明ピクセルの再着色', () => {
  const data = new Uint8ClampedArray([255,255,255,255, 0,0,0,255]);
  assert.equal(replaceColor(data, [255,255,255,255], [0,0,0,0]), 1);
  assert.equal(replaceColor(data, [0,0,0,0], [255,0,0,255]), 1);
  assert.deepEqual([...data], [255,0,0,255, 0,0,0,255]);
});
test('一致しない場合は変更しない', () => {
  const data = new Uint8ClampedArray([1,2,3,255]);
  assert.equal(replaceColor(data, [0,0,0,0], [9,9,9,255]), 0);
  assert.deepEqual([...data], [1,2,3,255]);
});
