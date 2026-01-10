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
 * Global output options
 */
let options: OutputOptions = {
  useColors: checkColorsSupport(),
  useEmoji: checkEmojiSupport(),
  verbosity: 'normal',
};

/**
 * Check if colors are supported
 */
function checkColorsSupport(): boolean {
  try {
    // @ts-ignore: Deno may not be available
    return !Deno.env.get('NO_COLOR') && Deno.stdout.isTerminal();
  } catch {
    return false;
  }
}

/**
 * Check if emoji is supported
 */
function checkEmojiSupport(): boolean {
  try {
    // @ts-ignore: Deno may not be available
    return !Deno.env.get('AT_NO_EMOJI');
  } catch {
    return true;
  }
}

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
 * Log success message to stderr
 */
export function logSuccess(message: string): void {
  const prefix = options.useEmoji ? '✅ ' : 'SUCCESS: ';
  const formatted = colorize(`${prefix}${message}`, 'green');
  console.error(formatted);
}

/**
 * Log error message to stderr
 */
export function logError(message: string, details?: string): void {
  const prefix = options.useEmoji ? '❌ ' : 'ERROR: ';
  const formatted = colorize(`${prefix}${message}`, 'red');
  console.error(formatted);

  if (details) {
    console.error(colorize(`   ${details}`, 'dim'));
  }
}

/**
 * Log error object to stderr
 */
export function logErrorObject(error: unknown): void {
  const message = isAlgoTrainerError(error) ? error.getFormattedMessage() : formatError(error);
  logError(message);

  if (
    options.verbosity === 'verbose' &&
    error instanceof Error &&
    error.stack
  ) {
    console.error(colorize(error.stack, 'dim'));
  }
}

/**
 * Log warning message to stderr
 */
export function logWarning(message: string): void {
  const prefix = options.useEmoji ? '⚠️  ' : 'WARNING: ';
  const formatted = colorize(`${prefix}${message}`, 'yellow');
  console.error(formatted);
}

/**
 * Log info message to stderr
 */
export function logInfo(message: string): void {
  if (options.verbosity === 'quiet') {
    return;
  }

  const prefix = options.useEmoji ? 'ℹ️  ' : 'INFO: ';
  const formatted = colorize(`${prefix}${message}`, 'cyan');
  console.error(formatted);
}

/**
 * Log debug message to stderr (only in verbose mode)
 */
export function logDebug(message: string): void {
  if (options.verbosity !== 'verbose') {
    return;
  }

  const prefix = options.useEmoji ? '🐛 ' : 'DEBUG: ';
  const formatted = colorize(`${prefix}${message}`, 'dim');
  console.error(formatted);
}

/**
 * Log progress message to stderr
 */
export function logProgress(message: string): void {
  if (options.verbosity === 'quiet') {
    return;
  }

  const prefix = options.useEmoji ? '🔄 ' : 'PROGRESS: ';
  const formatted = colorize(`${prefix}${message}`, 'blue');
  console.error(formatted);
}

/**
 * Exit with error message
 */
export function exitWithError(message: string, code = 1): never {
  logError(message);
  try {
    // @ts-ignore: Deno may not be available
    Deno.exit(code);
  } catch {
    // Fallback for non-Deno environments
    throw new Error(`Exit with code ${code}: ${message}`);
  }
}

/**
 * Exit with error object
 */
export function exitWithErrorObject(error: unknown, code = 1): never {
  logErrorObject(error);
  try {
    // @ts-ignore: Deno may not be available
    Deno.exit(code);
  } catch {
    // Fallback for non-Deno environments
    throw error instanceof Error ? error : new Error(String(error));
  }
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
    try {
      // @ts-ignore: Deno may not be available
      return Deno.stdout.isTerminal();
    } catch {
      return false;
    }
  }

  private writeToStderr(text: string): void {
    try {
      // @ts-ignore: Deno may not be available
      Deno.stderr.writeSync(new TextEncoder().encode(text));
    } catch {
      // Fallback for non-Deno environments
      console.error(text);
    }
  }
}
