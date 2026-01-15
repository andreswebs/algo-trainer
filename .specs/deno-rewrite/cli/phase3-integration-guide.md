# Phase 3 Integration Guide

**Target Audience**: Phase 3 CLI Command Implementers

This guide provides everything you need to integrate with the Problem Management System (PMS) when implementing CLI commands in Phase 3. No knowledge of internal PMS module structure is required.

## Table of Contents

- [Quick Reference](#quick-reference)
- [Single Import Point](#single-import-point)
- [Common Command Patterns](#common-command-patterns)
- [Error Handling](#error-handling)
- [Configuration Integration](#configuration-integration)
- [Best Practices](#best-practices)
- [API Reference](#api-reference)
- [Testing Guide](#testing-guide)

## Quick Reference

### Basic Import Pattern

```typescript
// Single import for all PMS functionality
import {
  archiveProblem,
  generateProblemFiles,
  getWorkspaceStructure,
  // Workspace Management
  initWorkspace,
  isWorkspaceInitialized,
  // Types
  type Problem,
  // Problem Management
  ProblemManager,
  type ProblemQuery,
  type WorkspaceStructure,
} from '../../core/mod.ts';
```

### Typical Command Structure

```typescript
import type { Args } from '@std/cli/parse-args';
import type { CommandResult } from '../../types/global.ts';
import { generateProblemFiles, ProblemManager } from '../../core/mod.ts';

export async function commandName(args: Args): Promise<CommandResult> {
  try {
    // 1. Initialize ProblemManager
    const manager = new ProblemManager();
    await manager.init();

    // 2. Perform operations
    const problem = manager.getBySlug('two-sum');

    // 3. Return success
    return { success: true, exitCode: 0 };
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return { success: false, exitCode: 1 };
  }
}
```

## Single Import Point

All PMS functionality is available through `src/core/mod.ts`. This single import point provides:

- **Problem Management**: Full `ProblemManager` API
- **Workspace Management**: Initialize, generate, archive operations
- **Type Definitions**: All necessary types from `types/global.ts`
- **Comprehensive Documentation**: JSDoc with examples for every export

### What You Get

```typescript
import {
  type ArchiveOptions, // Archive operation options
  archiveProblem, // Archive completed problem
  type Difficulty, // Problem difficulty
  type GenerateOptions, // File generation options
  generateProblemFiles, // Generate problem files
  getProblemMetadata, // Get problem metadata
  getWorkspaceStructure, // Get workspace paths
  // === WORKSPACE MANAGEMENT ===
  initWorkspace, // Initialize workspace directory
  isWorkspaceInitialized, // Check if workspace exists
  // === TYPES ===
  type Problem, // Core problem type
  type ProblemCategory, // Problem categories
  problemExists, // Check if problem exists
  // === PROBLEM MANAGEMENT ===
  ProblemManager, // Main problem database manager
  type ProblemQuery, // Query/filter interface
  type SupportedLanguage, // Available languages
  unarchiveProblem, // Restore archived problem
  validateProblem, // Validate problem format
  validateWorkspace, // Validate workspace structure
  type WorkspaceStructure, // Workspace directory paths
} from '../../core/mod.ts';
```

## Common Command Patterns

### 1. Challenge Command (Start New Problem)

```typescript
// src/cli/commands/challenge.ts
import type { Args } from '@std/cli/parse-args';
import type { CommandResult } from '../../types/global.ts';
import { configManager } from '../../config/manager.ts';
import {
  generateProblemFiles,
  initWorkspace,
  isWorkspaceInitialized,
  ProblemManager,
  type ProblemQuery,
} from '../../core/mod.ts';

export async function challengeCommand(args: Args): Promise<CommandResult> {
  try {
    const config = configManager.getConfig();

    // Initialize workspace if needed
    if (!await isWorkspaceInitialized(config.workspace.root)) {
      await initWorkspace(config.workspace.root);
    }

    // Initialize problem manager
    const manager = new ProblemManager();
    await manager.init();

    // Get problem (by slug, ID, or random)
    let problem;
    if (args.slug) {
      problem = manager.getBySlug(args.slug as string);
    } else if (args.id) {
      problem = manager.getById(args.id as number);
    } else {
      // Get random problem with optional filters
      const query: ProblemQuery = {
        difficulty: args.difficulty as any,
        category: args.category as any,
        isCustom: false,
      };
      problem = manager.getRandom(query);
    }

    if (!problem) {
      console.error('Problem not found');
      return { success: false, exitCode: 1 };
    }

    // Generate problem files
    await generateProblemFiles({
      problem,
      workspaceRoot: config.workspace.root,
      language: config.preferences.language,
      templateStyle: config.preferences.templateStyle,
      overwrite: !!args.force,
    });

    console.log(`Started challenge: ${problem.title}`);
    console.log(`Language: ${config.preferences.language}`);
    console.log(`Difficulty: ${problem.difficulty}`);

    return { success: true, exitCode: 0 };
  } catch (error) {
    console.error(`Error starting challenge: ${error.message}`);
    return { success: false, exitCode: 1 };
  }
}
```

### 2. List Command (Search/Filter Problems)

```typescript
// src/cli/commands/list.ts
import type { Args } from '@std/cli/parse-args';
import type { CommandResult } from '../../types/global.ts';
import { ProblemManager, type ProblemQuery } from '../../core/mod.ts';

export async function listCommand(args: Args): Promise<CommandResult> {
  try {
    const manager = new ProblemManager();
    await manager.init();

    // Build query from arguments
    const query: ProblemQuery = {};

    if (args.difficulty) query.difficulty = args.difficulty as any;
    if (args.category) query.category = args.category as any;
    if (args.status) query.status = args.status as any;
    if (args.custom !== undefined) query.isCustom = !!args.custom;

    // Search or list
    let problems;
    if (args.search) {
      problems = manager.search(args.search as string, query);
    } else {
      problems = manager.list(query);
    }

    // Display results
    if (problems.length === 0) {
      console.log('No problems found');
      return { success: true, exitCode: 0 };
    }

    // Format output
    console.log(`Found ${problems.length} problems:\\n`);
    for (const problem of problems) {
      console.log(
        `${problem.id.toString().padStart(4)} | ${problem.difficulty.padEnd(6)} | ${problem.title}`,
      );
      if (args.verbose) {
        console.log(`      ${problem.description.substring(0, 80)}...`);
        console.log(`      Category: ${problem.category.join(', ')}`);
        console.log('');
      }
    }

    return { success: true, exitCode: 0 };
  } catch (error) {
    console.error(`Error listing problems: ${error.message}`);
    return { success: false, exitCode: 1 };
  }
}
```

### 3. Init Command (Initialize Workspace)

```typescript
// src/cli/commands/init.ts
import type { Args } from '@std/cli/parse-args';
import type { CommandResult } from '../../types/global.ts';
import { configManager } from '../../config/manager.ts';
import { getWorkspaceStructure, initWorkspace, isWorkspaceInitialized } from '../../core/mod.ts';

export async function initCommand(args: Args): Promise<CommandResult> {
  try {
    const config = configManager.getConfig();
    const workspaceRoot = (args.path as string) || config.workspace.root;

    // Check if already initialized
    if (await isWorkspaceInitialized(workspaceRoot)) {
      if (!args.force) {
        console.log(`Workspace already initialized at: ${workspaceRoot}`);
        return { success: true, exitCode: 0 };
      }
    }

    // Initialize workspace
    await initWorkspace(workspaceRoot);

    // Get structure for display
    const structure = getWorkspaceStructure(workspaceRoot);

    console.log(`Workspace initialized at: ${workspaceRoot}`);
    console.log('\\nDirectory structure:');
    console.log(`  ${structure.current}/     - Current challenges`);
    console.log(`  ${structure.completed}/   - Completed problems`);
    console.log(`  ${structure.templates}/   - Code templates`);
    console.log(`  ${structure.config}/      - Workspace config`);

    return { success: true, exitCode: 0 };
  } catch (error) {
    console.error(`Error initializing workspace: ${error.message}`);
    return { success: false, exitCode: 1 };
  }
}
```

### 4. Complete Command (Archive Problem)

```typescript
// src/cli/commands/complete.ts
import type { Args } from '@std/cli/parse-args';
import type { CommandResult } from '../../types/global.ts';
import { configManager } from '../../config/manager.ts';
import {
  archiveProblem,
  getProblemMetadata,
  problemExists,
  ProblemManager,
} from '../../core/mod.ts';

export async function completeCommand(args: Args): Promise<CommandResult> {
  try {
    const config = configManager.getConfig();
    const problemSlug = args._[0] as string;

    if (!problemSlug) {
      console.error('Problem slug is required');
      return { success: false, exitCode: 1 };
    }

    // Check if problem exists in current workspace
    const exists = await problemExists(
      config.workspace.root,
      problemSlug,
      config.preferences.language,
    );

    if (!exists) {
      console.error(`Problem '${problemSlug}' not found in current workspace`);
      return { success: false, exitCode: 1 };
    }

    // Get problem metadata
    const manager = new ProblemManager();
    await manager.init();
    const problem = manager.getBySlug(problemSlug);

    if (!problem) {
      console.error(`Problem '${problemSlug}' not found in database`);
      return { success: false, exitCode: 1 };
    }

    // Archive the problem
    await archiveProblem({
      workspaceRoot: config.workspace.root,
      problemSlug,
      language: config.preferences.language,
      includeMetadata: true,
    });

    console.log(`Completed and archived: ${problem.title}`);
    console.log(`Files moved to: ${config.workspace.root}/completed/${problemSlug}`);

    return { success: true, exitCode: 0 };
  } catch (error) {
    console.error(`Error completing problem: ${error.message}`);
    return { success: false, exitCode: 1 };
  }
}
```

### 5. Info Command (Display Problem Details)

```typescript
// src/cli/commands/info.ts
import type { Args } from '@std/cli/parse-args';
import type { CommandResult } from '../../types/global.ts';
import { ProblemManager } from '../../core/mod.ts';

export async function infoCommand(args: Args): Promise<CommandResult> {
  try {
    const manager = new ProblemManager();
    await manager.init();

    const identifier = args._[0] as string;
    if (!identifier) {
      console.error('Problem ID or slug is required');
      return { success: false, exitCode: 1 };
    }

    // Try to find problem by ID or slug
    let problem;
    if (/^\\d+$/.test(identifier)) {
      problem = manager.getById(parseInt(identifier));
    } else {
      problem = manager.getBySlug(identifier);
    }

    if (!problem) {
      console.error(`Problem '${identifier}' not found`);
      return { success: false, exitCode: 1 };
    }

    // Display problem information
    console.log(`\\n=== ${problem.title} ===`);
    console.log(`ID: ${problem.id}`);
    console.log(`Slug: ${problem.slug}`);
    console.log(`Difficulty: ${problem.difficulty}`);
    console.log(`Categories: ${problem.category.join(', ')}`);

    if (problem.topics) {
      console.log(`Topics: ${problem.topics.join(', ')}`);
    }

    console.log(`\\nDescription:`);
    console.log(problem.description);

    if (problem.examples && problem.examples.length > 0) {
      console.log('\\nExamples:');
      problem.examples.forEach((example, i) => {
        console.log(`\\nExample ${i + 1}:`);
        console.log(`Input: ${example.input}`);
        console.log(`Output: ${example.output}`);
        if (example.explanation) {
          console.log(`Explanation: ${example.explanation}`);
        }
      });
    }

    if (problem.constraints && problem.constraints.length > 0) {
      console.log('\\nConstraints:');
      problem.constraints.forEach((constraint) => {
        console.log(`- ${constraint}`);
      });
    }

    return { success: true, exitCode: 0 };
  } catch (error) {
    console.error(`Error getting problem info: ${error.message}`);
    return { success: false, exitCode: 1 };
  }
}
```

## Error Handling

### Typed Error Handling

The PMS provides specific error types that you can catch and handle appropriately:

```typescript
import { ProblemError, ValidationError, WorkspaceError } from '../../utils/errors.ts';

try {
  // PMS operations
} catch (error) {
  if (error instanceof ProblemError) {
    console.error(`Problem error: ${error.message}`);
    return { success: false, exitCode: 2 };
  } else if (error instanceof WorkspaceError) {
    console.error(`Workspace error: ${error.message}`);
    return { success: false, exitCode: 3 };
  } else if (error instanceof ValidationError) {
    console.error(`Validation error: ${error.message}`);
    return { success: false, exitCode: 4 };
  } else {
    console.error(`Unexpected error: ${error.message}`);
    return { success: false, exitCode: 1 };
  }
}
```

### Common Error Scenarios

1. **Problem Not Found**
   ```typescript
   const problem = manager.getBySlug('invalid-slug');
   if (!problem) {
     console.error('Problem not found');
     return { success: false, exitCode: 1 };
   }
   ```

2. **Workspace Not Initialized**
   ```typescript
   if (!await isWorkspaceInitialized(workspaceRoot)) {
     console.error('Workspace not initialized. Run "at init" first.');
     return { success: false, exitCode: 1 };
   }
   ```

3. **File Already Exists**
   ```typescript
   const exists = await problemExists(workspaceRoot, problemSlug, language);
   if (exists && !args.force) {
     console.error('Problem files already exist. Use --force to overwrite.');
     return { success: false, exitCode: 1 };
   }
   ```

## Configuration Integration

### Using ConfigManager

Always use the `ConfigManager` to get user preferences:

```typescript
import { configManager } from '../../config/manager.ts';

export async function someCommand(args: Args): Promise<CommandResult> {
  const config = configManager.getConfig();

  // Use configuration values
  const workspaceRoot = config.workspace.root;
  const language = config.preferences.language;
  const templateStyle = config.preferences.templateStyle;

  // Allow CLI args to override config
  const finalLanguage = (args.language as any) || language;

  // ... rest of command
}
```

### Configuration Properties

Available configuration properties:

```typescript
interface Config {
  preferences: {
    language: SupportedLanguage; // Default language
    templateStyle: 'minimal' | 'documented' | 'complete';
    difficulty: Difficulty[]; // Preferred difficulties
    autoArchive: boolean; // Auto-archive on completion
    showHints: boolean; // Show hints by default
  };
  workspace: {
    root: string; // Workspace directory
    organization: 'flat' | 'nested'; // File organization
  };
  ai: {
    enabled: boolean;
    model: string;
    apiKey?: string;
  };
  display: {
    colors: boolean;
    emoji: boolean;
    verbose: boolean;
  };
}
```

## Best Practices

### 1. Always Validate Input

```typescript
// Validate problem identifier
const identifier = args._[0] as string;
if (!identifier) {
  console.error('Problem ID or slug is required');
  return { success: false, exitCode: 1 };
}

// Validate numeric IDs
if (args.id !== undefined) {
  const id = parseInt(args.id as string);
  if (isNaN(id) || id <= 0) {
    console.error('Invalid problem ID');
    return { success: false, exitCode: 1 };
  }
}
```

### 2. Check Preconditions

```typescript
// Check workspace initialization
if (!await isWorkspaceInitialized(config.workspace.root)) {
  console.error('Workspace not initialized. Run "at init" first.');
  return { success: false, exitCode: 1 };
}

// Check problem existence
const problem = manager.getBySlug(problemSlug);
if (!problem) {
  console.error(`Problem '${problemSlug}' not found`);
  return { success: false, exitCode: 1 };
}
```

### 3. Use Proper Query Construction

```typescript
// Build queries incrementally
const query: ProblemQuery = {};

// Only add non-undefined values
if (args.difficulty) query.difficulty = args.difficulty as Difficulty;
if (args.category) query.category = args.category as ProblemCategory;
if (typeof args.custom === 'boolean') query.isCustom = args.custom;

// Use appropriate search vs list
let problems;
if (args.search) {
  problems = manager.search(args.search as string, query);
} else {
  problems = manager.list(query);
}
```

### 4. Provide Good User Feedback

```typescript
// Show progress for long operations
console.log(`Initializing workspace at: ${workspaceRoot}...`);
await initWorkspace(workspaceRoot);
console.log('✅ Workspace initialized');

// Show what was found
console.log(`Found ${problems.length} problems matching criteria`);

// Show next steps
console.log(`\\nFiles generated in: ${workspaceRoot}/current/${problemSlug}`);
console.log(`Edit: ${problemSlug}.${language}`);
console.log(`Tests: ${problemSlug}.test.${language}`);
```

### 5. Handle CLI Argument Overrides

```typescript
const config = configManager.getConfig();

// Allow CLI to override config
const language = (args.language as SupportedLanguage) || config.preferences.language;
const templateStyle = (args.template as any) || config.preferences.templateStyle;
const workspaceRoot = (args.workspace as string) || config.workspace.root;
```

## API Reference

### ProblemManager

```typescript
class ProblemManager {
  // Initialize the manager (loads problem database)
  async init(): Promise<void>;

  // Get problem by ID
  getById(id: number): Problem | undefined;

  // Get problem by slug
  getBySlug(slug: string): Problem | undefined;

  // List problems with optional filtering
  list(query?: ProblemQuery): Problem[];

  // Search problems by text
  search(searchText: string, query?: ProblemQuery): Problem[];

  // Get random problem
  getRandom(query?: ProblemQuery): Problem | undefined;

  // Add custom problem
  async add(problem: Problem): Promise<void>;

  // Update existing problem
  async update(id: number, patch: Partial<Problem>): Promise<void>;

  // Remove problem
  async remove(id: number): Promise<void>;
}
```

### Workspace Functions

```typescript
// Initialize workspace directory structure
function initWorkspace(workspaceRoot: string): Promise<void>;

// Get workspace directory paths
function getWorkspaceStructure(workspaceRoot: string): WorkspaceStructure;

// Check if workspace is initialized
function isWorkspaceInitialized(workspaceRoot: string): Promise<boolean>;

// Validate workspace structure
function validateWorkspace(workspaceRoot: string): Promise<boolean>;

// Generate problem files
function generateProblemFiles(options: GenerateOptions): Promise<void>;

// Check if problem files exist
function problemExists(workspaceRoot: string, slug: string, language: string): Promise<boolean>;

// Get problem metadata
function getProblemMetadata(workspaceRoot: string, slug: string, language: string): Promise<any>;

// Archive completed problem
function archiveProblem(options: ArchiveOptions): Promise<void>;

// Restore archived problem
function unarchiveProblem(options: ArchiveOptions): Promise<void>;
```

### Type Interfaces

```typescript
interface ProblemQuery {
  difficulty?: Difficulty | Difficulty[];
  category?: ProblemCategory | ProblemCategory[];
  topics?: string | string[];
  status?: 'not-started' | 'in-progress' | 'completed';
  isCustom?: boolean;
  limit?: number;
  offset?: number;
}

interface GenerateOptions {
  problem: Problem;
  workspaceRoot: string;
  language: SupportedLanguage;
  templateStyle?: 'minimal' | 'documented' | 'complete';
  overwrite?: boolean;
}

interface ArchiveOptions {
  workspaceRoot: string;
  problemSlug: string;
  language: SupportedLanguage;
  includeMetadata?: boolean;
}

interface WorkspaceStructure {
  root: string;
  current: string;
  completed: string;
  templates: string;
  config: string;
}
```

## Testing Guide

### Unit Testing Commands

Create test files in `test/commands/`:

```typescript
// test/commands/challenge.test.ts
import { assertEquals, assertRejects } from '@std/assert';
import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';
import { challengeCommand } from '../../src/cli/commands/challenge.ts';

describe('challengeCommand', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await Deno.makeTempDir();
  });

  afterEach(async () => {
    await Deno.remove(tempDir, { recursive: true });
  });

  it('should start a challenge by slug', async () => {
    const result = await challengeCommand({
      slug: 'two-sum',
      workspace: tempDir,
      _: [],
    });

    assertEquals(result.success, true);
    assertEquals(result.exitCode, 0);
  });

  it('should handle unknown problem slug', async () => {
    const result = await challengeCommand({
      slug: 'unknown-problem',
      workspace: tempDir,
      _: [],
    });

    assertEquals(result.success, false);
    assertEquals(result.exitCode, 1);
  });
});
```

### Integration Testing

Test full command flows:

```typescript
// test/integration/workflow.test.ts
import { assertEquals } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { initCommand } from '../../src/cli/commands/init.ts';
import { challengeCommand } from '../../src/cli/commands/challenge.ts';
import { completeCommand } from '../../src/cli/commands/complete.ts';

describe('Complete Workflow', () => {
  it('should support init -> challenge -> complete workflow', async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      // 1. Initialize workspace
      const initResult = await initCommand({
        path: tempDir,
        _: [],
      });
      assertEquals(initResult.success, true);

      // 2. Start challenge
      const challengeResult = await challengeCommand({
        slug: 'two-sum',
        workspace: tempDir,
        _: [],
      });
      assertEquals(challengeResult.success, true);

      // 3. Complete challenge
      const completeResult = await completeCommand({
        _: ['two-sum'],
        workspace: tempDir,
      });
      assertEquals(completeResult.success, true);
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });
});
```

### Mocking ProblemManager

For isolated testing, mock the ProblemManager:

```typescript
// test/mocks/problem-manager.ts
export class MockProblemManager {
  private problems = new Map([
    ['two-sum', { id: 1, slug: 'two-sum', title: 'Two Sum' }],
    ['add-two-numbers', { id: 2, slug: 'add-two-numbers', title: 'Add Two Numbers' }],
  ]);

  async init() {
    // Mock initialization
  }

  getBySlug(slug: string) {
    return this.problems.get(slug);
  }

  list(query?: any) {
    return Array.from(this.problems.values());
  }
}
```

---

## Summary

This integration guide provides:

- ✅ **Single Import Point**: Use `src/core/mod.ts` for all PMS functionality
- ✅ **Command Patterns**: Ready-to-use templates for common CLI commands
- ✅ **Error Handling**: Typed error handling with specific error types
- ✅ **Configuration**: Integration with `ConfigManager` for user preferences
- ✅ **Best Practices**: Input validation, precondition checks, user feedback
- ✅ **Complete API Reference**: All available functions and types
- ✅ **Testing Guide**: Unit and integration testing patterns

With this guide, Phase 3 implementers can build CLI commands without needing to understand the internal structure of the Problem Management System. All necessary functionality is available through the clean, documented `core/mod.ts` interface.
