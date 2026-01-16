/**
 * Interactive prompts system for CLI
 *
 * Provides interactive prompt utilities for gathering user input when
 * required arguments are missing. Handles both interactive terminals
 * and non-interactive environments (CI/pipelines).
 *
 * @module cli/prompts
 */

import type { Difficulty, SupportedLanguage } from '../types/global.ts';

/**
 * Checks if the current environment is interactive (TTY).
 *
 * Returns false in CI environments or when stdin/stdout are not TTY devices.
 * This prevents hanging in automated environments.
 *
 * @returns true if running in an interactive terminal, false otherwise
 */
export function isInteractive(): boolean {
  return Deno.stdin.isTerminal() && Deno.stdout.isTerminal();
}

/**
 * Prompts user for text input.
 *
 * Displays a prompt message and waits for user input. Optionally validates
 * the input using a provided validation function.
 *
 * @param message - Prompt message to display
 * @param options - Optional configuration
 * @returns Promise resolving to user input string, or null if non-interactive
 *
 * @example
 * ```ts
 * const name = await promptText('Enter your name:');
 * const email = await promptText('Enter email:', {
 *   validate: (input) => input.includes('@') || 'Invalid email format'
 * });
 * ```
 */
export async function promptText(
  message: string,
  options: {
    defaultValue?: string;
    validate?: (input: string) => true | string;
    allowEmpty?: boolean;
  } = {},
): Promise<string | null> {
  // Check if interactive
  if (!isInteractive()) {
    return options.defaultValue ?? null;
  }

  const { defaultValue, validate, allowEmpty = false } = options;

  while (true) {
    // Display prompt
    const defaultIndicator = defaultValue ? ` [${defaultValue}]` : '';
    const prompt = `${message}${defaultIndicator}: `;
    await Deno.stderr.write(new TextEncoder().encode(prompt));

    // Read user input
    const buf = new Uint8Array(1024);
    const n = await Deno.stdin.read(buf);

    if (n === null) {
      // EOF or error, return default or null
      return defaultValue ?? null;
    }

    // Parse input
    const input = new TextDecoder().decode(buf.subarray(0, n)).trim();

    // Use default if empty and default exists
    if (input === '' && defaultValue !== undefined) {
      return defaultValue;
    }

    // Check if empty is allowed
    if (input === '' && !allowEmpty) {
      await Deno.stderr.write(new TextEncoder().encode('Input cannot be empty\n'));
      continue;
    }

    // Validate input if validator provided
    if (validate) {
      const validationResult = validate(input);
      if (validationResult !== true) {
        await Deno.stderr.write(new TextEncoder().encode(`${validationResult}\n`));
        continue;
      }
    }

    return input;
  }
}

/**
 * Prompts user to select from a list of options.
 *
 * Displays numbered options and waits for user to enter a number or option text.
 * Supports both numeric selection (1-based) and text matching.
 *
 * @param message - Prompt message to display
 * @param options - Array of options to choose from
 * @param config - Optional configuration
 * @returns Promise resolving to selected option, or null if non-interactive
 *
 * @example
 * ```ts
 * const language = await promptSelect(
 *   'Choose a language:',
 *   ['typescript', 'python', 'java'],
 *   { defaultValue: 'typescript' }
 * );
 * ```
 */
export async function promptSelect<T extends string>(
  message: string,
  options: T[],
  config: {
    defaultValue?: T | undefined;
  } = {},
): Promise<T | null> {
  // Check if interactive
  if (!isInteractive()) {
    return config.defaultValue ?? null;
  }

  const { defaultValue } = config;

  // Display message and options
  await Deno.stderr.write(new TextEncoder().encode(`${message}\n`));
  for (let i = 0; i < options.length; i++) {
    const isDefault = options[i] === defaultValue;
    const marker = isDefault ? ' (default)' : '';
    await Deno.stderr.write(
      new TextEncoder().encode(`  ${i + 1}. ${options[i]}${marker}\n`),
    );
  }

  while (true) {
    // Prompt for selection
    const defaultIndicator = defaultValue ? ` [${defaultValue}]` : '';
    const prompt = `Enter number or name${defaultIndicator}: `;
    await Deno.stderr.write(new TextEncoder().encode(prompt));

    // Read user input
    const buf = new Uint8Array(1024);
    const n = await Deno.stdin.read(buf);

    if (n === null) {
      // EOF or error, return default or null
      return defaultValue ?? null;
    }

    // Parse input
    const input = new TextDecoder().decode(buf.subarray(0, n)).trim();

    // Use default if empty and default exists
    if (input === '' && defaultValue !== undefined) {
      return defaultValue;
    }

    // Try to parse as number (1-based)
    const numChoice = parseInt(input, 10);
    if (!isNaN(numChoice) && numChoice >= 1 && numChoice <= options.length) {
      return options[numChoice - 1];
    }

    // Try to match as option text (case-insensitive)
    const matchedOption = options.find(
      (opt) => opt.toLowerCase() === input.toLowerCase(),
    );
    if (matchedOption) {
      return matchedOption;
    }

    // Invalid input
    await Deno.stderr.write(
      new TextEncoder().encode(
        `Invalid selection. Enter a number (1-${options.length}) or option name.\n`,
      ),
    );
  }
}

/**
 * Prompts user for yes/no confirmation.
 *
 * This is an alias for confirmAction in shared.ts for consistency.
 * Accepts 'y', 'yes', 'Y', 'YES' for confirmation.
 * Accepts 'n', 'no', 'N', 'NO' for rejection.
 *
 * @param message - Confirmation message to display
 * @param defaultValue - Default value if user just presses Enter
 * @returns Promise resolving to true if confirmed, false otherwise
 *
 * @example
 * ```ts
 * const confirmed = await promptConfirm('Overwrite existing files?');
 * if (confirmed) {
 *   // Proceed with overwrite
 * }
 * ```
 */
export async function promptConfirm(
  message: string,
  defaultValue = false,
): Promise<boolean> {
  // Check if interactive
  if (!isInteractive()) {
    return defaultValue;
  }

  // Format prompt with default indicator
  const defaultIndicator = defaultValue ? '[Y/n]' : '[y/N]';
  const prompt = `${message} ${defaultIndicator}: `;

  // Write prompt to stderr (for user interaction)
  await Deno.stderr.write(new TextEncoder().encode(prompt));

  // Read user input from stdin
  const buf = new Uint8Array(1024);
  const n = await Deno.stdin.read(buf);

  if (n === null) {
    // EOF or error, return default
    return defaultValue;
  }

  // Parse input
  const input = new TextDecoder().decode(buf.subarray(0, n)).trim().toLowerCase();

  // Empty input means use default
  if (input === '') {
    return defaultValue;
  }

  // Check for positive confirmation
  if (input === 'y' || input === 'yes') {
    return true;
  }

  // Check for negative confirmation
  if (input === 'n' || input === 'no') {
    return false;
  }

  // Any other input is treated as negative
  return false;
}

/**
 * Prompts user to select a difficulty level.
 *
 * Specialized prompt for selecting problem difficulty.
 * Displays difficulty options with descriptions.
 *
 * @param defaultValue - Default difficulty if user just presses Enter
 * @returns Promise resolving to selected difficulty, or null if non-interactive
 *
 * @example
 * ```ts
 * const difficulty = await promptDifficulty('medium');
 * console.log(`Selected difficulty: ${difficulty}`);
 * ```
 */
export async function promptDifficulty(
  defaultValue?: Difficulty,
): Promise<Difficulty | null> {
  const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];

  return await promptSelect<Difficulty>(
    'Select difficulty level:',
    difficulties,
    defaultValue !== undefined ? { defaultValue } : {},
  );
}

/**
 * Prompts user to select a programming language.
 *
 * Specialized prompt for selecting programming language.
 * Displays available language options.
 *
 * @param defaultValue - Default language if user just presses Enter
 * @returns Promise resolving to selected language, or null if non-interactive
 *
 * @example
 * ```ts
 * const language = await promptLanguage('typescript');
 * console.log(`Selected language: ${language}`);
 * ```
 */
export async function promptLanguage(
  defaultValue?: SupportedLanguage,
): Promise<SupportedLanguage | null> {
  const languages: SupportedLanguage[] = [
    'typescript',
    'javascript',
    'python',
    'java',
    'cpp',
    'rust',
    'go',
  ];

  return await promptSelect<SupportedLanguage>(
    'Select programming language:',
    languages,
    defaultValue !== undefined ? { defaultValue } : {},
  );
}
