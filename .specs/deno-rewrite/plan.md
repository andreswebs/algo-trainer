# Algo Trainer - Deno TypeScript Rewrite Plan

## Executive Summary

This document outlines a complete rewrite plan for the Algo Trainer application (previously Local Leetcode Trainer), migrating from Node.js/JavaScript to Deno/TypeScript while incorporating modern 12-factor CLI application principles. The rewrite aims to create a more maintainable, type-safe, and user-friendly application.

## Current State Analysis

### Existing Codebase Overview

The current Algo Trainer is a comprehensive CLI tool with:

- **142+ JavaScript files** using CommonJS modules
- **Multi-language support** (JavaScript, Python, Java, C++)
- **AI Teaching Engine** with dynamic problem generation
- **Problem Management System** with 120+ predefined problems
- **Interactive CLI** with various commands (challenge, hint, complete, learn)
- **File-based configuration** and workspace management

### Core Components Identified

From the codebase analysis, the main functional areas are:

1. **CLI Interface** - Main entry point and command routing
2. **Problem Management** - Problem generation, parsing, and templates
3. **AI Teaching Engine** - Interactive learning and hint systems
4. **Configuration System** - User preferences and workspace setup
5. **Test Runner** - Multi-language test execution
6. **File Management** - Problem files and workspace organization
7. **Scraping/API** - LeetCode data acquisition (when needed)

### Technical Debt & Opportunities

**Current Issues:**

- Heavy CommonJS usage throughout
- Inconsistent error handling patterns
- Mixed stdout/stderr usage
- Non-XDG compliant configuration
- Performance concerns (startup time)
- Limited type safety
- Complex dependency on Node.js ecosystem

**Opportunities:**

- Modern TypeScript with strict typing
- Deno's built-in capabilities (testing, formatting, linting)
- Improved CLI UX following 12-factor principles
- Better security model with permissions
- Simpler dependency management

## Architecture Design

### New Project Structure

```
lib/
├── cli/                    # CLI interface and commands
│   ├── commands/          # Individual command implementations
│   │   ├── challenge.ts
│   │   ├── complete.ts
│   │   ├── hint.ts
│   │   ├── learn.ts
│   │   ├── config.ts
│   │   └── init.ts
│   ├── types.ts           # CLI-specific types
│   ├── main.ts            # Main CLI entry point
│   └── router.ts          # Command routing logic
├── core/                  # Core business logic
│   ├── problem/           # Problem management
│   │   ├── manager.ts     # Problem CRUD operations
│   │   ├── parser.ts      # Problem file parsing
│   │   ├── templates.ts   # Code template generation
│   │   └── types.ts       # Problem-related types
│   ├── ai/               # AI Teaching Engine
│   │   ├── engine.ts     # Main AI interaction
│   │   ├── hints.ts      # Hint generation system
│   │   ├── teaching.ts   # Teaching script generation
│   │   └── types.ts      # AI-related types
│   ├── config/           # Configuration management
│   │   ├── manager.ts    # Config CRUD (XDG compliant)
│   │   ├── paths.ts      # Path resolution utilities
│   │   └── types.ts      # Config types
│   ├── workspace/        # Workspace management
│   │   ├── manager.ts    # Workspace operations
│   │   ├── files.ts      # File operations
│   │   └── types.ts      # Workspace types
│   └── testing/          # Test execution
│       ├── runner.ts     # Multi-language test runner
│       ├── languages/    # Language-specific runners
│       └── types.ts      # Testing types
├── utils/                # Shared utilities
│   ├── errors.ts         # Standardized error handling
│   ├── output.ts         # CLI output utilities (stdout/stderr)
│   ├── display.ts        # Colors, spinners, tables
│   ├── validation.ts     # Input validation
│   ├── http.ts           # HTTP client (for scraping)
│   └── fs.ts             # File system utilities
├── types/                # Global type definitions
│   ├── index.ts          # Re-exports all types
│   ├── global.ts         # Global types
│   └── external.ts       # External API types
└── data/                 # Static data and templates
    ├── problems/         # Problem definitions (converted to JSON)
    ├── templates/        # Code templates by language
    └── scripts/          # Teaching scripts

tests/                    # Comprehensive test suite
├── unit/                 # Unit tests
├── integration/          # Integration tests
└── fixtures/             # Test data

docs/                     # Documentation
├── README.md
├── DEVELOPMENT.md
├── CONTRIBUTING.md
├── API.md
└── examples/

deno.json                 # Deno configuration
deno.lock                 # Lock file
mod.ts                    # Main module export
```

### Core Type Definitions

```typescript
// types/global.ts
export interface Problem {
  id: string;
  slug: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
  examples: Example[];
  constraints: string[];
  hints: string[];
  tags: string[];
  companies?: string[];
  leetcodeUrl?: string;
}

export interface Example {
  input: Record<string, any>;
  output: any;
  explanation?: string;
}

export interface Config {
  language: SupportedLanguage;
  workspace: string;
  aiEnabled: boolean;
  companies: string[];
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  verbosity: 'quiet' | 'normal' | 'verbose';
  autoSave: boolean;
  templateStyle: 'minimal' | 'documented' | 'comprehensive';
}

export type SupportedLanguage =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'java'
  | 'cpp'
  | 'rust'
  | 'go';

export interface WorkspaceStructure {
  root: string;
  problems: string;
  completed: string;
  templates: string;
  config: string;
}
```

## Implementation Phases

### Phase 1: Foundation & Core Infrastructure (Week 1-2)

**Goal**: Establish the basic project structure and core utilities

**Tasks:**

1. **Project Setup**

   - Create new Deno project structure
   - Configure deno.json with tasks, imports, and compiler options
   - Set up TypeScript strict mode configuration
   - Establish testing framework with @std/assert

2. **Core Utilities**

   - Create output utilities for proper stdout/stderr separation (stderr: all human messages, stdout: only machine-readable data)
   - Build display utilities (colors, spinners, progress bars)
   - Implement XDG-compliant configuration paths

3. **Type System Foundation**

   - Define all core interfaces and types
   - Create comprehensive type definitions for problems, configs, workspace
   - Establish API contracts between modules

4. **Configuration System**
   - Build XDG-compliant config manager
   - Implement config migration from old format
   - Add validation and default config generation

**Deliverables:**

- Project structure with all directories
- Core utility modules
- Type definitions
- Configuration management system
- Basic test suite setup

**Files to Create:**

- `lib/utils/` (all files)
- `lib/types/` (all files)
- `lib/config/` (all files)
- `deno.json`, `mod.ts`

**Estimated Effort:** 20-25 hours

### Phase 2: Problem Management System (Week 3)

**Goal**: Rebuild the problem management core with type safety

**Tasks:**

1. **Problem Data Migration**

   - Convert existing 120+ problem files to structured JSON/TypeScript
   - Validate all problem data against new type definitions
   - Create problem database with indexing

2. **Problem Manager**

   - Implement CRUD operations for problems
   - Build problem filtering and search capabilities
   - Add problem validation system

3. **Template System**

   - Rebuild code template generation for all supported languages
   - Create flexible template system with customization
   - Implement template testing framework

4. **File Operations**
   - Build workspace management system
   - Implement problem file generation (solution, test, README)
   - Create file watching and auto-refresh capabilities

**Deliverables:**

- Complete problem database in new format
- Problem management system
- Template generation system
- File operation utilities

**Files to Create:**

- `lib/core/problem/` (all files)
- `lib/core/workspace/` (all files)
- `lib/data/problems/` (converted data)
- `lib/data/templates/` (language templates)

**Estimated Effort:** 25-30 hours

### Phase 3: CLI Interface & Commands (Week 4)

**Goal**: Create the modern CLI interface following 12-factor principles

**Tasks:**

1. **CLI Framework**

   - Build command router with flag-based arguments
   - Implement help system with examples and completions
   - Add version command and global options
   - Add global flags: `--no-color`, `--no-emoji`, `--verbose`, `--quiet`

2. **Core Commands**

   - `at challenge` - Problem generation with enhanced UX
   - `at complete` - Mark problems as completed/active
   - `at config` - Configuration management
   - `at init` - Workspace initialization
   - `at progress` - Progress tracking with tables

3. **Interactive Features**

   - Add prompts for missing required inputs
   - Implement table displays for data
   - Create progress indicators for long operations

4. **Shell Integration**
   - Generate shell completions (bash, zsh, fish)
   - Add environment variable support
   - Implement proper exit codes

**Deliverables:**

- Complete CLI interface
- All core commands implemented
- Shell completion scripts
- Interactive features

**Files to Create:**

- `lib/cli/` (all files)
- Shell completion scripts
- CLI help documentation

**Estimated Effort:** 20-25 hours

### Phase 4: AI Teaching Engine & Advanced Features (Week 5)

**Goal**: Rebuild the AI teaching system with enhanced capabilities

**Tasks:**

1. **AI Engine Core**

   - Rebuild AI teaching engine with better error handling
   - Implement hint generation system
   - Create teaching script generator

2. **Enhanced Learning Features**

   - Build interactive hint system with progressive disclosure
   - Implement AI-powered code review and suggestions
   - Create learning path recommendations

3. **Test Runner System**

   - Rebuild multi-language test execution
   - Implement real-time test feedback
   - Add performance metrics and benchmarking

4. **Scraping & External APIs**
   - Implement LeetCode API integration (when available)
   - Build fallback scraping system
   - Add problem data validation and caching

**Deliverables:**

- AI teaching engine
- Test runner system
- External API integration
- Learning features

**Files to Create:**

- `lib/core/ai/` (all files)
- `lib/core/testing/` (all files)
- `lib/utils/http.ts`

**Estimated Effort:** 25-30 hours

### Phase 5: Testing, Documentation & Polish (Week 6)

**Goal**: Comprehensive testing, documentation, and final polish

**Tasks:**

1. **Comprehensive Testing**

   - Unit tests for all modules (target 90% coverage)
   - Integration tests for CLI workflows
   - Performance tests and benchmarking

2. **Documentation**

   - Complete README with examples
   - API documentation for all modules
   - Development setup and contribution guidelines

3. **Performance Optimization**

   - Optimize startup time (target <500ms)
   - Implement caching for expensive operations
   - Memory usage optimization

4. **Final Polish**
   - Error message refinement
   - UX improvements based on testing
   - Security audit and permission refinement

**Deliverables:**

- Complete test suite
- Comprehensive documentation
- Performance-optimized application
- Production-ready release

**Files to Create:**

- Complete test suite
- Documentation files
- Performance benchmarks

**Estimated Effort:** 15-20 hours

## Migration Strategy

### Code Reuse Approach

**High Reuse (80-90% logic retained):**

- Problem definitions and templates (with format conversion)
- AI teaching prompts and scripts
- Configuration schemas
- Test cases and examples

**Medium Reuse (50-70% logic retained):**

- CLI command logic (restructured for better UX)
- File management operations
- Problem management algorithms
- Display and formatting logic

**Low Reuse (20-30% logic retained):**

- Module system (CommonJS → ES modules)
- Error handling (completely restructured)
- Configuration management (XDG compliance)
- Output handling (stdout/stderr separation)

**No Reuse (complete rewrite):**

- Package management approach
- Type definitions (adding TypeScript)
- CLI argument parsing (flag-based approach)
- Permission and security model

### Backward Compatibility Strategy

1. **Config Migration**

   - Auto-detect old `.leetcode-config.json` files
   - Provide migration utility: `at migrate-config`
   - Show clear migration instructions

2. **Workspace Compatibility**

   - Detect existing problem directories
   - Preserve user-created solution files
   - Upgrade workspace structure gracefully

3. **Command Compatibility**
   - Maintain old command syntax with deprecation warnings
   - Provide command equivalence documentation
   - Gradual transition period

### Data Migration Plan

1. **Problem Database**

   - Convert existing problem files to new JSON format
   - Validate all data against TypeScript interfaces
   - Create migration scripts for any schema changes

2. **Configuration**

   - Convert old config format to new XDG-compliant structure
   - Preserve user preferences and customizations
   - Add new configuration options with sensible defaults

3. **Workspace Structure**
   - Respect existing problem organization
   - Upgrade directory structure while preserving files
   - Add new metadata files for enhanced functionality

## Technical Specifications

### Deno Configuration

```json
// deno.json
{
  "tasks": {
    "dev": "deno run --allow-all --watch lib/cli/main.ts",
    "build": "deno compile --allow-all --output=bin/at lib/cli/main.ts",
    "test": "deno test --allow-all",
    "test:watch": "deno test --allow-all --watch",
    "bench": "deno bench --allow-all",
    "lint": "deno lint",
    "fmt": "deno fmt",
    "check": "deno check lib/**/*.ts"
  },
  "imports": {
    "@std/assert": "jsr:@std/assert@^1.0.0",
    "@std/testing": "jsr:@std/testing@^1.0.0",
    "@std/cli": "jsr:@std/cli@^1.0.0",
    "@std/path": "jsr:@std/path@^1.0.0",
    "@std/fs": "jsr:@std/fs@^1.0.0",
    "@std/yaml": "jsr:@std/yaml@^1.0.0",
    "@std/json": "jsr:@std/json@^1.0.0"
  },
  "compilerOptions": {
    "allowJs": false,
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "strictNullChecks": true,
    "exactOptionalPropertyTypes": true
  },
  "fmt": {
    "useTabs": false,
    "lineWidth": 100,
    "indentWidth": 2,
    "semiColons": true,
    "singleQuote": true,
    "proseWrap": "preserve"
  },
  "lint": {
    "rules": {
      "tags": ["recommended"],
      "include": ["ban-untagged-todo"],
      "exclude": ["no-unused-vars"]
    }
  },
  "exclude": ["tests/fixtures/", "docs/examples/"]
}
```

### Permission Model

```typescript
// Required Deno permissions for different operations
const PERMISSIONS = {
  // Core operations
  read: ['.', '$HOME/.config', '$HOME/.cache', '$HOME/.local'],
  write: ['.', '$HOME/.config', '$HOME/.cache', '$HOME/.local'],

  // Network for LeetCode API/scraping
  net: ['leetcode.com', 'api.leetcode.com'],

  // External processes for test runners
  run: ['python', 'java', 'javac', 'g++', 'rustc', 'go'],

  // Environment variables for XDG and configuration
  env: [
    'HOME',
    'XDG_CONFIG_HOME',
    'XDG_CACHE_HOME',
    'XDG_DATA_HOME',
    'NO_COLOR',
    'TERM',
    'AT_NO_EMOJI',
  ],
} as const;
```

### Error Handling System

Keep it simple! Just ensure proper stream separation:

```typescript
// utils/output.ts - Simple output helpers with customization options
interface OutputOptions {
  useColors: boolean;
  useEmoji: boolean;
}

let options: OutputOptions = {
  useColors: !Deno.env.get('NO_COLOR') && Deno.stdout.isTerminal,
  useEmoji: true,
};

export function setOutputOptions(opts: Partial<OutputOptions>): void {
  options = { ...options, ...opts };
}

export function logSuccess(message: string): void {
  const prefix = options.useEmoji ? '✅ ' : 'SUCCESS: ';
  console.error(`${prefix}${message}`);
}

export function logError(message: string, details?: string): void {
  const prefix = options.useEmoji ? '❌ ' : 'ERROR: ';
  console.error(`${prefix}${message}`);
  if (details) {
    console.error(`   ${details}`);
  }
}

export function logWarning(message: string): void {
  const prefix = options.useEmoji ? '⚠️  ' : 'WARNING: ';
  console.error(`${prefix}${message}`);
}

export function logInfo(message: string): void {
  const prefix = options.useEmoji ? 'ℹ️  ' : 'INFO: ';
  console.error(`${prefix}${message}`);
}

export function exitWithError(message: string, code = 1): never {
  logError(message);
  Deno.exit(code);
}

// Only for machine-readable output that other tools consume
export function outputData(data: string): void {
  console.log(data);
}
```

**Stream Usage Rules:**

- **stderr**: All human messages (success, errors, warnings, info, progress)
- **stdout**: Only machine-readable data meant for piping/consumption by other tools

## Quality Assurance

### Testing Strategy

**Unit Testing (Target: 90% coverage)**

- All utility functions
- Core business logic
- Type validation
- Error handling scenarios

**Integration Testing**

- CLI command workflows
- File system operations
- Configuration management
- Problem lifecycle operations

**Performance Testing**

- Startup time benchmarks
- Memory usage profiling
- Large workspace handling
- Concurrent operations

**User Experience Testing**

- CLI usability testing
- Error message clarity
- Help system effectiveness
- Cross-platform compatibility

### Code Quality Standards

**TypeScript Configuration:**

- Strict mode enabled
- No implicit any
- Exact optional properties
- Comprehensive type coverage

**Linting & Formatting:**

- Deno's built-in linter
- Consistent formatting with deno fmt
- Custom lint rules for project standards

**Documentation Standards:**

- TSDoc comments for all public APIs
- README with comprehensive examples
- Architecture decision records
- API documentation

## Success Metrics

### Technical Metrics

- [ ] **Startup Performance**: CLI startup time <500ms (vs current ~1-2s)
- [ ] **Type Safety**: 100% TypeScript coverage, no `any` types
- [ ] **Test Coverage**: Minimum 90% code coverage
- [ ] **Memory Usage**: <50MB baseline memory usage
- [ ] **Binary Size**: Compiled binary <20MB

### User Experience Metrics

- [ ] **12-Factor Compliance**: All 12 principles implemented
- [ ] **Error Quality**: All errors include code, description, and fix suggestions
- [ ] **Help System**: Comprehensive help with examples for all commands
- [ ] **Performance**: All operations provide progress feedback
- [ ] **Accessibility**: Full NO_COLOR and terminal compatibility

### Functional Metrics

- [ ] **Feature Parity**: All existing functionality preserved or improved
- [ ] **Language Support**: All current languages (JS, Python, Java, C++) supported
- [ ] **AI Features**: Enhanced AI teaching capabilities
- [ ] **Cross-platform**: Works on macOS, Linux, Windows
- [ ] **Offline Capability**: Full functionality without internet connection

## Risks & Mitigation

### High Risk Areas

1. **Complex Problem Data Migration**

   - **Risk**: Loss of problem data or metadata during conversion
   - **Mitigation**: Comprehensive backup strategy, validation testing, rollback plan

2. **AI System Integration**

   - **Risk**: Breaking AI teaching features during rewrite
   - **Mitigation**: Port AI logic early, extensive testing, gradual rollout

3. **User Adoption**
   - **Risk**: Users reject new CLI interface despite improvements
   - **Mitigation**: Maintain backward compatibility, provide migration guide, gradual transition

### Medium Risk Areas

1. **Performance Regression**

   - **Risk**: New implementation slower than current
   - **Mitigation**: Performance benchmarks, optimization focus, early testing

2. **Cross-platform Compatibility**

   - **Risk**: Deno-specific features breaking on some platforms
   - **Mitigation**: Multi-platform testing, conservative API usage

3. **Dependency Management**
   - **Risk**: Deno ecosystem lacking required functionality
   - **Mitigation**: Evaluate dependencies early, plan alternatives

## Timeline & Resource Requirements

### Development Timeline

**Total Duration**: 6 weeks (120-150 hours)

- **Week 1-2**: Foundation & Infrastructure (40-50 hours)
- **Week 3**: Problem Management System (25-30 hours)
- **Week 4**: CLI Interface & Commands (20-25 hours)
- **Week 5**: AI Engine & Advanced Features (25-30 hours)
- **Week 6**: Testing & Documentation (15-20 hours)

### Resource Requirements

**Development Resources:**

- 1 senior developer familiar with TypeScript and CLI development
- Access to existing codebase and documentation
- Testing environments (macOS, Linux, Windows)

**Infrastructure Resources:**

- Git repository for new codebase
- CI/CD pipeline for automated testing
- Documentation hosting
- Beta testing environment

### Milestone Schedule

**Milestone 1** (End of Week 2): Core infrastructure complete

- Project structure established
- Configuration system working
- Type definitions complete
- Basic CLI framework operational

**Milestone 2** (End of Week 3): Problem system functional

- Problem database migrated
- Template generation working
- File operations complete
- Basic problem management operational

**Milestone 3** (End of Week 4): CLI feature complete

- All commands implemented
- 12-factor principles applied
- Shell integration complete
- User experience optimized

**Milestone 4** (End of Week 5): Full feature parity

- AI system ported and enhanced
- Test runner functional
- Advanced features complete
- Beta testing ready

**Milestone 5** (End of Week 6): Production ready

- Testing complete (90% coverage)
- Documentation complete
- Performance optimized
- Release candidate ready

## Conclusion

This rewrite represents a significant modernization of the Algo Trainer, transforming it from a Node.js/JavaScript application to a modern Deno/TypeScript CLI tool that follows industry best practices. The investment of 120-150 hours will result in:

- **Superior Developer Experience**: Type safety, better tooling, modern APIs
- **Enhanced User Experience**: 12-factor CLI principles, better error handling, improved performance
- **Future-Proof Architecture**: Modular design, comprehensive testing, excellent documentation
- **Simplified Maintenance**: Deno's built-in tooling, reduced dependencies, cleaner codebase

The phased approach ensures steady progress while maintaining the ability to validate each component before moving to the next phase. The comprehensive testing and documentation strategy ensures the new application will be robust and maintainable.

While this is a substantial undertaking, the result will be a significantly improved application that serves as a solid foundation for future enhancements and provides an excellent user experience for developers practicing algorithmic problem-solving.
