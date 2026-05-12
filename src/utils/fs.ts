/**
 * File system utilities
 *
 * Provides safe and consistent file operations with proper error handling.
 *
 * @module utils/fs
 */

import { dirname, join } from '@std/path';
import { ensureDir, exists } from '@std/fs';
import { createErrorContext, FileSystemError } from './errors.ts';
import type { FileOperationResult } from '../types/global.ts';

/**
 * File operation options
 */
interface FileOptions {
  /** Whether to create parent directories if they don't exist */
  ensureParents?: boolean;
  /** Whether to overwrite existing files */
  overwrite?: boolean;
  /** File permissions (Unix-style, e.g., 0o755) */
  mode?: number;
}

/**
 * Directory listing options
 */
interface ListOptions {
  /** Whether to include subdirectories recursively */
  recursive?: boolean;
  /** File patterns to include (glob) */
  include?: string[];
  /** File patterns to exclude (glob) */
  exclude?: string[];
  /** Whether to include hidden files */
  includeHidden?: boolean;
}

interface XdgPaths {
  configHome: string;
  dataHome: string;
  cacheHome: string;
  stateHome: string;
  configDirs: string[];
  dataDirs: string[];
}

function getXdgPaths(): XdgPaths {
  const home = Deno.env.get('HOME') || '/tmp';

  return {
    configHome: Deno.env.get('XDG_CONFIG_HOME') || join(home, '.config'),
    dataHome: Deno.env.get('XDG_DATA_HOME') || join(home, '.local', 'share'),
    cacheHome: Deno.env.get('XDG_CACHE_HOME') || join(home, '.cache'),
    stateHome: Deno.env.get('XDG_STATE_HOME') || join(home, '.local', 'state'),
    configDirs: (Deno.env.get('XDG_CONFIG_DIRS') || '/etc/xdg').split(':'),
    dataDirs: (
      Deno.env.get('XDG_DATA_DIRS') || '/usr/local/share:/usr/share'
    ).split(':'),
  };
}

/**
 * Get application-specific XDG paths
 */
export function getAppPaths(appName: string): Record<string, string> {
  const xdg = getXdgPaths();
  return {
    config: join(xdg.configHome, appName),
    data: join(xdg.dataHome, appName),
    cache: join(xdg.cacheHome, appName),
    state: join(xdg.stateHome, appName),
  };
}

/**
 * Check if a path exists
 */
export async function pathExists(path: string): Promise<boolean> {
  try {
    return await exists(path);
  } catch (error) {
    throw new FileSystemError(
      `Failed to check if path exists: ${path}`,
      createErrorContext('pathExists', { path, error: String(error) }),
    );
  }
}

async function readTextFile(path: string): Promise<string> {
  try {
    return await Deno.readTextFile(path);
  } catch (error) {
    throw new FileSystemError(
      `Failed to read file: ${path}`,
      createErrorContext('readTextFile', { path, error: String(error) }),
    );
  }
}

/**
 * Write text to file
 */
export async function writeTextFile(
  path: string,
  content: string,
  options: FileOptions = {},
): Promise<FileOperationResult> {
  try {
    if (options.ensureParents) {
      await ensureDir(dirname(path));
    }

    // Check if file exists and handle overwrite
    if (!options.overwrite && (await pathExists(path))) {
      throw new FileSystemError(
        `File already exists and overwrite is disabled: ${path}`,
        createErrorContext('writeTextFile', { path, overwrite: false }),
      );
    }

    const writeOptions = options.mode !== undefined ? { mode: options.mode } : undefined;
    await Deno.writeTextFile(path, content, writeOptions);

    return {
      success: true,
      path,
      metadata: { size: content.length },
    };
  } catch (error) {
    if (error instanceof FileSystemError) {
      throw error;
    }
    throw new FileSystemError(
      `Failed to write file: ${path}`,
      createErrorContext('writeTextFile', { path, error: String(error) }),
    );
  }
}

/**
 * Read file as JSON
 */
export async function readJsonFile<T = unknown>(path: string): Promise<T> {
  try {
    const content = await readTextFile(path);
    return JSON.parse(content);
  } catch (error) {
    if (error instanceof FileSystemError) {
      throw error;
    }
    throw new FileSystemError(
      `Failed to read JSON file: ${path}`,
      createErrorContext('readJsonFile', { path, error: String(error) }),
    );
  }
}

/**
 * Write object to JSON file
 */
export async function writeJsonFile<T>(
  path: string,
  data: T,
  options: FileOptions & { indent?: number } = {},
): Promise<FileOperationResult> {
  try {
    const { indent = 2, ...fileOptions } = options;
    const content = JSON.stringify(data, null, indent);
    return await writeTextFile(path, content, fileOptions);
  } catch (error) {
    if (error instanceof FileSystemError) {
      throw error;
    }
    throw new FileSystemError(
      `Failed to write JSON file: ${path}`,
      createErrorContext('writeJsonFile', { path, error: String(error) }),
    );
  }
}

/**
 * Create directory with parents
 */
export async function createDirectory(
  path: string,
): Promise<FileOperationResult> {
  try {
    await ensureDir(path);
    return {
      success: true,
      path,
    };
  } catch (error) {
    throw new FileSystemError(
      `Failed to create directory: ${path}`,
      createErrorContext('createDirectory', { path, error: String(error) }),
    );
  }
}

/**
 * Remove file or directory
 */
export async function remove(
  path: string,
  options: { recursive?: boolean } = {},
): Promise<FileOperationResult> {
  try {
    const removeOptions = options.recursive !== undefined
      ? { recursive: options.recursive }
      : undefined;
    await Deno.remove(path, removeOptions);
    return {
      success: true,
      path,
    };
  } catch (error) {
    throw new FileSystemError(
      `Failed to remove: ${path}`,
      createErrorContext('remove', { path, error: String(error) }),
    );
  }
}

/**
 * List directory contents
 */
export async function listDirectory(
  path: string,
  options: ListOptions = {},
): Promise<Array<{ name: string; path: string; isDirectory: boolean }>> {
  try {
    const result: Array<{ name: string; path: string; isDirectory: boolean }> = [];

    for await (const entry of Deno.readDir(path)) {
      const { includeHidden = false } = options;

      // Skip hidden files if not requested
      if (!includeHidden && entry.name.startsWith('.')) {
        continue;
      }

      const entryPath = join(path, entry.name);
      const item = {
        name: entry.name,
        path: entryPath,
        isDirectory: entry.isDirectory,
      };

      result.push(item);

      // Recurse into directories if requested
      if (options.recursive && entry.isDirectory) {
        const subdirContents = await listDirectory(entryPath, options);
        result.push(...subdirContents);
      }
    }

    return result;
  } catch (error) {
    throw new FileSystemError(
      `Failed to list directory: ${path}`,
      createErrorContext('listDirectory', { path, error: String(error) }),
    );
  }
}

/**
 * Join path segments
 */
export function joinPath(first: string, ...paths: string[]): string {
  return join(first, ...paths);
}
