/**
 * Tests for environment variable configuration support
 *
 * @module test/env.test
 */

import { assertEquals, assertExists } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { ENV_VARS, getEnvVarDocumentation, loadEnvConfig } from '../src/cli/env.ts';

describe('Environment Variable Configuration', () => {
  // Helper to set env vars and clean up
  const withEnv = async (vars: Record<string, string>, fn: () => void | Promise<void>) => {
    const original: Record<string, string | undefined> = {};

    // Save original values and set new ones
    for (const [key, value] of Object.entries(vars)) {
      original[key] = Deno.env.get(key);
      Deno.env.set(key, value);
    }

    try {
      await fn();
    } finally {
      // Restore original values
      for (const key of Object.keys(vars)) {
        const originalValue = original[key];
        if (originalValue === undefined) {
          Deno.env.delete(key);
        } else {
          Deno.env.set(key, originalValue);
        }
      }
    }
  };

  describe('loadEnvConfig', () => {
    it('should return empty config when no env vars are set', async () => {
      await withEnv({}, () => {
        const config = loadEnvConfig();
        assertEquals(config, {});
      });
    });

    it('should load workspace from AT_WORKSPACE', async () => {
      await withEnv({ [ENV_VARS.WORKSPACE]: '/home/user/workspace' }, () => {
        const config = loadEnvConfig();
        assertEquals(config.workspace, '/home/user/workspace');
      });
    });

    it('should trim workspace path', async () => {
      await withEnv({ [ENV_VARS.WORKSPACE]: '  /home/user/workspace  ' }, () => {
        const config = loadEnvConfig();
        assertEquals(config.workspace, '/home/user/workspace');
      });
    });

    it('should load language from AT_LANGUAGE', async () => {
      await withEnv({ [ENV_VARS.LANGUAGE]: 'python' }, () => {
        const config = loadEnvConfig();
        assertEquals(config.language, 'python');
      });
    });

    it('should validate language and ignore invalid values', async () => {
      await withEnv({ [ENV_VARS.LANGUAGE]: 'invalid-language' }, () => {
        const config = loadEnvConfig();
        assertEquals(config.language, undefined);
      });
    });

    it('should load all supported languages', async () => {
      const languages = ['typescript', 'javascript', 'python', 'java', 'cpp', 'rust', 'go'];

      for (const lang of languages) {
        await withEnv({ [ENV_VARS.LANGUAGE]: lang }, () => {
          const config = loadEnvConfig();
          assertEquals(config.language, lang);
        });
      }
    });

    it('should load template style from AT_TEMPLATE_STYLE', async () => {
      await withEnv({ [ENV_VARS.TEMPLATE_STYLE]: 'minimal' }, () => {
        const config = loadEnvConfig();
        assertEquals(config.preferences?.templateStyle, 'minimal');
      });
    });

    it('should validate template style and ignore invalid values', async () => {
      await withEnv({ [ENV_VARS.TEMPLATE_STYLE]: 'invalid-style' }, () => {
        const config = loadEnvConfig();
        assertEquals(config.preferences?.templateStyle, undefined);
      });
    });

    it('should load all supported template styles', async () => {
      const styles = ['minimal', 'documented', 'comprehensive'];

      for (const style of styles) {
        await withEnv({ [ENV_VARS.TEMPLATE_STYLE]: style }, () => {
          const config = loadEnvConfig();
          assertEquals(config.preferences?.templateStyle, style);
        });
      }
    });

    describe('Boolean flags', () => {
      it('should parse AT_VERBOSE as boolean', async () => {
        await withEnv({ [ENV_VARS.VERBOSE]: '1' }, () => {
          const config = loadEnvConfig();
          assertEquals(config.preferences?.verbosity, 'verbose');
        });

        await withEnv({ [ENV_VARS.VERBOSE]: 'true' }, () => {
          const config = loadEnvConfig();
          assertEquals(config.preferences?.verbosity, 'verbose');
        });

        await withEnv({ [ENV_VARS.VERBOSE]: 'yes' }, () => {
          const config = loadEnvConfig();
          assertEquals(config.preferences?.verbosity, 'verbose');
        });

        await withEnv({ [ENV_VARS.VERBOSE]: 'on' }, () => {
          const config = loadEnvConfig();
          assertEquals(config.preferences?.verbosity, 'verbose');
        });
      });

      it('should parse AT_QUIET as boolean', async () => {
        await withEnv({ [ENV_VARS.QUIET]: '1' }, () => {
          const config = loadEnvConfig();
          assertEquals(config.preferences?.verbosity, 'quiet');
        });

        await withEnv({ [ENV_VARS.QUIET]: 'false' }, () => {
          const config = loadEnvConfig();
          assertEquals(config.preferences?.verbosity, 'normal');
        });
      });

      it('should parse AT_NO_COLOR as boolean', async () => {
        await withEnv({ [ENV_VARS.NO_COLOR]: '1' }, () => {
          const config = loadEnvConfig();
          assertEquals(config.preferences?.useColors, false);
        });

        await withEnv({ [ENV_VARS.NO_COLOR]: '0' }, () => {
          const config = loadEnvConfig();
          assertEquals(config.preferences?.useColors, true);
        });
      });

      it('should parse AT_NO_EMOJI as boolean', async () => {
        await withEnv({ [ENV_VARS.NO_EMOJI]: 'true' }, () => {
          const config = loadEnvConfig();
          assertEquals(config.preferences?.useEmoji, false);
        });

        await withEnv({ [ENV_VARS.NO_EMOJI]: 'false' }, () => {
          const config = loadEnvConfig();
          assertEquals(config.preferences?.useEmoji, true);
        });
      });

      it('should be case-insensitive for boolean values', async () => {
        await withEnv({ [ENV_VARS.VERBOSE]: 'TRUE' }, () => {
          const config = loadEnvConfig();
          assertEquals(config.preferences?.verbosity, 'verbose');
        });

        await withEnv({ [ENV_VARS.NO_COLOR]: 'YES' }, () => {
          const config = loadEnvConfig();
          assertEquals(config.preferences?.useColors, false);
        });
      });
    });

    describe('Multiple environment variables', () => {
      it('should load multiple env vars together', async () => {
        await withEnv(
          {
            [ENV_VARS.WORKSPACE]: '/home/workspace',
            [ENV_VARS.LANGUAGE]: 'typescript',
            [ENV_VARS.TEMPLATE_STYLE]: 'documented',
            [ENV_VARS.VERBOSE]: '1',
            [ENV_VARS.NO_COLOR]: '0',
          },
          () => {
            const config = loadEnvConfig();
            assertEquals(config.workspace, '/home/workspace');
            assertEquals(config.language, 'typescript');
            assertEquals(config.preferences?.templateStyle, 'documented');
            assertEquals(config.preferences?.verbosity, 'verbose');
            assertEquals(config.preferences?.useColors, true);
          },
        );
      });

      it('should prioritize AT_VERBOSE over AT_QUIET when both are set', async () => {
        await withEnv(
          {
            [ENV_VARS.VERBOSE]: '1',
            [ENV_VARS.QUIET]: '1',
          },
          () => {
            const config = loadEnvConfig();
            assertEquals(config.preferences?.verbosity, 'verbose');
          },
        );
      });
    });

    describe('Edge cases', () => {
      it('should handle empty string values', async () => {
        await withEnv({ [ENV_VARS.WORKSPACE]: '' }, () => {
          const config = loadEnvConfig();
          assertEquals(config.workspace, undefined);
        });
      });

      it('should handle whitespace-only values', async () => {
        await withEnv({ [ENV_VARS.WORKSPACE]: '   ' }, () => {
          const config = loadEnvConfig();
          assertEquals(config.workspace, undefined);
        });
      });

      it('should ignore invalid boolean values', async () => {
        await withEnv({ [ENV_VARS.VERBOSE]: 'invalid' }, () => {
          const config = loadEnvConfig();
          assertEquals(config.preferences?.verbosity, undefined);
        });
      });
    });
  });

  describe('getEnvVarDocumentation', () => {
    it('should return documentation string', () => {
      const doc = getEnvVarDocumentation();
      assertExists(doc);
      assertEquals(typeof doc, 'string');

      // Check that all env vars are documented
      for (const varName of Object.values(ENV_VARS)) {
        assertEquals(
          doc.includes(varName),
          true,
          `Documentation should include ${varName}`,
        );
      }
    });

    it('should mention supported languages', () => {
      const doc = getEnvVarDocumentation();
      assertEquals(doc.includes('typescript'), true);
      assertEquals(doc.includes('python'), true);
    });

    it('should mention template styles', () => {
      const doc = getEnvVarDocumentation();
      assertEquals(doc.includes('minimal'), true);
      assertEquals(doc.includes('documented'), true);
      assertEquals(doc.includes('comprehensive'), true);
    });

    it('should mention precedence', () => {
      const doc = getEnvVarDocumentation();
      assertEquals(doc.includes('precedence'), true);
    });
  });
});
