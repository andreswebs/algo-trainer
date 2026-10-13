import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

for (const key of Object.keys(process.env)) {
  if (key.startsWith('AT_')) {
    delete process.env[key];
  }
}

const root = mkdtempSync(join(tmpdir(), 'algo-trainer-test-'));
for (const kind of ['CONFIG', 'DATA', 'CACHE', 'STATE']) {
  process.env[`XDG_${kind}_HOME`] = join(root, kind.toLowerCase());
}
