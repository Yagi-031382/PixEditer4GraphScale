import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, readFile, appendFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

test('公開ファイルの参照を解決でき、依存コード変更時はアプリURLも変わる', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pixel-build-'));
  try {
    await mkdir(join(root, 'scripts'));
    for (const name of ['index.html', 'app.js', 'pixels.js', 'style.css', 'scripts/build.mjs']) {
      await copyFile(new URL(`../${name}`, import.meta.url), join(root, name));
    }
    const build = async () => {
      execFileSync(process.execPath, [join(root, 'scripts/build.mjs')]);
      const html = await readFile(join(root, '_site/index.html'), 'utf8');
      const appName = html.match(/src="(app\.[a-f0-9]+\.js)"/)[1];
      const styleName = html.match(/href="(style\.[a-f0-9]+\.css)"/)[1];
      const app = await readFile(join(root, '_site', appName), 'utf8');
      const pixelsName = app.match(/from '\.\/(pixels\.[a-f0-9]+\.js)'/)[1];
      await readFile(join(root, '_site', pixelsName));
      await readFile(join(root, '_site', styleName));
      return appName;
    };
    const before = await build();
    assert.equal(await build(), before);
    await appendFile(join(root, 'pixels.js'), '\n// dependency changed\n');
    assert.notEqual(await build(), before);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
