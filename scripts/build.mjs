import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const output = new URL('_site/', root);
await mkdir(output, { recursive: true });
const fingerprint = async (name, content) => {
  const hash = createHash('sha256').update(content).digest('hex').slice(0, 16);
  const filename = name.replace(/(\.[^.]+)$/, `.${hash}$1`);
  await writeFile(new URL(filename, output), content);
  return filename;
};
const pixels = await fingerprint('pixels.js', await readFile(new URL('pixels.js', root), 'utf8'));
const app = await fingerprint('app.js', (await readFile(new URL('app.js', root), 'utf8')).replace("'./pixels.js'", `'./${pixels}'`));
const style = await fingerprint('style.css', await readFile(new URL('style.css', root), 'utf8'));
const html = (await readFile(new URL('index.html', root), 'utf8')).replace('href="style.css"', `href="${style}"`).replace('src="app.js"', `src="${app}"`);
await writeFile(new URL('index.html', output), html);
console.log(`Static site generated: ${fileURLToPath(output)}`);
