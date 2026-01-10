/**
 * File system utilities
 *
 * Provides safe and consistent file operations with proper error handling.
 *
 * @module utils/fs
 */

import { join, dirname, resolve, relative, basename, extname } from "@std/path";
import { ensureDir, exists, copy } from "@std/fs";
import { FileSystemError, createErrorContext } from "./errors.ts";
import type { FileOperationResult } from "../types/global.ts";

/**
 * File operation options
 */
export interface FileOptions {
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
export interface ListOptions {
  /** Whether to include subdirectories recursively */
  recursive?: boolean;
  /** File patterns to include (glob) */
  include?: string[];
  /** File patterns to exclude (glob) */
  exclude?: string[];
  /** Whether to include hidden files */
  includeHidden?: boolean;
}

/**
 * XDG Base Directory Specification paths
 */
export interface XdgPaths {
  /** User-specific configuration directory */
  configHome: string;
  /** User-specific data directory */
  dataHome: string;
  /** User-specific cache directory */
  cacheHome: string;
  /** User-specific state directory */
  stateHome: string;
  /** System configuration directories */
  configDirs: string[];
  /** System data directories */
  dataDirs: string[];
}

/**
 * Get XDG Base Directory paths
 */
export function getXdgPaths(): XdgPaths {
  try {
    // @ts-ignore: Deno may not be available
    const home = Deno.env.get("HOME") || "/tmp";

    return {
      // @ts-ignore: Deno may not be available
      configHome: Deno.env.get("XDG_CONFIG_HOME") || join(home, ".config"),
      // @ts-ignore: Deno may not be available
      dataHome: Deno.env.get("XDG_DATA_HOME") || join(home, ".local", "share"),
      // @ts-ignore: Deno may not be available
      cacheHome: Deno.env.get("XDG_CACHE_HOME") || join(home, ".cache"),
      // @ts-ignore: Deno may not be available
      stateHome:
        Deno.env.get("XDG_STATE_HOME") || join(home, ".local", "state"),
      // @ts-ignore: Deno may not be available
      configDirs: (Deno.env.get("XDG_CONFIG_DIRS") || "/etc/xdg").split(":"),
      // @ts-ignore: Deno may not be available
      dataDirs: (
        Deno.env.get("XDG_DATA_DIRS") || "/usr/local/share:/usr/share"
      ).split(":"),
    };
  } catch {
    // Fallback for non-Deno environments
    const home = "/tmp";
    return {
      configHome: join(home, ".config"),
      dataHome: join(home, ".local", "share"),
      cacheHome: join(home, ".cache"),
      stateHome: join(home, ".local", "state"),
      configDirs: ["/etc/xdg"],
      dataDirs: ["/usr/local/share", "/usr/share"],
    };
  }
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
      createErrorContext("pathExists", { path, error: String(error) })
    );
  }
}

/**
 * Read file as text
 */
export async function readTextFile(path: string): Promise<string> {
  try {
    // @ts-ignore: Deno may not be available
    return await Deno.readTextFile(path);
  } catch (error) {
    throw new FileSystemError(
      `Failed to read file: ${path}`,
      createErrorContext("readTextFile", { path, error: String(error) })
    );
  }
}

/**
 * Write text to file
 */
export async function writeTextFile(
  path: string,
  content: string,
  options: FileOptions = {}
): Promise<FileOperationResult> {
  try {
    if (options.ensureParents) {
      await ensureDir(dirname(path));
    }

    // Check if file exists and handle overwrite
    if (!options.overwrite && (await pathExists(path))) {
      throw new FileSystemError(
        `File already exists and overwrite is disabled: ${path}`,
        createErrorContext("writeTextFile", { path, overwrite: false })
      );
    }

    // @ts-ignore: Deno may not be available
    await Deno.writeTextFile(path, content, { mode: options.mode });

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
      createErrorContext("writeTextFile", { path, error: String(error) })
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
      createErrorContext("readJsonFile", { path, error: String(error) })
    );
  }
}

/**
 * Write object to JSON file
 */
export async function writeJsonFile<T>(
  path: string,
  data: T,
  options: FileOptions & { indent?: number } = {}
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
      createErrorContext("writeJsonFile", { path, error: String(error) })
    );
  }
}

/**
 * Create directory with parents
 */
export async function createDirectory(
  path: string
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
      createErrorContext("createDirectory", { path, error: String(error) })
    );
  }
}

/**
 * Remove file or directory
 */
export async function remove(
  path: string,
  options: { recursive?: boolean } = {}
): Promise<FileOperationResult> {
  try {
    // @ts-ignore: Deno may not be available
    await Deno.remove(path, { recursive: options.recursive });
    return {
      success: true,
      path,
    };
  } catch (error) {
    throw new FileSystemError(
      `Failed to remove: ${path}`,
      createErrorContext("remove", { path, error: String(error) })
    );
  }
}

/**
 * Copy file or directory
 */
export async function copyPath(
  src: string,
  dest: string,
  options: FileOptions = {}
): Promise<FileOperationResult> {
  try {
    if (options.ensureParents) {
      await ensureDir(dirname(dest));
    }

    if (!options.overwrite && (await pathExists(dest))) {
      throw new FileSystemError(
        `Destination already exists and overwrite is disabled: ${dest}`,
        createErrorContext("copyPath", { src, dest, overwrite: false })
      );
    }

    await copy(src, dest, { overwrite: options.overwrite ?? false });

    return {
      success: true,
      path: dest,
      metadata: { source: src },
    };
  } catch (error) {
    if (error instanceof FileSystemError) {
      throw error;
    }
    throw new FileSystemError(
      `Failed to copy from ${src} to ${dest}`,
      createErrorContext("copyPath", { src, dest, error: String(error) })
    );
  }
}

/**
 * List directory contents
 */
export async function listDirectory(
  path: string,
  options: ListOptions = {}
): Promise<Array<{ name: string; path: string; isDirectory: boolean }>> {
  try {
    const result: Array<{ name: string; path: string; isDirectory: boolean }> =
      [];

    // @ts-ignore: Deno may not be available
    for await (const entry of Deno.readDir(path)) {
      const { includeHidden = false } = options;

      // Skip hidden files if not requested
      if (!includeHidden && entry.name.startsWith(".")) {
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
      createErrorContext("listDirectory", { path, error: String(error) })
    );
  }
}

/**
 * Get file/directory stats
 */
export async function getStats(path: string): Promise<{
  size: number;
  isFile: boolean;
  isDirectory: boolean;
  mtime: Date | null;
  atime: Date | null;
  birthtime: Date | null;
}> {
  try {
    // @ts-ignore: Deno may not be available
    const stats = await Deno.stat(path);
    return {
      size: stats.size,
      isFile: stats.isFile,
      isDirectory: stats.isDirectory,
      mtime: stats.mtime,
      atime: stats.atime,
      birthtime: stats.birthtime,
    };
  } catch (error) {
    throw new FileSystemError(
      `Failed to get stats for: ${path}`,
      createErrorContext("getStats", { path, error: String(error) })
    );
  }
}

/**
 * Find files matching a pattern
 */
export async function findFiles(
  searchPath: string,
  pattern: RegExp | string,
  options: ListOptions = {}
): Promise<string[]> {
  try {
    const entries = await listDirectory(searchPath, {
      ...options,
      recursive: true,
    });
    const matcher =
      typeof pattern === "string"
        ? new RegExp(pattern.replace(/\*/g, ".*").replace(/\?/g, "."))
        : pattern;

    return entries
      .filter((entry) => !entry.isDirectory && matcher.test(entry.name))
      .map((entry) => entry.path);
  } catch (error) {
    throw new FileSystemError(
      `Failed to find files in: ${searchPath}`,
      createErrorContext("findFiles", {
        searchPath,
        pattern: String(pattern),
        error: String(error),
      })
    );
  }
}

/**
 * Get relative path between two absolute paths
 */
export function getRelativePath(from: string, to: string): string {
  return relative(from, to);
}

/**
 * Join path segments
 */
export function joinPath(first: string, ...paths: string[]): string {
  return join(first, ...paths);
}

/**
 * Resolve path to absolute
 */
export function resolvePath(first: string, ...paths: string[]): string {
  return resolve(first, ...paths);
}

/**
 * Get directory name
 */
export function getDirname(path: string): string {
  return dirname(path);
}

/**
 * Get base name
 */
export function getBasename(path: string, ext?: string): string {
  return basename(path, ext);
}

/**
 * Get file extension
 */
export function getExtension(path: string): string {
  return extname(path);
}
