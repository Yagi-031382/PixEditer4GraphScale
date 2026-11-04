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

import { countSelections, replaceSelections, hue } from '../pixels.js';
test('複数色の一致を一括置換し、対象範囲の重複は1回だけ数える', () => {
  const data = new Uint8ClampedArray([255,0,0,255, 255,20,0,255, 0,0,255,255, 0,255,0,255]);
  const selections = [{color:[255,0,0,255],similar:true,tolerance:15},{color:[255,20,0,255],similar:false},{color:[0,0,255,255],similar:false}];
  assert.equal(countSelections(data, selections), 3);
  assert.equal(replaceSelections(data, selections, [0,0,0,0]), 3);
  assert.deepEqual([...data], [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,255,0,255]);
});
test('色相の循環、明度・彩度・アルファ差、色ごとのスイッチを判定する', () => {
  const data = new Uint8ClampedArray([255,0,20,255, 100,50,50,128, 0,20,255,255, 128,128,128,255, 255,0,0,0]);
  const selections = [{color:[255,0,0,255],similar:true,tolerance:10},{color:[0,0,255,255],similar:false,tolerance:10}];
  assert.equal(countSelections(data, selections), 2);
  selections[1].similar = true;
  assert.equal(countSelections(data, selections), 3);
  selections[0].similar = false;
  assert.equal(countSelections(data, selections), 1);
  assert.equal(hue([128,128,128,255]), null);
  assert.equal(hue([255,0,0,0]), null);
});
test('無彩色と透明色はスイッチONでも完全一致のみ、空選択は無変更', () => {
  const data = new Uint8ClampedArray([128,128,128,255, 130,130,130,255, 0,0,0,0]);
  assert.equal(countSelections(data, [{color:[128,128,128,255],similar:true}]), 1);
  assert.equal(countSelections(data, [{color:[0,0,0,0],similar:true}]), 1);
  assert.equal(replaceSelections(data, [], [255,0,0,255]), 0);
});
