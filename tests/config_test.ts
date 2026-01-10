/**
 * Tests for configuration manager
 *
 * @module tests/config
 */

import { assertEquals, assertRejects } from "@std/assert";
import { ConfigManager } from "../src/core/config/manager.ts";
import { pathExists, remove } from "../src/utils/fs.ts";
import { getConfigFilePaths } from "../src/core/config/paths.ts";

Deno.test(
  "ConfigManager - should create default config when none exists",
  async () => {
    const manager = new ConfigManager();

    // Clean up any existing config
    const configPath = getConfigFilePaths().main;
    if (await pathExists(configPath)) {
      await remove(configPath);
    }

    // Load should create default config
    const config = await manager.load();

    assertEquals(config.language, "typescript");
    assertEquals(config.aiEnabled, true);
    assertEquals(config.version, "2.0.0");
  }
);

Deno.test("ConfigManager - should update configuration", async () => {
  const manager = new ConfigManager();

  await manager.load();
  await manager.setLanguage("python");

  const config = manager.getConfig();
  assertEquals(config.language, "python");
});

Deno.test("Output utilities - should format messages correctly", async () => {
  const { logSuccess, logError, setOutputOptions } = await import(
    "../src/utils/output.ts"
  );

  // Test that setting options doesn't throw
  setOutputOptions({
    useColors: false,
    useEmoji: false,
    verbosity: "normal",
  });

  // These should not throw
  logSuccess("Test success message");
  logError("Test error message");
});
