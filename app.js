import { replaceSelections, countSelections } from './pixels.js';
const $ = id => document.getElementById(id);
const canvas = $('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
let original = null, previous = null, selected = [], fileName = 'image', loadVersion = 0;
let region = { left: 0, right: 1, top: 0, bottom: 1 };
const hex = color => '#' + color.slice(0, 3).map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
const status = message => { $('status').textContent = message; };
function fit() {
  if (!original) return;
  const scale = $('zoom').value === 'fit' ? Math.min(1, ($('viewport').clientWidth - 24) / canvas.width, ($('viewport').clientHeight - 24) / canvas.height) : Number($('zoom').value);
  canvas.style.width = `${canvas.width * scale}px`;
  canvas.style.height = `${canvas.height * scale}px`;
  $('image-stage').style.width = canvas.style.width;
  $('image-stage').style.height = canvas.style.height;
  renderRegion();
}
function updateMatches() {
  const count = original ? countSelections(regionImage().data, selected) : 0;
  $('matches').textContent = selected.length ? `${selected.length} 色を選択 · ${count.toLocaleString()} ピクセルが領域内で一致（重複なし）` : '画像をクリックして色を追加してください。';
  $('replace').disabled = count === 0;
  $('clear-selection').disabled = selected.length === 0;
}
function showSelection() {
  const list = $('selected-colors');
  list.replaceChildren();
  selected.forEach((selection, index) => {
    const row = document.createElement('li');
    row.className = 'selected-color';
    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.background = `rgba(${selection.color.slice(0, 3).join(',')},${selection.color[3] / 255})`;
    const title = document.createElement('strong');
    title.textContent = hex(selection.color);
    const detail = document.createElement('small');
    detail.textContent = `RGBA (${selection.color.join(', ')}) · (${selection.x}, ${selection.y})`;
    const heading = document.createElement('div');
    heading.className = 'color-readout';
    const description = document.createElement('div');
    description.append(title, detail);
    const remove = document.createElement('button');
    remove.type = 'button'; remove.className = 'button secondary remove-color';
    remove.textContent = '削除'; remove.setAttribute('aria-label', `${index + 1}番目の色 ${hex(selection.color)} を削除`);
    remove.addEventListener('click', () => { selected.splice(index, 1); showSelection(); });
    heading.append(swatch, description, remove);
    const label = document.createElement('label');
    label.className = 'choice';
    const toggle = document.createElement('input');
    toggle.type = 'checkbox'; toggle.checked = selection.similar;
    toggle.setAttribute('role', 'switch');
    toggle.setAttribute('aria-label', `${index + 1}番目の色の似た色相も対象`);
    toggle.addEventListener('change', () => { selection.similar = toggle.checked; range.disabled = !toggle.checked; updateMatches(); });
    label.append(toggle, '似た色相も対象');
    const tolerance = document.createElement('label');
    tolerance.className = 'tolerance';
    const value = document.createElement('span');
    value.textContent = `色相の許容差 ±${selection.tolerance}°`;
    const range = document.createElement('input');
    range.type = 'range'; range.min = '0'; range.max = '60'; range.value = selection.tolerance;
    range.disabled = !selection.similar;
    range.setAttribute('aria-label', `${index + 1}番目の色の色相の許容差`);
    range.addEventListener('input', () => { selection.tolerance = Number(range.value); value.textContent = `色相の許容差 ±${selection.tolerance}°`; updateMatches(); });
    tolerance.append(value, range);
    row.append(heading, label, tolerance);
    list.append(row);
  });
  updateMatches();
}
$('clear-selection').addEventListener('click', () => { selected = []; showSelection(); });
async function openFile(file) {
  if (!file) return;
  const version = ++loadVersion;
  const url = URL.createObjectURL(file);
  const img = new Image();
  try {
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = url; });
    if (version !== loadVersion) return;
    if (img.naturalWidth * img.naturalHeight > 16000000) throw new Error('large');
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    original = ctx.getImageData(0, 0, canvas.width, canvas.height);
    previous = null; selected = []; fileName = file.name.replace(/\.[^.]+$/, '') || 'image';
    canvas.hidden = false; $('image-stage').hidden = false; $('empty').hidden = true;
    region = { left: 0, right: canvas.width, top: 0, bottom: canvas.height };
    $('region-controls').disabled = false;
    $('region-enabled').checked = false;
    $('controls').disabled = false; $('download').disabled = false; $('reset').disabled = false; $('zoom').disabled = false; $('undo').disabled = true;
    $('dimensions').textContent = `${canvas.width} × ${canvas.height} px`;
    $('zoom').value = 'fit'; fit(); showSelection();
    status('画像を開きました。置き換えたい色をクリックしてください。アニメーション画像は先頭フレームを編集します。');
  } catch (error) {
    if (version === loadVersion) status(error?.message === 'large' ? '画像が大きすぎます。1,600万ピクセル以下の画像を選択してください。' : '画像を読み込めませんでした。PNG・JPEG・WebP などの画像を選択してください。');
  } finally { URL.revokeObjectURL(url); }
}
$('file').addEventListener('change', e => { openFile(e.target.files[0]); e.target.value = ''; });
canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  const x = Math.min(canvas.width - 1, Math.max(0, Math.floor((e.clientX - rect.left) * canvas.width / rect.width)));
  const y = Math.min(canvas.height - 1, Math.max(0, Math.floor((e.clientY - rect.top) * canvas.height / rect.height)));
  const color = Array.from(ctx.getImageData(x, y, 1, 1).data);
  if (selected.some(s => s.color.every((value, i) => value === color[i]))) {
    status('この色は選択済みです。色ごとの設定を変更できます。');
    return;
  }
  selected.push({ color, x, y, similar: false, tolerance: 15 });
  showSelection(); status(`座標 (${x}, ${y}) の色を追加しました。続けて別の色をクリックできます。`);
});
$('replace').addEventListener('click', () => {
  if (!selected.length) return;
  const bounds = activeRegion();
  const data = regionImage();
  const color = $('target').value;
  const target = document.querySelector('input[name="mode"]:checked').value === 'transparent' ? [0, 0, 0, 0] : [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16)).concat(255);
  previous = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const count = replaceSelections(data.data, selected, target);
  ctx.putImageData(data, bounds.left, bounds.top); $('undo').disabled = false;
  selected = []; showSelection(); status(`${count.toLocaleString()} ピクセルを置き換えました。`);
});
$('target').addEventListener('input', () => { $('target-value').textContent = $('target').value.toUpperCase(); });
$('undo').addEventListener('click', () => {
  if (!previous) return;
  ctx.putImageData(previous, 0, 0); previous = null; selected = []; $('undo').disabled = true; showSelection(); status('直前の操作を元に戻しました。');
});
$('reset').addEventListener('click', () => {
  if (!original) return;
  previous = ctx.getImageData(0, 0, canvas.width, canvas.height);
  ctx.putImageData(original, 0, 0); selected = []; $('undo').disabled = false; showSelection(); status('最初の画像に戻しました。');
});
$('download').addEventListener('click', () => {
  canvas.toBlob(blob => {
    if (!blob) { status('PNG の生成に失敗しました。'); return; }
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = `${fileName}-edited.png`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    status('編集した画像を PNG で保存しました。');
  }, 'image/png');
});
$('zoom').addEventListener('change', fit);
window.addEventListener('resize', fit);
const viewport = $('viewport');
viewport.addEventListener('dragover', e => { e.preventDefault(); viewport.classList.add('dragover'); });
viewport.addEventListener('dragleave', () => viewport.classList.remove('dragover'));
viewport.addEventListener('drop', e => { e.preventDefault(); viewport.classList.remove('dragover'); openFile(e.dataTransfer.files[0]); });

function activeRegion() {
  return $('region-enabled').checked ? region : { left: 0, top: 0, right: canvas.width, bottom: canvas.height };
}
function regionImage() {
  const r = activeRegion();
  return ctx.getImageData(r.left, r.top, r.right - r.left, r.bottom - r.top);
}
function renderRegion() {
  const enabled = $('region-enabled').checked;
  $('region-overlay').hidden = !enabled;
  for (const edge of ['left', 'right', 'top', 'bottom']) {
    const input = $(`region-${edge}`);
    input.value = region[edge]; input.disabled = !enabled;
    const vertical = edge === 'left' || edge === 'right';
    input.max = vertical ? canvas.width : canvas.height;
    document.querySelector(`[data-edge="${edge}"]`).style[vertical ? 'left' : 'top'] = `${region[edge] / (vertical ? canvas.width : canvas.height) * 100}%`;
  }
  const outline = $('region-outline');
  outline.style.left = `${region.left / canvas.width * 100}%`;
  outline.style.top = `${region.top / canvas.height * 100}%`;
  outline.style.width = `${(region.right - region.left) / canvas.width * 100}%`;
  outline.style.height = `${(region.bottom - region.top) / canvas.height * 100}%`;
  $('region-summary').textContent = enabled ? `対象: X ${region.left}〜${region.right - 1} / Y ${region.top}〜${region.bottom - 1}（${region.right - region.left} × ${region.bottom - region.top} px）` : '対象は画像全体です。';
}
function setBoundary(edge, value) {
  if (!Number.isFinite(value)) { renderRegion(); return; }
  const limits = { left: [0, region.right - 1], right: [region.left + 1, canvas.width], top: [0, region.bottom - 1], bottom: [region.top + 1, canvas.height] };
  region[edge] = Math.min(limits[edge][1], Math.max(limits[edge][0], Math.round(value)));
  renderRegion();
}
$('region-enabled').addEventListener('change', () => { renderRegion(); updateMatches(); });
$('region-full').addEventListener('click', () => {
  region = { left: 0, right: canvas.width, top: 0, bottom: canvas.height };
  renderRegion(); updateMatches();
});
for (const edge of ['left', 'right', 'top', 'bottom']) {
  $(`region-${edge}`).addEventListener('change', event => { setBoundary(edge, event.target.value === '' ? NaN : Number(event.target.value)); updateMatches(); });
}
for (const axis of document.querySelectorAll('.axis')) {
  let dragging = false;
  const move = event => {
    const rect = canvas.getBoundingClientRect();
    const vertical = axis.classList.contains('vertical');
    setBoundary(axis.dataset.edge, vertical ? (event.clientX - rect.left) / rect.width * canvas.width : (event.clientY - rect.top) / rect.height * canvas.height);
  };
  axis.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault(); dragging = true; axis.setPointerCapture(event.pointerId); move(event);
  });
  axis.addEventListener('pointermove', event => { if (dragging) move(event); });
  axis.addEventListener('pointerup', event => {
    if (!dragging) return;
    move(event); dragging = false; axis.releasePointerCapture(event.pointerId); updateMatches();
  });
  axis.addEventListener('lostpointercapture', () => { if (dragging) { dragging = false; updateMatches(); } });
  axis.addEventListener('click', event => event.stopPropagation());
  axis.addEventListener('keydown', event => {
    const delta = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[event.key];
    if (delta) { event.preventDefault(); setBoundary(axis.dataset.edge, region[axis.dataset.edge] + delta); updateMatches(); }
  });
}
