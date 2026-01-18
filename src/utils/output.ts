/**
 * CLI output utilities with proper stream separation
 *
 * Follows 12-factor app principles:
 * - stderr: All human messages (logs, errors, warnings, info, progress)
 * - stdout: Only machine-readable data for piping/consumption
 *
 * @module utils/output
 */

import { formatError, isAlgoTrainerError } from './errors.ts';

/**
 * Output configuration options
 */
export interface OutputOptions {
  /** Whether to use colors in output */
  useColors: boolean;
  /** Whether to use emoji in output */
  useEmoji: boolean;
  /** Verbosity level */
  verbosity: 'quiet' | 'normal' | 'verbose';
}

/**
 * Check if colors are supported
 */
function checkColorsSupport(): boolean {
  return !Deno.env.get('NO_COLOR') && Deno.stdout.isTerminal();
}

/**
 * Check if emoji is supported
 */
function checkEmojiSupport(): boolean {
  return !Deno.env.get('AT_NO_EMOJI');
}

/**
 * Create default output options by detecting environment capabilities
 */
function createDefaultOptions(): OutputOptions {
  return {
    useColors: checkColorsSupport(),
    useEmoji: checkEmojiSupport(),
    verbosity: 'normal',
  };
}

/**
 * Global output options - managed via setter/getter for reset-safe testing
 */
let options: OutputOptions = createDefaultOptions();

/**
 * Update output options
 */
export function setOutputOptions(newOptions: Partial<OutputOptions>): void {
  options = { ...options, ...newOptions };
}

/**
 * Get current output options
 */
export function getOutputOptions(): Readonly<OutputOptions> {
  return options;
}

/**
 * Reset output options to defaults (re-detects environment capabilities)
 * Useful for testing to prevent state leaks between tests
 */
export function resetOutputOptions(): void {
  options = createDefaultOptions();
}

/**
 * Color codes for terminal output
 */
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

/**
 * Apply color to text if colors are enabled
 */
function colorize(text: string, color: keyof typeof colors): string {
  if (!options.useColors) {
    return text;
  }
  return `${colors[color]}${text}${colors.reset}`;
}

/**
 * Table configuration for logger.table()
 */
export interface TableConfig {
  columns: Array<{
    key: string;
    label: string;
    width?: number;
    align?: 'left' | 'right' | 'center';
  }>;
  maxWidth?: number;
}

/**
 * Logger class - unified interface for all human-readable output
 *
 * All methods write to stderr. Respects verbosity and color settings.
 * This is the ONLY interface for human-readable output (besides outputData for stdout).
 */
export class Logger {
  private indentLevel = 0;
  private readonly indentSize = 2;

  // ─────────────────────────────────────────────────────────────
  // Core logging methods (replace standalone log*() functions)
  // ─────────────────────────────────────────────────────────────

  /**
   * Log success message with green color and checkmark
   * @example logger.success('Configuration saved')
   * Output: ✅ Configuration saved
   */
  success(message: string): void {
    const prefix = options.useEmoji ? '✅ ' : 'SUCCESS: ';
    const formatted = colorize(`${prefix}${message}`, 'green');
    this.writeToStderr(formatted);
  }

  /**
   * Log error message with red color
   * @example logger.error('Failed to load', 'File not found')
   * Output: ❌ Failed to load
   *            File not found
   */
  error(message: string, details?: string): void {
    const prefix = options.useEmoji ? '❌ ' : 'ERROR: ';
    const formatted = colorize(`${prefix}${message}`, 'red');
    this.writeToStderr(formatted);

    if (details) {
      this.writeToStderr(colorize(`   ${details}`, 'dim'));
    }
  }

  /**
   * Log error object with formatted message and optional stack trace (verbose mode)
   * Handles both AlgoTrainerError and standard Error types
   * @example logger.errorObject(new ConfigError('Invalid value'))
   */
  errorObject(error: unknown): void {
    const message = isAlgoTrainerError(error) ? error.getFormattedMessage() : formatError(error);
    this.error(message);

    if (
      options.verbosity === 'verbose' &&
      error instanceof Error &&
      error.stack
    ) {
      this.writeToStderr(colorize(error.stack, 'dim'));
    }
  }

  /**
   * Log warning message with yellow color
   * @example logger.warn('Deprecated option used')
   * Output: ⚠️  Deprecated option used
   */
  warn(message: string): void {
    const prefix = options.useEmoji ? '⚠️  ' : 'WARNING: ';
    const formatted = colorize(`${prefix}${message}`, 'yellow');
    this.writeToStderr(formatted);
  }

  /**
   * Log info message with cyan color (suppressed in quiet mode)
   * @example logger.info('Loading configuration...')
   * Output: ℹ️  Loading configuration...
   */
  info(message: string): void {
    if (options.verbosity === 'quiet') {
      return;
    }

    const prefix = options.useEmoji ? 'ℹ️  ' : 'INFO: ';
    const formatted = colorize(`${prefix}${message}`, 'cyan');
    this.writeToStderr(formatted);
  }

  /**
   * Log debug message with dim color (only in verbose mode)
   * @example logger.debug('Cache hit for key: abc123')
   * Output: 🐛 Cache hit for key: abc123
   */
  debug(message: string): void {
    if (options.verbosity !== 'verbose') {
      return;
    }

    const prefix = options.useEmoji ? '🐛 ' : 'DEBUG: ';
    const formatted = colorize(`${prefix}${message}`, 'dim');
    this.writeToStderr(formatted);
  }

  /**
   * Log progress message with blue color (suppressed in quiet mode)
   * @example logger.progress('Generating templates...')
   * Output: 🔄 Generating templates...
   */
  progress(message: string): void {
    if (options.verbosity === 'quiet') {
      return;
    }

    const prefix = options.useEmoji ? '🔄 ' : 'PROGRESS: ';
    const formatted = colorize(`${prefix}${message}`, 'blue');
    this.writeToStderr(formatted);
  }

  // ─────────────────────────────────────────────────────────────
  // Plain output methods (console-like interface)
  // ─────────────────────────────────────────────────────────────

  /**
   * Log plain message to stderr (no prefix, no special formatting)
   * Use for general human-readable output that doesn't fit other categories
   * @example logger.log('Problem: Two Sum [MEDIUM]')
   */
  log(message: string): void;
  log(...args: unknown[]): void;
  log(...args: unknown[]): void {
    const message = args.map(arg =>
      typeof arg === 'string' ? arg : JSON.stringify(arg)
    ).join(' ');
    this.writeToStderr(this.indent(message));
  }

  /**
   * Print empty line to stderr
   * @example logger.newline()
   */
  newline(): void {
    this.writeToStderr('');
  }

  // ─────────────────────────────────────────────────────────────
  // Display formatting methods (replace hardcoded formatting)
  // ─────────────────────────────────────────────────────────────

  /**
   * Output formatted key-value pair
   * @example logger.keyValue('language', 'typescript', 18)
   * Output:   language:         typescript
   */
  keyValue(key: string, value: unknown, keyWidth = 20): void {
    const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
    const paddedKey = (key + ':').padEnd(keyWidth);
    this.writeToStderr(this.indent(`  ${paddedKey} ${valueStr}`));
  }

  /**
   * Output section header
   * @example logger.section('Preferences')
   * Output:   Preferences:
   */
  section(title: string, indent = 0): void {
    const spaces = ' '.repeat(indent);
    this.writeToStderr(`${spaces}${title}:`);
  }

  /**
   * Output horizontal separator line
   * @example logger.separator(50)
   * Output: ──────────────────────────────────────────────────
   */
  separator(width = 50, char = '─'): void {
    this.writeToStderr(this.indent(char.repeat(width)));
  }

  /**
   * Output titled box with content
   * @example logger.box('Teaching Guide', introContent)
   */
  box(title: string, content: string): void {
    const lines = content.split('\n');
    const maxWidth = Math.max(
      title.length,
      ...lines.map(line => line.length)
    );
    const width = Math.min(maxWidth + 4, 80);

    this.separator(width, '─');
    this.log(colorize(title.toUpperCase(), 'bold'));
    this.separator(width, '─');
    lines.forEach(line => this.log(line));
    this.separator(width, '─');
  }

  /**
   * Output formatted table
   * @example logger.table(data, { columns: [...] })
   */
  table(data: Record<string, unknown>[], config: TableConfig): void {
    if (data.length === 0) {
      return;
    }

    // Calculate column widths
    const widths: Record<string, number> = {};
    for (const col of config.columns) {
      const valueWidths = data.map(row =>
        String(row[col.key] ?? '').length
      );
      widths[col.key] = col.width ?? Math.max(
        col.label.length,
        ...valueWidths
      );
    }

    // Header
    const headerParts = config.columns.map(col =>
      col.label.padEnd(widths[col.key])
    );
    this.log(headerParts.join('  '));

    // Separator
    const separatorParts = config.columns.map(col =>
      '─'.repeat(widths[col.key])
    );
    this.log(separatorParts.join('  '));

    // Rows
    for (const row of data) {
      const rowParts = config.columns.map(col => {
        const value = String(row[col.key] ?? '');
        const width = widths[col.key];

        if (col.align === 'right') {
          return value.padStart(width);
        } else if (col.align === 'center') {
          const leftPad = Math.floor((width - value.length) / 2);
          return value.padStart(leftPad + value.length).padEnd(width);
        } else {
          return value.padEnd(width);
        }
      });
      this.log(rowParts.join('  '));
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Grouping methods (for indented sections)
  // ─────────────────────────────────────────────────────────────

  /**
   * Start an indented group
   * @example logger.group('Validation Results')
   */
  group(label?: string): void {
    if (label) {
      this.log(label);
    }
    this.indentLevel++;
  }

  /**
   * End current group
   */
  groupEnd(): void {
    if (this.indentLevel > 0) {
      this.indentLevel--;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Private helper methods
  // ─────────────────────────────────────────────────────────────

  private indent(text: string): string {
    if (this.indentLevel === 0) {
      return text;
    }
    const spaces = ' '.repeat(this.indentLevel * this.indentSize);
    return spaces + text;
  }

  private writeToStderr(text: string): void {
    console.error(text);
  }
}

/** Global logger instance - the single interface for all human output */
export const logger = new Logger();

/**
 * @deprecated Use `logger.success()` instead
 */
export function logSuccess(message: string): void {
  logger.success(message);
}

/**
 * @deprecated Use `logger.error()` instead
 */
export function logError(message: string, details?: string): void {
  logger.error(message, details);
}

/**
 * @deprecated Use `logger.errorObject()` instead
 */
export function logErrorObject(error: unknown): void {
  logger.errorObject(error);
}

/**
 * @deprecated Use `logger.warn()` instead
 */
export function logWarning(message: string): void {
  logger.warn(message);
}

/**
 * @deprecated Use `logger.info()` instead
 */
export function logInfo(message: string): void {
  logger.info(message);
}

/**
 * @deprecated Use `logger.debug()` instead
 */
export function logDebug(message: string): void {
  logger.debug(message);
}

/**
 * @deprecated Use `logger.progress()` instead
 */
export function logProgress(message: string): void {
  logger.progress(message);
}

/**
 * Exit with error message
 */
export function exitWithError(message: string, code = 1): never {
  logger.error(message);
  Deno.exit(code);
}

/**
 * Exit with error object
 */
export function exitWithErrorObject(error: unknown, code = 1): never {
  logger.errorObject(error);
  Deno.exit(code);
}

/**
 * Output machine-readable data to stdout
 * This is the ONLY function that should write to stdout
 */
export function outputData(data: string | object): void {
  if (typeof data === 'string') {
    console.log(data);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

/**
 * Create a simple progress indicator
 */
export class ProgressIndicator {
  private message: string;
  private interval: number | undefined;
  private frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private currentFrame = 0;

  constructor(message: string) {
    this.message = message;
  }

  start(): void {
    if (options.verbosity === 'quiet' || !this.isTerminal()) {
      return;
    }

    this.interval = setInterval(() => {
      const frame = options.useEmoji ? this.frames[this.currentFrame] : '...';
      const text = `${frame} ${this.message}`;
      // Use stderr for progress indicators
      this.writeToStderr(`\r${text}`);
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
    }, 100);
  }

  stop(finalMessage?: string): void {
    if (this.interval !== undefined) {
      clearInterval(this.interval);
      this.interval = undefined;
    }

    if (options.verbosity === 'quiet' || !this.isTerminal()) {
      return;
    }

    // Clear the line and show final message
    this.writeToStderr('\r\x1b[K');
    if (finalMessage) {
      logSuccess(finalMessage);
    }
  }

  private isTerminal(): boolean {
    return Deno.stderr.isTerminal();
  }

  private writeToStderr(text: string): void {
    Deno.stderr.writeSync(new TextEncoder().encode(text));
  }
}
