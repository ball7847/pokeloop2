import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const entrypoints = ['index.html'];
const checked = new Set();
function checkModule(file) {
  const absolute = path.resolve(file);
  assert.ok(fs.existsSync(absolute), `Missing module: ${file}`);
  if (checked.has(absolute)) return;
  checked.add(absolute);
  const source = fs.readFileSync(absolute,'utf8');
  const importPathRegex = /(?:\bfrom\s*|\bimport\s*)['"]([^'"]+)['"]/g;
  for (const [,specifier] of source.matchAll(importPathRegex)) {
    if (!specifier.startsWith('.')) continue;
    const child = path.resolve(path.dirname(absolute),specifier);
    assert.ok(fs.existsSync(child), `Broken relative import: ${file} -> ${specifier}`);
    if (/\.(?:m?js)$/.test(child)) checkModule(child);
  }
}
const html=fs.readFileSync('index.html','utf8');
for (const [,filename] of html.matchAll(/(?:src|href)="(\.\/assets\/[^"]+\.js)"/g)) {
  checkModule(filename);
}
assert.ok(checked.size > 5, 'Expected to traverse compiled entrypoint dependency graph');
console.log(`Relative module paths verified: ${checked.size} modules`);
