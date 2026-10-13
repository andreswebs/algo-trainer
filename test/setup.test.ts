import { describe, test } from 'bun:test';
import { deepStrictEqual, ok } from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { basename, dirname } from 'node:path';

describe('test preload', () => {
  test('removes every AT_* variable', () => {
    deepStrictEqual(
      Object.keys(process.env).filter((key) => key.startsWith('AT_')),
      [],
    );
  });

  test('points every XDG_*_HOME at one temporary root', () => {
    const homes = ['CONFIG', 'DATA', 'CACHE', 'STATE'].map(
      (kind) => process.env[`XDG_${kind}_HOME`],
    );
    const roots = new Set(homes.map((home) => (home == null ? undefined : dirname(home))));
    deepStrictEqual(roots.size, 1);
    const [root] = roots;
    ok(root != null);
    deepStrictEqual(dirname(root), tmpdir());
    ok(basename(root).startsWith('algo-trainer-test-'));
  });
});
