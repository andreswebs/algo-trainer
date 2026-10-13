/**
 * Tests for application data path resolution
 *
 * @module test/config-paths.test
 */

import { describe, it } from 'bun:test';
import { deepStrictEqual } from 'node:assert/strict';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDataRoot } from '../src/config/paths.ts';

describe('getDataRoot', () => {
  it('resolves to src/data in source mode', () => {
    deepStrictEqual(getDataRoot(), fileURLToPath(new URL('../src/data', import.meta.url)));
  });

  it('contains the templates and teaching scripts directories', async () => {
    deepStrictEqual((await stat(join(getDataRoot(), 'templates'))).isDirectory(), true);
    deepStrictEqual((await stat(join(getDataRoot(), 'scripts'))).isDirectory(), true);
  });
});
