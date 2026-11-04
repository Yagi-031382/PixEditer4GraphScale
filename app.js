import { replaceColor, countColor } from './pixels.js';
const $ = id => document.getElementById(id);
const canvas = $('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
let original = null, previous = null, selected = null, fileName = 'image', loadVersion = 0;
const hex = color => '#' + color.slice(0, 3).map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
const status = message => { $('status').textContent = message; };
function fit() {
  if (!original) return;
  const scale = $('zoom').value === 'fit' ? Math.min(1, ($('viewport').clientWidth - 24) / canvas.width, ($('viewport').clientHeight - 24) / canvas.height) : Number($('zoom').value);
  canvas.style.width = `${canvas.width * scale}px`;
  canvas.style.height = `${canvas.height * scale}px`;
}
function showSelection() {
  $('replace').disabled = !selected;
  if (!selected) {
    $('source-value').textContent = '未選択';
    $('source-detail').textContent = '画像をクリックして色を選択';
    $('source-swatch').style.background = '#f2f2f6';
    $('matches').textContent = '完全に同じ RGBA 値の色を対象にします。';
    return;
  }
  $('source-value').textContent = hex(selected);
  $('source-detail').textContent = `RGBA (${selected.join(', ')})`;
  $('source-swatch').style.background = `rgba(${selected.slice(0, 3).join(',')},${selected[3] / 255})`;
  const count = countColor(ctx.getImageData(0, 0, canvas.width, canvas.height).data, selected);
  $('matches').textContent = `${count.toLocaleString()} ピクセルが一致`;
  $('replace').disabled = count === 0;
}
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
    previous = null; selected = null; fileName = file.name.replace(/\.[^.]+$/, '') || 'image';
    canvas.hidden = false; $('empty').hidden = true;
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
  selected = Array.from(ctx.getImageData(x, y, 1, 1).data);
  showSelection(); status(`座標 (${x}, ${y}) の色を選択しました。`);
});
$('replace').addEventListener('click', () => {
  if (!selected) return;
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const color = $('target').value;
  const target = document.querySelector('input[name="mode"]:checked').value === 'transparent' ? [0, 0, 0, 0] : [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16)).concat(255);
  previous = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const count = replaceColor(data.data, selected, target);
  ctx.putImageData(data, 0, 0); $('undo').disabled = false;
  selected = null; showSelection(); status(`${count.toLocaleString()} ピクセルを置き換えました。`);
});
$('target').addEventListener('input', () => { $('target-value').textContent = $('target').value.toUpperCase(); });
$('undo').addEventListener('click', () => {
  if (!previous) return;
  ctx.putImageData(previous, 0, 0); previous = null; selected = null; $('undo').disabled = true; showSelection(); status('直前の操作を元に戻しました。');
});
$('reset').addEventListener('click', () => {
  if (!original) return;
  previous = ctx.getImageData(0, 0, canvas.width, canvas.height);
  ctx.putImageData(original, 0, 0); selected = null; $('undo').disabled = false; showSelection(); status('最初の画像に戻しました。');
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
