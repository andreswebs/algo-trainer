# Phase 3: CLI Interface & Commands - Task Breakdown

**Status:** In Progress
**Goal:** Create the modern CLI interface following 12-factor principles

## Overview

This document breaks down Phase 3 into small, reviewable tasks. Tasks are organized by dependency and parallelization opportunities.

### Current State Summary

| Component                                    | Status       | Notes                                            |
| -------------------------------------------- | ------------ | ------------------------------------------------ |
| CLI entry point (`src/cli/main.ts`)          | ✅ Done      | Argument parsing, global flags, command dispatch |
| Command registry (`src/cli/commands/mod.ts`) | ✅ Done      | Dispatch system, command list                    |
| Command stubs                                | ✅ Done      | All 5 commands have stub implementations         |
| Core PMS integration                         | ✅ Available | Phase 2 complete, `core/mod.ts` ready            |
| Integration guide                            | ✅ Done      | `phase3-integration-guide.md` available          |

### Commands to Implement

| Command     | File           | Description               | Complexity |
| ----------- | -------------- | ------------------------- | ---------- |
| `init`      | `init.ts`      | Initialize workspace      | Low        |
| `challenge` | `challenge.ts` | Start new problem         | Medium     |
| `complete`  | `complete.ts`  | Archive completed problem | Medium     |
| `hint`      | `hint.ts`      | Get progressive hints     | Low        |
| `config`    | `config.ts`    | Configuration management  | Medium     |
| `progress`  | _new_          | View progress stats       | Low        |
| `list`      | _new_          | Search/filter problems    | Low        |

---

## Task Dependency Graph

```
LAYER 0 (No dependencies - can start immediately):
├── CLI-001: Shared utilities and helpers
├── CLI-002: Exit codes standardization
└── CLI-003: Environment variable support

LAYER 1 (Depends on Layer 0):
├── CLI-010: init command
├── CLI-011: config command (get/set/list/reset)
└── CLI-012: list command

LAYER 2 (Depends on Layer 1):
├── CLI-020: challenge command
├── CLI-021: hint command
└── CLI-022: progress command

LAYER 3 (Depends on Layer 2):
├── CLI-030: complete command
└── CLI-031: Interactive prompts

LAYER 4 (Depends on all commands):
├── CLI-040: Per-command help system
├── CLI-041: Shell completions (bash)
├── CLI-042: Shell completions (zsh)
├── CLI-043: Shell completions (fish)

LAYER 5 (Testing - can run in parallel):
├── CLI-050: Unit tests for commands
├── CLI-051: Integration tests
└── CLI-052: E2E workflow tests
```

---

## Layer 0: Foundation Tasks (Parallelizable)

These tasks have no dependencies and can all be worked on simultaneously.

### CLI-001: Shared Command Utilities

**Scope:** Create shared helper functions used across multiple commands.

**File:** `src/cli/commands/shared.ts` (new)

**Tasks:**

1. Create `requireWorkspace()` - validates workspace is initialized, returns structure
2. Create `requireProblemManager()` - initializes and returns ProblemManager instance
3. Create `resolveProblem(identifier)` - resolves problem by ID, slug, or current
4. Create `formatProblemSummary(problem)` - consistent problem display formatting
5. Create `confirmAction(message)` - simple y/n confirmation prompt

**Acceptance Criteria:**

- All helpers have JSDoc documentation
- Error handling uses typed errors from `utils/errors.ts`
- Unit tests for each helper function

**Estimated Size:** ~150 lines

---

### CLI-002: Exit Codes Standardization

**Scope:** Define and document standard exit codes for the CLI.

**Files:**

- `src/cli/exit-codes.ts` (new)
- Update `src/cli/commands/mod.ts`

**Tasks:**

1. Define exit code constants (0=success, 1=general, 2=usage, 3=config, etc.)
2. Create `ExitCode` enum with documentation
3. Create `exitWithCode(code, message?)` helper
4. Document exit codes in help output

**Exit Codes to Define:**

```typescript
export const ExitCode = {
  SUCCESS: 0, // Command completed successfully
  GENERAL_ERROR: 1, // General/unexpected error
  USAGE_ERROR: 2, // Invalid arguments/usage
  CONFIG_ERROR: 3, // Configuration issues
  WORKSPACE_ERROR: 4, // Workspace not initialized/invalid
  PROBLEM_ERROR: 5, // Problem not found/invalid
  NETWORK_ERROR: 6, // Network/API errors
  PERMISSION_ERROR: 7, // File/permission errors
} as const;
```

**Estimated Size:** ~50 lines

---

### CLI-003: Environment Variable Support

**Scope:** Add environment variable configuration for all settings.

**Files:**

- `src/cli/env.ts` (new)
- Update `src/config/manager.ts`

**Tasks:**

1. Define `AT_*` environment variable names
2. Create `loadEnvConfig()` function
3. Integrate env vars into config loading (env > config file > defaults)
4. Document all environment variables

**Environment Variables:**

```
AT_WORKSPACE      - Workspace directory path
AT_LANGUAGE       - Default language (typescript, python, etc.)
AT_VERBOSE        - Enable verbose output (1/0)
AT_QUIET          - Enable quiet mode (1/0)
AT_NO_COLOR       - Disable colors (1/0)
AT_NO_EMOJI       - Disable emoji (1/0)
AT_CONFIG_PATH    - Custom config file path
AT_TEMPLATE_STYLE - Template style (minimal, documented, complete)
```

**Acceptance Criteria:**

- All env vars documented in help output
- Env vars take precedence over config file
- Unit tests verify precedence

**Estimated Size:** ~100 lines

---

## Layer 1: Core Commands (Parallelizable after Layer 0)

These commands can be implemented in parallel once Layer 0 is complete.

### CLI-010: Init Command Implementation

**Scope:** Full implementation of workspace initialization.

**File:** `src/cli/commands/init.ts`

**Tasks:**

1. Parse arguments: `at init [path] [--force]`
2. Resolve workspace path (arg > config > cwd)
3. Check if already initialized (prompt to overwrite if `--force`)
4. Call `initWorkspace()` from core module
5. Display created directory structure
6. Update config with new workspace path

**Usage:**

```
at init [path]        Initialize workspace at path (default: current directory)
  --force, -f         Reinitialize existing workspace
```

**Acceptance Criteria:**

- Creates all workspace directories
- Shows success message with structure
- Updates config file with workspace path
- Handles existing workspace gracefully

**Estimated Size:** ~80 lines

---

### CLI-011: Config Command Implementation

**Scope:** Full implementation of configuration management.

**File:** `src/cli/commands/config.ts`

**Subcommands:**

1. `at config list` - Show all config values
2. `at config get <key>` - Get specific value
3. `at config set <key> <value>` - Set value
4. `at config reset [key]` - Reset to defaults

**Tasks:**

1. Implement `configList()` - display table of all settings
2. Implement `configGet(key)` - get single value (dot notation support)
3. Implement `configSet(key, value)` - set value with validation
4. Implement `configReset(key?)` - reset one or all settings
5. Add `--json` flag for machine-readable output
6. Validate keys and values before setting

**Usage:**

```
at config list              List all configuration values
at config get <key>         Get a configuration value
at config set <key> <value> Set a configuration value
at config reset [key]       Reset configuration to defaults

Options:
  --json                    Output in JSON format
```

**Acceptance Criteria:**

- All subcommands work correctly
- Invalid keys show error with valid key list
- Invalid values show error with allowed values
- JSON output mode for scripting

**Estimated Size:** ~150 lines

---

### CLI-012: List Command Implementation

**Scope:** New command to search and filter problems.

**File:** `src/cli/commands/list.ts` (new)

**Tasks:**

1. Create new command file
2. Register in `mod.ts`
3. Parse filter arguments
4. Display results in table format
5. Support different output formats

**Usage:**

```
at list [options]           List available problems

Options:
  --difficulty, -d <level>  Filter by difficulty (easy, medium, hard)
  --category, -c <cat>      Filter by category (arrays, strings, etc.)
  --search, -s <text>       Search in title/description
  --limit, -l <n>           Limit results (default: 20)
  --json                    Output in JSON format
  --verbose                 Show full descriptions
```

**Acceptance Criteria:**

- Displays problems in formatted table
- All filters work correctly
- Pagination with --limit
- JSON output for scripting

**Estimated Size:** ~120 lines

---

## Layer 2: Problem Interaction Commands (After Layer 1)

### CLI-020: Challenge Command Implementation

**Scope:** Full implementation of starting a new challenge.

**File:** `src/cli/commands/challenge.ts`

**Tasks:**

1. Parse arguments: difficulty, topic, slug, random flags
2. Validate workspace is initialized
3. Get problem (by slug, or random with filters)
4. Check if problem already exists in workspace
5. Generate problem files using `generateProblemFiles()`
6. Display problem summary and file locations
7. Handle `--force` to overwrite existing files

**Usage:**

```
at challenge [difficulty]   Start a random challenge at difficulty level
at challenge <slug>         Start specific problem by slug
at challenge --random       Start random problem (any difficulty)

Options:
  --difficulty, -d <level>  easy, medium, or hard
  --category, -c <cat>      Problem category filter
  --topic, -t <topic>       Problem topic filter
  --language, -l <lang>     Override default language
  --force, -f               Overwrite existing files
```

**Acceptance Criteria:**

- Generates all problem files (solution, test, README)
- Shows problem summary after generation
- Handles existing files gracefully
- Works with random selection and specific slug

**Estimated Size:** ~180 lines

---

### CLI-021: Hint Command Implementation

**Scope:** Full implementation of progressive hint system.

**File:** `src/cli/commands/hint.ts`

**Tasks:**

1. Parse arguments: problem slug, hint level
2. Resolve current problem (from args or detect from workspace)
3. Get problem from ProblemManager
4. Display hint at requested level (progressive disclosure)
5. Track hint usage in workspace metadata

**Usage:**

```
at hint [slug]             Get next hint for problem
at hint --level <n>        Get specific hint level (1-3)
at hint --all              Show all hints

Options:
  --level, -l <n>          Hint level (1=gentle, 2=moderate, 3=solution approach)
  --all, -a                Show all available hints
```

**Hint Levels:**

1. **Level 1:** General approach/pattern hint
2. **Level 2:** Specific algorithm/data structure hint
3. **Level 3:** Solution approach without code

**Acceptance Criteria:**

- Shows hints progressively by default
- Tracks which hints have been viewed
- Works with problem slug or current problem

**Estimated Size:** ~100 lines

---

### CLI-022: Progress Command Implementation

**Scope:** New command to view practice progress and statistics.

**File:** `src/cli/commands/progress.ts` (new)

**Tasks:**

1. Create new command file
2. Register in `mod.ts`
3. Scan workspace for completed/current problems
4. Calculate statistics (by difficulty, category, etc.)
5. Display progress table and charts

**Usage:**

```
at progress                Show overall progress summary
at progress --detailed     Show detailed breakdown
at progress --category     Group by category
at progress --json         Output in JSON format
```

**Statistics to Show:**

- Total problems completed vs available
- Completion by difficulty (easy/medium/hard)
- Completion by category
- Recent activity (last 7 days)
- Current streak

**Acceptance Criteria:**

- Shows accurate statistics
- Handles empty workspace
- Multiple display formats

**Estimated Size:** ~150 lines

---

## Layer 3: Completion & Interaction (After Layer 2)

### CLI-030: Complete Command Implementation

**Scope:** Full implementation of marking problems as completed.

**File:** `src/cli/commands/complete.ts`

**Tasks:**

1. Parse arguments: problem slug, notes
2. Validate problem exists in current workspace
3. Archive problem files to completed directory
4. Update problem metadata with completion info
5. Show completion summary and next suggestions

**Usage:**

```
at complete <slug>         Mark problem as completed
at complete                Mark current problem as completed

Options:
  --notes, -n <text>       Add completion notes
  --no-archive             Keep files in current (don't move)
```

**Acceptance Criteria:**

- Moves files to completed directory
- Preserves problem metadata
- Shows completion confirmation
- Suggests next problems

**Estimated Size:** ~120 lines

---

### CLI-031: Interactive Prompts System

**Scope:** Add interactive prompts for missing required inputs.

**File:** `src/cli/prompts.ts` (new)

**Tasks:**

1. Create prompt utilities using Deno's stdin
2. Implement `promptText(message)` - text input
3. Implement `promptSelect(message, options)` - selection from list
4. Implement `promptConfirm(message)` - yes/no
5. Implement `promptDifficulty()` - difficulty selection
6. Implement `promptLanguage()` - language selection
7. Integrate prompts into commands when args missing

**Usage in Commands:**

```typescript
// In challenge command, if no difficulty specified:
const difficulty = args.difficulty || await promptDifficulty();
```

**Acceptance Criteria:**

- Works in interactive terminal
- Gracefully handles non-interactive mode (CI)
- Clear, consistent prompt styling

**Estimated Size:** ~150 lines

---

## Layer 4: Polish & Shell Integration (After All Commands)

### CLI-040: Per-Command Help System

**Scope:** Add detailed help for each command.

**Files:**

- Update each command file
- Update `src/cli/main.ts`

**Tasks:**

1. Add `showHelp()` function to each command
2. Include usage, options, and examples
3. Handle `at <command> --help`
4. Consistent formatting across all commands

**Help Format:**

```
at challenge - Start a new coding challenge

USAGE:
    at challenge [difficulty]
    at challenge <slug>
    at challenge --random

OPTIONS:
    -d, --difficulty <level>  Filter by difficulty (easy, medium, hard)
    -c, --category <cat>      Filter by category
    -l, --language <lang>     Override default language
    -f, --force               Overwrite existing files
    -h, --help                Show this help message

EXAMPLES:
    at challenge easy         Start an easy random challenge
    at challenge two-sum      Start the 'two-sum' problem
    at challenge -d medium    Start a medium difficulty challenge
```

**Acceptance Criteria:**

- Every command has detailed help
- Examples are practical and accurate
- Consistent formatting

**Estimated Size:** ~30 lines per command (~150 total)

---

### CLI-041: Bash Shell Completions

**Scope:** Generate bash completion script.

**File:** `completions/at.bash` (new)

**Tasks:**

1. Create completion script structure
2. Add completions for commands
3. Add completions for flags
4. Add dynamic completions (problem slugs, languages)
5. Document installation in README

**Completion Features:**

- Command names: `challenge`, `complete`, `config`, etc.
- Flags: `--difficulty`, `--language`, `--force`, etc.
- Dynamic: problem slugs from workspace

**Estimated Size:** ~100 lines

---

### CLI-042: Zsh Shell Completions

**Scope:** Generate zsh completion script.

**File:** `completions/at.zsh` (new)

**Tasks:**

1. Create `_at` completion function
2. Add command completions with descriptions
3. Add flag completions
4. Add dynamic completions
5. Document installation

**Estimated Size:** ~120 lines

---

### CLI-043: Fish Shell Completions

**Scope:** Generate fish completion script.

**File:** `completions/at.fish` (new)

**Tasks:**

1. Create fish completions
2. Add command completions
3. Add flag completions
4. Document installation

**Estimated Size:** ~80 lines

---

## Layer 5: Testing (Parallelizable)

### CLI-050: Unit Tests for Commands

**Scope:** Unit tests for all command implementations.

**File:** `tests/cli/commands_test.ts` (new)

**Tasks per command:**

1. Test argument parsing
2. Test validation logic
3. Test error cases
4. Test output formatting
5. Mock PMS functions

**Test Cases (per command):**

- Valid arguments produce correct output
- Invalid arguments produce correct errors
- Missing required args handled
- Edge cases (empty workspace, etc.)

**Estimated Size:** ~50-80 lines per command (~400 total)

---

### CLI-051: Integration Tests

**Scope:** Test command interactions with real filesystem.

**File:** `tests/cli/integration_test.ts` (new)

**Tasks:**

1. Set up temp directory for each test
2. Test `init` creates correct structure
3. Test `challenge` generates files
4. Test `complete` moves files correctly
5. Test `config` persists changes
6. Clean up after tests

**Estimated Size:** ~200 lines

---

### CLI-052: E2E Workflow Tests

**Scope:** Test complete user workflows.

**File:** `tests/cli/e2e_test.ts` (new)

**Workflows to Test:**

1. Fresh start: `init` -> `challenge` -> `complete`
2. Configuration: `config set` -> verify in `challenge`
3. Progress tracking: Complete multiple -> `progress`
4. Error recovery: Invalid states, missing files

**Estimated Size:** ~150 lines

---

## Parallelization Strategy

### Wave 1 (Days 1-2)

Start these tasks simultaneously:

- CLI-001: Shared utilities
- CLI-002: Exit codes
- CLI-003: Environment variables

### Wave 2 (Days 2-4)

Once Wave 1 is complete, start:

- CLI-010: init command
- CLI-011: config command
- CLI-012: list command

### Wave 3 (Days 4-6)

Once Wave 2 is complete:

- CLI-020: challenge command
- CLI-021: hint command
- CLI-022: progress command

### Wave 4 (Days 6-7)

Final commands:

- CLI-030: complete command
- CLI-031: Interactive prompts

### Wave 5 (Days 7-9)

Polish and shell integration:

- CLI-040: Per-command help
- CLI-041, 042, 043: Shell completions (parallel)

### Wave 6 (Throughout)

Testing can run in parallel with implementation:

- CLI-050: Unit tests (write alongside commands)
- CLI-051, 052: Integration/E2E tests (after commands done)

---

## Task Checklist

### Foundation

- [x] CLI-001: Shared command utilities
- [x] CLI-002: Exit codes standardization
- [x] CLI-003: Environment variable support

### Core Commands

- [x] CLI-010: init command
- [x] CLI-011: config command
- [x] CLI-012: list command

### Problem Commands

- [ ] CLI-020: challenge command
- [ ] CLI-021: hint command
- [ ] CLI-022: progress command

### Completion & UX

- [ ] CLI-030: complete command
- [ ] CLI-031: Interactive prompts

### Polish

- [ ] CLI-040: Per-command help system
- [ ] CLI-041: Bash completions
- [ ] CLI-042: Zsh completions
- [ ] CLI-043: Fish completions

### Testing

- [ ] CLI-050: Unit tests
- [ ] CLI-051: Integration tests
- [ ] CLI-052: E2E tests

---

## Notes for Implementers

### Import Pattern

Always use the single import point for PMS functionality:

```typescript
import {
  generateProblemFiles,
  initWorkspace,
  ProblemManager,
  // ... other functions
} from '../../core/mod.ts';
```

### Error Handling

Use typed errors and proper exit codes:

```typescript
import { ProblemError, WorkspaceError } from '../../utils/errors.ts';
import { ExitCode } from '../exit-codes.ts';

try {
  // operation
} catch (error) {
  if (error instanceof WorkspaceError) {
    return { success: false, exitCode: ExitCode.WORKSPACE_ERROR, error: error.message };
  }
  throw error;
}
```

### Output Conventions

- Use `logSuccess()`, `logError()`, `logInfo()` from `utils/output.ts`
- Use `outputData()` only for machine-readable output (JSON mode)
- Respect `--quiet` and `--verbose` flags

### Testing Commands Locally

```bash
# Run in dev mode
deno task dev -- challenge easy

# Run specific command
deno run --allow-all src/cli/main.ts config list
```

---

## Estimated Total Effort

| Category         | Tasks  | Lines      | Hours     |
| ---------------- | ------ | ---------- | --------- |
| Foundation       | 3      | ~300       | 3-4       |
| Core Commands    | 3      | ~350       | 4-5       |
| Problem Commands | 3      | ~430       | 5-6       |
| Completion & UX  | 2      | ~270       | 3-4       |
| Polish           | 4      | ~450       | 4-5       |
| Testing          | 3      | ~750       | 6-8       |
| **Total**        | **18** | **~2,550** | **25-32** |

This aligns with the Phase 3 estimate of 15-20 hours (reduced due to Phase 1 foundations), with additional buffer for testing.
