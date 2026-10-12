/**
 * Tests for application data path resolution
 *
 * @module test/config-paths.test
 */

import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertEquals } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { getDataRoot } from '../src/config/paths.ts';

describe('getDataRoot', () => {
  it('resolves to src/data in source mode', () => {
    assertEquals(getDataRoot(), fileURLToPath(new URL('../src/data', import.meta.url)));
  });

  it('contains the templates and teaching scripts directories', async () => {
    assertEquals((await stat(join(getDataRoot(), 'templates'))).isDirectory(), true);
    assertEquals((await stat(join(getDataRoot(), 'scripts'))).isDirectory(), true);
  });
});
