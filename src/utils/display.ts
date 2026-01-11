/**
 * Display utilities for enhanced CLI output
 *
 * Provides colors, tables, and other visual enhancements for the CLI.
 *
 * @module utils/display
 */

import { getOutputOptions } from './output.ts';

/**
 * ANSI color codes
 */
export const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  underline: '\x1b[4m',

  // Foreground colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',

  // Background colors
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
} as const;

/**
 * Apply color to text if colors are enabled
 */
export function colorize(
  text: string,
  color: keyof typeof COLORS | string,
): string {
  const options = getOutputOptions();
  if (!options.useColors) {
    return text;
  }

  const colorCode = COLORS[color as keyof typeof COLORS] || color;
  return `${colorCode}${text}${COLORS.reset}`;
}

/**
 * Create styled text with multiple attributes
 */
export function styled(text: string, styles: (keyof typeof COLORS)[]): string {
  const options = getOutputOptions();
  if (!options.useColors) {
    return text;
  }

  const prefix = styles.map((style) => COLORS[style]).join('');
  return `${prefix}${text}${COLORS.reset}`;
}

/**
 * Table column configuration
 */
export interface TableColumn {
  /** Column header */
  header: string;
  /** Column key in data object */
  key: string;
  /** Column width (optional) */
  width?: number;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Custom formatter function */
  formatter?: (value: unknown) => string;
}

/**
 * Table configuration
 */
export interface TableConfig {
  /** Columns configuration */
  columns: TableColumn[];
  /** Whether to show borders */
  showBorders?: boolean;
  /** Whether to show header */
  showHeader?: boolean;
  /** Maximum table width */
  maxWidth?: number;
}

/**
 * Create a formatted table
 */
export function createTable(
  data: Record<string, unknown>[],
  config: TableConfig,
): string {
  if (data.length === 0) {
    return '';
  }

  const { columns, showBorders = true, showHeader = true } = config;

  // Calculate column widths
  const widths: number[] = columns.map((col) => {
    const headerWidth = col.header.length;
    const dataWidth = Math.max(
      ...data.map((row) => {
        const value = col.formatter ? col.formatter(row[col.key]) : String(row[col.key] ?? '');
        return value.length;
      }),
    );
    return col.width || Math.max(headerWidth, dataWidth);
  });

  const lines: string[] = [];

  // Helper function to create a row
  const createRow = (cells: string[], isHeader = false): string => {
    const paddedCells = cells.map((cell, i) => {
      const width = widths[i];
      const align = columns[i].align || 'left';

      let padded: string;
      switch (align) {
        case 'center': {
          const leftPad = Math.floor((width - cell.length) / 2);
          const rightPad = width - cell.length - leftPad;
          padded = ' '.repeat(leftPad) + cell + ' '.repeat(rightPad);
          break;
        }
        case 'right':
          padded = cell.padStart(width);
          break;
        default: // left
          padded = cell.padEnd(width);
      }

      if (isHeader && getOutputOptions().useColors) {
        return styled(padded, ['bold']);
      }
      return padded;
    });

    if (showBorders) {
      return `│ ${paddedCells.join(' │ ')} │`;
    }
    return paddedCells.join('  ');
  };

  // Create border line
  const createBorder = (type: 'top' | 'middle' | 'bottom'): string => {
    if (!showBorders) return '';

    const chars = {
      top: { left: '┌', mid: '┬', right: '┐', fill: '─' },
      middle: { left: '├', mid: '┼', right: '┤', fill: '─' },
      bottom: { left: '└', mid: '┴', right: '┘', fill: '─' },
    };

    const char = chars[type];
    const segments = widths.map((width) => char.fill.repeat(width + 2));
    return `${char.left}${segments.join(char.mid)}${char.right}`;
  };

  // Add top border
  if (showBorders) {
    lines.push(createBorder('top'));
  }

  // Add header
  if (showHeader) {
    const headerCells = columns.map((col) => col.header);
    lines.push(createRow(headerCells, true));

    if (showBorders) {
      lines.push(createBorder('middle'));
    }
  }

  // Add data rows
  for (const row of data) {
    const cells = columns.map((col) => {
      const value = col.formatter ? col.formatter(row[col.key]) : String(row[col.key] ?? '');
      return value;
    });
    lines.push(createRow(cells));
  }

  // Add bottom border
  if (showBorders) {
    lines.push(createBorder('bottom'));
  }

  return lines.join('\n');
}

/**
 * Create a simple box around text
 */
export function createBox(text: string, title?: string): string {
  const lines = text.split('\n');
  const maxLength = Math.max(...lines.map((line) => line.length));
  const width = Math.max(maxLength, title ? title.length + 2 : 0);

  const result: string[] = [];

  // Top border
  if (title) {
    const titlePadded = ` ${title} `;
    const leftPad = Math.floor((width - titlePadded.length) / 2);
    const rightPad = width - titlePadded.length - leftPad;
    result.push(
      `┌${'─'.repeat(leftPad)}${titlePadded}${'─'.repeat(rightPad)}┐`,
    );
  } else {
    result.push(`┌${'─'.repeat(width + 2)}┐`);
  }

  // Content lines
  for (const line of lines) {
    result.push(`│ ${line.padEnd(width)} │`);
  }

  // Bottom border
  result.push(`└${'─'.repeat(width + 2)}┘`);

  return result.join('\n');
}

/**
 * Create a progress bar
 */
export function createProgressBar(
  current: number,
  total: number,
  options: {
    width?: number;
    showPercentage?: boolean;
    showNumbers?: boolean;
    fillChar?: string;
    emptyChar?: string;
  } = {},
): string {
  const {
    width = 20,
    showPercentage = true,
    showNumbers = false,
    fillChar = '█',
    emptyChar = '░',
  } = options;

  const percentage = Math.min(100, Math.max(0, (current / total) * 100));
  const fillLength = Math.round((percentage / 100) * width);
  const emptyLength = width - fillLength;

  const bar = fillChar.repeat(fillLength) + emptyChar.repeat(emptyLength);
  const coloredBar = getOutputOptions().useColors ? colorize(bar, 'cyan') : bar;

  let result = `[${coloredBar}]`;

  if (showPercentage) {
    result += ` ${percentage.toFixed(1)}%`;
  }

  if (showNumbers) {
    result += ` (${current}/${total})`;
  }

  return result;
}

/**
 * Format bytes as human-readable string
 */
export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Format duration in milliseconds as human-readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }

  const minutes = seconds / 60;
  if (minutes < 60) {
    return `${minutes.toFixed(1)}m`;
  }

  const hours = minutes / 60;
  return `${hours.toFixed(1)}h`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(
  text: string,
  maxLength: number,
  suffix = '...',
): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Center text within a given width
 */
export function center(text: string, width: number): string {
  if (text.length >= width) {
    return text;
  }

  const leftPad = Math.floor((width - text.length) / 2);
  const rightPad = width - text.length - leftPad;
  return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
}
