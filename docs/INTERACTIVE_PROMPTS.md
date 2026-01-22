# Interactive Prompts

The CLI now supports interactive prompts for missing required arguments. This improves the user experience by guiding users through the process instead of requiring them to remember all command options.

## Features

### Automatic Detection

The CLI automatically detects whether it's running in an interactive terminal or a non-interactive environment (CI, pipelines, etc.). In non-interactive environments, default values are used automatically.

### Smart Prompts

When required arguments are missing, the CLI will prompt for them interactively:

- **Text Input**: For notes, descriptions, and custom values
- **Selection**: For choosing from predefined options (difficulty, language, problems)
- **Confirmation**: For yes/no decisions

## Supported Commands

### Challenge Command

When starting a new challenge without specifying all options:

```bash
# Without arguments - prompts for difficulty and language
algo-trainer challenge

# Partial arguments - only prompts for missing values
algo-trainer challenge easy
```

**Prompts:**

- Difficulty level (easy, medium, hard) - if not provided
- Programming language - if not in config or command line

### Complete Command

When marking a problem as complete:

```bash
# Without arguments - prompts for problem selection
algo-trainer complete

# Single problem auto-selected
algo-trainer complete
```

**Prompts:**

- Problem selection - from available problems in workspace
- Completion notes - optional text input

## Non-Interactive Mode

In CI/CD pipelines or when stdin is not a TTY, the CLI:

- Uses default values for all prompts
- Never blocks waiting for user input
- Returns `null` for prompts without defaults

This ensures your automation scripts work reliably.

## Examples

### Interactive Challenge Start

```bash
$ algo-trainer challenge
Select difficulty level:
  1. easy
  2. medium (default)
  3. hard
Enter number or name [medium]: 1
Selected difficulty: easy

Select programming language:
  1. typescript (default)
  2. javascript
  3. python
  4. java
  5. cpp
  6. rust
  7. go
Enter number or name [typescript]: 3
Selected language: python

✅ Started challenge: Two Sum
```

### Interactive Problem Completion

```bash
$ algo-trainer complete
Select problem to complete:
  1. two-sum
  2. add-two-numbers
  3. longest-substring
Enter number or name: 1

Add completion notes (optional): Grealgo-trainer problem for hash tables!

✅ Completed and archived: two-sum
Files moved to: /workspace/completed/two-sum
```

## Implementation Details

### API Reference

All prompt functions are available from `src/cli/prompts.ts`:

```typescript
import {
  isInteractive,
  promptConfirm,
  promptDifficulty,
  promptLanguage,
  promptSelect,
  promptText,
} from './cli/prompts.ts';

// Check if terminal is interactive
if (isInteractive()) {
  const name = await promptText('Enter your name:');
}

// Select from options
const language = await promptSelect(
  'Choose language:',
  ['typescript', 'python', 'java'],
  { defaultValue: 'typescript' },
);

// Yes/no confirmation
const confirmed = await promptConfirm('Continue?', false);

// Specialized prompts
const difficulty = await promptDifficulty('medium');
const lang = await promptLanguage('typescript');
```

### Integration Pattern

Commands follow this pattern for integrating prompts:

1. Parse command-line arguments
2. Check if required values are missing
3. Prompt for missing values if interactive
4. Use defaults in non-interactive mode
5. Validate all values
6. Execute command

This ensures a consistent user experience across all commands.
