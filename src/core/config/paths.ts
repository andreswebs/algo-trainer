/**
 * XDG-compliant configuration path utilities
 *
 * Provides path resolution following XDG Base Directory Specification.
 *
 * @module core/config/paths
 */

import { joinPath, getAppPaths } from "../../utils/fs.ts";

/**
 * Application name for configuration paths
 */
export const APP_NAME = "algo-trainer";

/**
 * Get all application-specific paths
 */
export function getConfigPaths(): {
  config: string;
  data: string;
  cache: string;
  state: string;
} {
  const paths = getAppPaths(APP_NAME);
  return {
    config: paths.config,
    data: paths.data,
    cache: paths.cache,
    state: paths.state,
  };
}

/**
 * Get specific configuration file paths
 */
export function getConfigFilePaths(): {
  main: string;
  workspace: string;
  progress: string;
  cache: string;
} {
  const paths = getConfigPaths();

  return {
    main: joinPath(paths.config, "config.json"),
    workspace: joinPath(paths.state, "workspace.json"),
    progress: joinPath(paths.data, "progress.json"),
    cache: joinPath(paths.cache, "api-cache.json"),
  };
}

/**
 * Get legacy configuration paths for migration
 */
export function getLegacyConfigPaths(): {
  oldConfig: string;
  oldWorkspace: string;
} {
  try {
    // @ts-ignore: Deno may not be available
    const home = Deno.env.get("HOME") || "/tmp";

    return {
      oldConfig: joinPath(home, ".leetcode-config.json"),
      oldWorkspace: joinPath(home, ".algo-trainer"),
    };
  } catch {
    return {
      oldConfig: "/tmp/.leetcode-config.json",
      oldWorkspace: "/tmp/.algo-trainer",
    };
  }
}
