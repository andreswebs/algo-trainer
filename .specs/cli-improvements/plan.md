# 12-Factor CLI App Redesign Plan for Local LeetCode Trainer

This document outlines a comprehensive plan to redesign the Local LeetCode Trainer to follow the 12-factor CLI app principles described in the attached design document.

## Current State Analysis

The Local LeetCode Trainer is a well-featured CLI tool with multi-language support and AI teaching capabilities. However, it doesn't fully align with modern CLI best practices defined in the 12-factor approach.

### Current Strengths

- ✅ **Multi-command structure**: Uses commander.js for subcommands
- ✅ **Basic help system**: Has `--help` flag and command descriptions
- ✅ **Version command**: Has `--version` flag
- ✅ **Rich functionality**: Comprehensive feature set for LeetCode practice

### Current Gaps

- ❌ **Inconsistent help patterns**: Help is not available in all expected ways
- ❌ **Non-standard error handling**: Mixing stdout/stderr, inconsistent error formats
- ❌ **No color/output control**: No NO_COLOR or TERM environment variable support
- ❌ **Non-XDG compliant**: Config stored in project root instead of user directories
- ❌ **Inconsistent argument patterns**: Mix of positional args and flags without clear reasoning
- ❌ **No progress indicators**: Long operations don't show progress
- ❌ **Inconsistent exit codes**: Not following standard exit code conventions

## Redesign Plan

### 1. Enable Help ✅ → 🔄 **ENHANCE**

**Current State**: Basic help with `--help` flag exists
**Required Changes**:

- [ ] Add empty command help (show help when no command provided)
- [ ] Add comprehensive examples to all command help
- [ ] Implement shell completion (bash/zsh/fish)
- [ ] Create web documentation linked from CLI help
- [ ] Add contextual help hints in error messages

**Implementation Priority**: Medium
**Files to Modify**: `bin/leetcode-trainer.js`, new completion files

### 2. Enable Version ✅ **COMPLETE**

**Current State**: Already has `--version` and `-v` flags
**Required Changes**: None - already compliant

### 3. Prefer Flags to Args 🔄 **MAJOR REFACTOR**

**Current State**: Heavy use of positional arguments
**Required Changes**:

- [ ] Convert `challenge <difficulty> [count]` to `challenge --difficulty=easy --count=1`
- [ ] Convert `hint <problem> [level]` to `hint --problem=two-sum --level=1`
- [ ] Convert `complete [action] [problem]` to `complete --action=mark --problem=two-sum`
- [ ] Keep only obvious positional args (e.g., `init` with no args)

**Implementation Priority**: High
**Files to Modify**: `bin/leetcode-trainer.js`, all script files in `scripts/`

### 4. Use Streams Correctly ❌ **MAJOR REFACTOR**

**Current State**: Mixing stdout and stderr incorrectly
**Required Changes**:

- [ ] Create standardized output utility module
- [ ] All user-facing output (results, success messages) → stdout
- [ ] All error messages, warnings, debug info → stderr
- [ ] All progress indicators → stderr
- [ ] Audit all `console.log` vs `console.error` usage

**Implementation Priority**: High
**Files to Modify**: All scripts, create new `utils/output.js`

### 5. Handle Errors ❌ **MAJOR REFACTOR**

**Current State**: Basic error messages without structure
**Required Changes**:

- [ ] Create standardized error handling system with:
  - Error codes (LCT_001, LCT_002, etc.)
  - Error titles and descriptions
  - Fix suggestions
  - URL links to documentation
- [ ] Add `--debug` flag for full tracebacks
- [ ] Add `LCT_DEBUG=1` environment variable
- [ ] Implement proper exit codes (0=success, 1=error, 2=misuse)
- [ ] Add error logging with timestamps (without ANSI codes)

**Implementation Priority**: High
**Files to Modify**: All scripts, create new `utils/errors.js`

### 6. Use Human Display Formats ❌ **MAJOR ADDITION**

**Current State**: Basic text output, some emoji usage
**Required Changes**:

- [ ] Add color support with proper fallbacks:
  - Check `process.stdout.isTTY`
  - Respect `NO_COLOR` environment variable
  - Respect `TERM=dumb`
  - Add `LCT_NO_COLOR=1` support
  - Add `--no-color` flag
- [ ] Add spinners for long operations (scraping, AI requests)
- [ ] Add progress bars for batch operations
- [ ] Add OS notifications for very long tasks
- [ ] Implement color highlighting for important info

**Implementation Priority**: Medium
**Files to Modify**: All scripts, create new `utils/display.js`

### 7. Prompt the User 🔄 **ENHANCE**

**Current State**: Some prompts exist but not consistent
**Required Changes**:

- [ ] Add prompts when stdin is TTY for:
  - Language selection (if not specified)
  - Difficulty selection (if not specified)
  - Confirmation for destructive actions
- [ ] Always provide flag alternatives for non-interactive use
- [ ] Add interactive checkboxes/radio buttons for problem selection
- [ ] Ensure all prompts have `--yes` flag override

**Implementation Priority**: Low
**Files to Modify**: All interactive scripts

### 8. Use Tables ❌ **ADD FEATURE**

**Current State**: Plain text lists
**Required Changes**:

- [ ] Add table display for:
  - Problem lists with status, difficulty, completion
  - Progress statistics
  - Configuration overview
  - Available languages/features
- [ ] Support both ASCII and Unicode table formats
- [ ] Respect terminal width for responsive tables

**Implementation Priority**: Low
**Files to Modify**: `scripts/progress-check.js`, `scripts/config.js`, others

### 9. Ensure Good Performance ⚠️ **AUDIT NEEDED**

**Current State**: Unknown performance characteristics
**Required Changes**:

- [ ] Audit startup time (target <500ms)
- [ ] Add performance benchmarks for common commands
- [ ] Add progress indicators for >2s operations
- [ ] Optimize frequent operations (problem listing, config reading)
- [ ] Add caching for expensive operations

**Implementation Priority**: Medium
**Files to Modify**: All scripts

### 10. Encourage Contributions ✅ **ENHANCE**

**Current State**: MIT license, GitHub repo
**Required Changes**:

- [ ] Add CONTRIBUTING.md (restore from .bak)
- [ ] Add CODE_OF_CONDUCT.md
- [ ] Add development setup instructions
- [ ] Add test running instructions
- [ ] Document architecture and extension points

**Implementation Priority**: Low
**Files to Modify**: Documentation files

### 11. Be Clear About Subcommands ✅ **GOOD**

**Current State**: Clear multi-command structure
**Required Changes**:

- [ ] Improve default behavior (show help instead of welcome message)
- [ ] Add command categories in help output
- [ ] Group related commands visually

**Implementation Priority**: Low
**Files to Modify**: `bin/leetcode-trainer.js`

### 12. Follow XDG-Spec ❌ **MAJOR REFACTOR**

**Current State**: Config in `.leetcode-config.json` in project root
**Required Changes**:

- [ ] Move config to `~/.config/local-leetcode-trainer/`
- [ ] Move cache to `~/.cache/local-leetcode-trainer/`
- [ ] Move data to `~/.local/share/local-leetcode-trainer/`
- [ ] Respect `XDG_CONFIG_HOME`, `XDG_CACHE_HOME`, `XDG_DATA_HOME`
- [ ] Add migration utility for existing configs
- [ ] Update all file path logic

**Implementation Priority**: High
**Files to Modify**: `scripts/config.js`, all scripts that read/write files

## Implementation Phases

### Phase 1: Core Infrastructure (High Priority)

1. **Error Handling System** - Create centralized error handling with codes and structured output
2. **Stream Separation** - Fix stdout/stderr usage throughout codebase
3. **XDG Compliance** - Move config/cache/data to proper directories
4. **Flag Preference** - Convert major commands to use flags instead of positional args

### Phase 2: User Experience (Medium Priority)

1. **Color & Output Control** - Add color support with proper environment variable respect
2. **Progress Indicators** - Add spinners and progress bars for long operations
3. **Performance Audit** - Measure and optimize command startup/execution times
4. **Enhanced Help** - Add examples and shell completion

### Phase 3: Polish (Low Priority)

1. **Table Output** - Add structured table displays for data
2. **Interactive Prompts** - Enhance user prompts with better UI
3. **Documentation** - Complete contributing guidelines and development docs

## File Structure Changes

### New Files to Create

```
utils/
├── errors.js          # Centralized error handling
├── output.js          # Stream-aware output utilities
├── display.js         # Color, spinners, progress bars
├── config-paths.js    # XDG-compliant path resolution
└── tables.js          # Table formatting utilities

completions/
├── bash-completion.sh
├── zsh-completion.sh
└── fish-completion.fish

docs/
├── CONTRIBUTING.md    # Restore and enhance
├── CODE_OF_CONDUCT.md
├── DEVELOPMENT.md
└── API.md
```

### Major File Modifications

- **bin/leetcode-trainer.js** - Refactor command definitions for flags
- **scripts/config.js** - XDG compliance, new config paths
- **All scripts/\*.js** - Error handling, stream usage, output formatting
- **package.json** - Add shell completion installation scripts

## Migration Strategy

1. **Backward Compatibility**: Maintain old positional argument patterns with deprecation warnings
2. **Config Migration**: Auto-migrate existing `.leetcode-config.json` to XDG locations
3. **Gradual Rollout**: Implement changes incrementally with feature flags
4. **Version Bumping**: Major version bump (2.0.0) for breaking changes

## Success Metrics

- [ ] Startup time <500ms for common commands
- [ ] All error messages include error codes and fix suggestions
- [ ] Color output respects all environment variables correctly
- [ ] Config follows XDG spec on all platforms
- [ ] Shell completion works for bash/zsh/fish
- [ ] All commands work in non-interactive environments
- [ ] 100% separation of stdout (data) vs stderr (messages)

## Estimated Implementation Time

- **Phase 1**: 2-3 weeks (40-60 hours)
- **Phase 2**: 1-2 weeks (20-40 hours)
- **Phase 3**: 1 week (10-20 hours)
- **Total**: 4-6 weeks for complete redesign

This plan transforms the Local LeetCode Trainer from a functional but inconsistent CLI into a modern, user-friendly tool that follows industry best practices while maintaining all existing functionality.
