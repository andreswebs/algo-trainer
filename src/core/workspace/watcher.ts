/**
 * File watching utilities for workspace changes (PMS-017).
 *
 * Provides a wrapper around Deno's file system watcher with debouncing
 * and typed events for problem and template changes. This module enables
 * auto-refresh functionality for CLI and development workflows.
 *
 * ## Features
 *
 * - Debounced file change events to prevent rapid-fire updates
 * - Typed events for semantic change detection (problem vs template)
 * - Proper resource cleanup with stop/close methods
 * - Error handling with workspace-specific error types
 *
 * ## Usage
 *
 * @example
 * ```ts
 * import { FileWatcher } from './workspace/watcher.ts';
 *
 * // Create watcher for workspace problems directory
 * const watcher = new FileWatcher('/path/to/workspace/problems');
 *
 * // Listen for events
 * watcher.on('problem-changed', (event) => {
 *   console.log(`Problem changed: ${event.path}`);
 * });
 *
 * // Start watching
 * watcher.start();
 *
 * // Stop watching when done
 * watcher.stop();
 * ```
 *
 * @module core/workspace/watcher
 */

import { join } from '@std/path';
import { createErrorContext, WorkspaceError } from '../../utils/errors.ts';
import { logger } from '../../utils/output.ts';

/**
 * Type of file system event
 */
export type WatchEventKind = 'create' | 'modify' | 'remove' | 'any';

/**
 * Category of workspace change
 */
export type WatchEventCategory = 'problem-changed' | 'template-changed' | 'other';

/**
 * File change event with context
 */
export interface WatchEvent {
  /** The kind of file system event */
  kind: WatchEventKind;
  /** The absolute path of the changed file or directory */
  path: string;
  /** The category of the change (problem, template, or other) */
  category: WatchEventCategory;
  /** Timestamp of when the event was detected */
  timestamp: Date;
}

/**
 * Event handler function type
 */
export type WatchEventHandler = (event: WatchEvent) => void | Promise<void>;

/**
 * Options for configuring the file watcher
 */
export interface FileWatcherOptions {
  /** Paths to watch (files or directories) */
  paths: string[];
  /**
   * Debounce delay in milliseconds
   * Events for the same file within this window will be coalesced
   * @default 300
   */
  debounceMs?: number;
  /**
   * Whether to watch subdirectories recursively
   * @default true
   */
  recursive?: boolean;
}

/**
 * File watcher with debouncing and typed events
 *
 * Wraps Deno's file system watcher to provide:
 * - Debounced event handling to prevent rapid-fire callbacks
 * - Categorization of changes (problem vs template vs other)
 * - Type-safe event handlers
 * - Proper resource cleanup
 *
 * @example
 * ```ts
 * const watcher = new FileWatcher('/workspace/problems');
 *
 * watcher.on('problem-changed', async (event) => {
 *   console.log(`Problem ${event.path} was ${event.kind}`);
 *   // Reload problem data, refresh UI, etc.
 * });
 *
 * watcher.start();
 * // ... later ...
 * watcher.stop();
 * ```
 */
export class FileWatcher {
  private watcher: Deno.FsWatcher | null = null;
  private handlers: Map<WatchEventCategory | 'all', Set<WatchEventHandler>> = new Map();
  private debounceTimers: Map<string, number> = new Map();
  private running = false;
  private options: Required<FileWatcherOptions>;

  /**
   * Create a new file watcher
   *
   * @param paths - Path or paths to watch
   * @param options - Watcher configuration options
   */
  constructor(paths: string | string[], options?: Partial<FileWatcherOptions>) {
    const pathsArray = Array.isArray(paths) ? paths : [paths];

    this.options = {
      paths: pathsArray,
      debounceMs: options?.debounceMs ?? 300,
      recursive: options?.recursive ?? true,
    };

    // Initialize handler sets
    this.handlers.set('all', new Set());
    this.handlers.set('problem-changed', new Set());
    this.handlers.set('template-changed', new Set());
    this.handlers.set('other', new Set());
  }

  /**
   * Register an event handler
   *
   * Handlers can listen to specific categories or 'all' events.
   *
   * @param category - Event category to listen for, or 'all' for all events
   * @param handler - Function to call when event occurs
   *
   * @example
   * ```ts
   * watcher.on('problem-changed', (event) => {
   *   console.log('Problem changed:', event.path);
   * });
   *
   * // Listen to all events
   * watcher.on('all', (event) => {
   *   console.log(`${event.category}: ${event.path}`);
   * });
   * ```
   */
  on(category: WatchEventCategory | 'all', handler: WatchEventHandler): void {
    const handlers = this.handlers.get(category);
    if (handlers) {
      handlers.add(handler);
    }
  }

  /**
   * Unregister an event handler
   *
   * @param category - Event category the handler was registered for
   * @param handler - The handler function to remove
   */
  off(category: WatchEventCategory | 'all', handler: WatchEventHandler): void {
    const handlers = this.handlers.get(category);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Start watching for file changes
   *
   * Begins monitoring the configured paths for changes.
   * Events will be debounced and dispatched to registered handlers.
   *
   * @throws {WorkspaceError} If watcher is already running or fails to start
   *
   * @example
   * ```ts
   * await watcher.start();
   * console.log('Watching for changes...');
   * ```
   */
  start(): void {
    if (this.running) {
      throw new WorkspaceError(
        'Watcher is already running',
        createErrorContext('FileWatcher.start', {
          paths: this.options.paths,
        }),
      );
    }

    try {
      // Create the Deno file system watcher
      this.watcher = Deno.watchFs(this.options.paths, {
        recursive: this.options.recursive,
      });

      this.running = true;

      // Process events in the background
      // We don't await this promise, it runs until stop() is called
      this.processEvents().catch((error) => {
        // If the watcher stops due to an error, mark as not running
        this.running = false;
        // Log error but don't throw (already started successfully)
        logger.error('File watcher error', String(error));
      });
    } catch (error) {
      throw new WorkspaceError(
        `Failed to start file watcher: ${error instanceof Error ? error.message : String(error)}`,
        createErrorContext('FileWatcher.start', {
          paths: this.options.paths,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }

  /**
   * Stop watching for file changes
   *
   * Stops monitoring and cleans up resources.
   * Any pending debounced events will be discarded.
   *
   * This method is idempotent - safe to call multiple times.
   *
   * @example
   * ```ts
   * await watcher.stop();
   * console.log('Stopped watching');
   * ```
   */
  stop(): void {
    if (!this.running) {
      return; // Already stopped
    }

    this.running = false;

    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // Close the watcher
    if (this.watcher) {
      try {
        this.watcher.close();
      } catch (_error) {
        // Ignore close errors
      }
      this.watcher = null;
    }
  }

  /**
   * Check if the watcher is currently running
   *
   * @returns true if watching for changes, false otherwise
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Process file system events from Deno watcher
   *
   * Runs in a loop, consuming events from the watcher and
   * dispatching them to handlers after debouncing.
   */
  private async processEvents(): Promise<void> {
    if (!this.watcher) {
      return;
    }

    try {
      for await (const event of this.watcher) {
        if (!this.running) {
          break;
        }

        // Process each path in the event
        for (const path of event.paths) {
          this.handleEvent(event.kind, path);
        }
      }
    } catch (error) {
      // If watcher is stopped, this is expected
      if (!this.running) {
        return;
      }

      // Otherwise, this is an unexpected error
      throw new WorkspaceError(
        `File watcher encountered an error: ${
          error instanceof Error ? error.message : String(error)
        }`,
        createErrorContext('FileWatcher.processEvents', {
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }

  /**
   * Handle a single file system event with debouncing
   *
   * @param kind - The type of file system event
   * @param path - The path that changed
   */
  private handleEvent(kind: string, path: string): void {
    // Clear existing timer for this path
    const existingTimer = this.debounceTimers.get(path);
    if (existingTimer !== undefined) {
      clearTimeout(existingTimer);
    }

    // Set new debounce timer
    const timer = setTimeout(() => {
      this.debounceTimers.delete(path);
      this.dispatchEvent(kind, path);
    }, this.options.debounceMs);

    this.debounceTimers.set(path, timer);
  }

  /**
   * Dispatch a debounced event to registered handlers
   *
   * @param kind - The type of file system event
   * @param path - The path that changed
   */
  private dispatchEvent(kind: string, path: string): void {
    // Determine event category based on path
    const category = this.categorizeEvent(path);

    // Create event object
    const event: WatchEvent = {
      kind: this.normalizeEventKind(kind),
      path,
      category,
      timestamp: new Date(),
    };

    // Call handlers for specific category
    const categoryHandlers = this.handlers.get(category);
    if (categoryHandlers) {
      for (const handler of categoryHandlers) {
        this.safeCallHandler(handler, event);
      }
    }

    // Call handlers for all events
    const allHandlers = this.handlers.get('all');
    if (allHandlers) {
      for (const handler of allHandlers) {
        this.safeCallHandler(handler, event);
      }
    }
  }

  /**
   * Safely call a handler, catching and logging any errors
   *
   * @param handler - The handler to call
   * @param event - The event to pass to the handler
   */
  private safeCallHandler(handler: WatchEventHandler, event: WatchEvent): void {
    try {
      const result = handler(event);
      // If handler returns a promise, catch any errors
      if (result instanceof Promise) {
        result.catch((error) => {
          logger.error('File watcher handler error', String(error));
        });
      }
    } catch (error) {
      logger.error('File watcher handler error', String(error));
    }
  }

  /**
   * Categorize an event based on the file path
   *
   * @param path - The file path that changed
   * @returns The event category
   */
  private categorizeEvent(path: string): WatchEventCategory {
    // Normalize path for comparison
    const normalizedPath = path.toLowerCase();

    // Check if path is in a problems directory
    if (normalizedPath.includes('/problems/') || normalizedPath.includes('\\problems\\')) {
      return 'problem-changed';
    }

    // Check if path is in a templates directory
    if (normalizedPath.includes('/templates/') || normalizedPath.includes('\\templates\\')) {
      return 'template-changed';
    }

    return 'other';
  }

  /**
   * Normalize Deno's event kind to our type
   *
   * @param kind - Deno's event kind string
   * @returns Normalized event kind
   */
  private normalizeEventKind(kind: string): WatchEventKind {
    switch (kind) {
      case 'create':
        return 'create';
      case 'modify':
        return 'modify';
      case 'remove':
        return 'remove';
      default:
        return 'any';
    }
  }
}

/**
 * Create a simple file watcher for a workspace directory
 *
 * Convenience function for creating a watcher with common defaults.
 *
 * @param workspaceRoot - The workspace root directory
 * @param options - Optional watcher configuration
 * @returns A new FileWatcher instance
 *
 * @example
 * ```ts
 * const watcher = createWorkspaceWatcher('/path/to/workspace');
 * watcher.on('problem-changed', (event) => {
 *   console.log('Problem changed:', event.path);
 * });
 * watcher.start();
 * ```
 */
export function createWorkspaceWatcher(
  workspaceRoot: string,
  options?: Partial<FileWatcherOptions>,
): FileWatcher {
  // Watch both problems and templates directories
  const paths = [
    join(workspaceRoot, 'problems'),
    join(workspaceRoot, 'templates'),
  ];

  return new FileWatcher(paths, options);
}
