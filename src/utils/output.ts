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
 * Log success message to stderr
 */
export function logSuccess(message: string): void {
  const prefix = options.useEmoji ? '✅ ' : 'SUCCESS: ';
  const formatted = colorize(`${prefix}${message}`, 'green');
  console.error(formatted);
}

/**
 * Log error message or error object to stderr
 * 
 * @param messageOrError - Error message string, or an error object to be formatted
 * @param details - Optional additional details (only used when first param is a string)
 */
export function logError(messageOrError: string | unknown, details?: string): void {
  const prefix = options.useEmoji ? '❌ ' : 'ERROR: ';
  
  // Handle error objects
  if (typeof messageOrError !== 'string') {
    const message = isAlgoTrainerError(messageOrError) 
      ? messageOrError.getFormattedMessage() 
      : formatError(messageOrError);
    const formatted = colorize(`${prefix}${message}`, 'red');
    console.error(formatted);

    // Show stack trace in verbose mode
    if (
      options.verbosity === 'verbose' &&
      messageOrError instanceof Error &&
      messageOrError.stack
    ) {
      console.error(colorize(messageOrError.stack, 'dim'));
    }
    return;
  }
  
  // Handle string messages
  const formatted = colorize(`${prefix}${messageOrError}`, 'red');
  console.error(formatted);

  if (details) {
    console.error(colorize(`   ${details}`, 'dim'));
  }
}

/**
 * @deprecated Use logError() instead - it now handles both strings and error objects
 */
export function logErrorObject(error: unknown): void {
  logError(error);
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
  Deno.exit(code);
}

/**
 * Exit with error object
 */
export function exitWithErrorObject(error: unknown, code = 1): never {
  logErrorObject(error);
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
