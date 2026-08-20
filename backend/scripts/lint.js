const { execSync } = require('node:child_process');
const { readdirSync, statSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '..', 'src');

function check(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      check(p);
    } else if (p.endsWith('.js')) {
      execSync(`node --check "${p}"`, { stdio: 'inherit' });
    }
  }
}

check(root);
console.log('Lint OK: all files passed node --check');
