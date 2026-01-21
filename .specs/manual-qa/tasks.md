# Manual QA Issues - Implementation Plan

**Status:** Ready for Implementation
**Goal:** Fix all issues identified during manual QA testing
**Priority:** CRITICAL (Binary is non-functional)

## Overview

This document provides an implementation plan to fix all issues discovered during manual QA testing of the Algo-Trainer application. Tasks are organized by priority and dependency, with the critical binary compilation issue taking top priority.

### Issues Summary

| Issue ID | Severity | Description | Status |
|----------|----------|-------------|--------|
| CRITICAL-001 | Critical | Binary doesn't include data files | 🔴 Pending |
| TC-010 | High | Init requires path argument | 🔴 Pending |
| TC-012 | Medium | Wrong exit code for already initialized | 🔴 Pending |
| TC-030 | Medium | Wrong error message for missing workspace | 🔴 Pending |
| TC-046 | Low | Invalid hint level wrong exit code | 🔴 Pending |
| TC-063 | Low | Tag filter may not be working | 🔴 Pending |
| TC-117 | Low | Invalid env var handling | 🔴 Pending |

## Task Dependency Graph

```
PRIORITY 0 (CRITICAL - Must fix immediately):
└── FIX-001: Fix binary compilation to include data files

PRIORITY 1 (High - Core functionality):
├── FIX-010: Allow init without path argument
└── FIX-030: Fix workspace detection error message

PRIORITY 2 (Medium - Exit code consistency):
├── FIX-012: Fix workspace already initialized exit code
├── FIX-046: Fix invalid hint level exit code
└── FIX-117: Fix invalid environment variable exit code

PRIORITY 3 (Low - Feature bugs):
└── FIX-063: Investigate and fix tag filtering

PRIORITY 4 (Testing & Validation):
├── TEST-001: Add binary compilation tests
├── TEST-002: Add exit code validation tests
└── TEST-003: Update manual QA test suite
```

---

## Priority 0: CRITICAL Binary Fix

### FIX-001: Fix Binary Compilation to Include Data Files

**Severity:** CRITICAL - Binary is completely non-functional
**Impact:** Users cannot use the compiled binary at all
**Files to Modify:**
- `deno.json` or build script
- `src/data/loader.ts` (may need refactoring)
- `src/main.ts` (may need import changes)

**Problem:**
The `deno compile` command doesn't include the JSON problem files from `src/data/problems/*.json`, causing the binary to report "No problems found" for all commands.

**Solution Options:**

**Option A: Embed data files during compilation (Recommended)**
```bash
# Update build command to include data files
deno compile --allow-all \
  --include src/data/problems/*.json \
  --output bin/at \
  src/main.ts
```

**Option B: Convert JSON to TypeScript modules**
1. Create a build script that converts all JSON files to TS modules
2. Import problems as TypeScript modules instead of reading JSON files
3. This ensures they're bundled in the binary

**Implementation Steps:**
1. **Investigate current data loading mechanism**
   - Check how `src/data/loader.ts` currently loads problem files
   - Identify if using `Deno.readFile` or dynamic imports

2. **Choose and implement solution**
   - If using file reads: Add `--include` flags to build command
   - If that doesn't work: Convert to TypeScript module approach

3. **Update build process**
   - Modify `deno.json` tasks or build script
   - Document the build requirements

4. **Test binary thoroughly**
   - Build the binary
   - Test all problem-related commands
   - Verify data is accessible

**Acceptance Criteria:**
- Binary works standalone without source files
- All problem commands (list, challenge, hint) work correctly
- No performance degradation
- Build process is documented

**Estimated Effort:** 2-3 hours

---

## Priority 1: Core Functionality Fixes

### FIX-010: Allow Init Without Path Argument

**Severity:** High
**Files to Modify:** `src/cli/commands/init.ts`

**Current Behavior:**
```bash
at init  # Error: "Root directory cannot be empty"
```

**Expected Behavior:**
```bash
at init  # Initializes workspace in current directory
```

**Implementation:**
```typescript
// In init command handler
const targetPath = args.path || Deno.cwd();

// Validate the path
if (!targetPath || targetPath.trim() === '') {
  targetPath = Deno.cwd();
}
```

**Acceptance Criteria:**
- `at init` without arguments initializes in current directory
- `at init .` also works
- `at init /path/to/dir` still works as before

**Estimated Effort:** 30 minutes

---

### FIX-030: Fix Workspace Detection Error Message

**Severity:** Medium
**Files to Modify:**
- `src/cli/commands/challenge.ts`
- `src/cli/commands/hint.ts`
- `src/cli/commands/complete.ts`
- Possibly shared command utilities

**Current Behavior:**
When workspace is not initialized, commands show "Problem not found" (exit code 5)

**Expected Behavior:**
Should show "Workspace not initialized" (exit code 4)

**Root Cause:**
Problem database loads with 0 problems when no workspace exists, causing the wrong error path to execute.

**Implementation:**
```typescript
// Add workspace check before problem operations
export async function requireWorkspace(): Promise<WorkspaceInfo> {
  const workspacePath = await getWorkspacePath();

  if (!workspacePath || !await exists(workspacePath)) {
    throw new WorkspaceError('Workspace not initialized. Run "at init" first.');
  }

  return loadWorkspaceInfo(workspacePath);
}

// In command handlers, check workspace first
try {
  const workspace = await requireWorkspace();
  const problem = await findProblem(slug);
  // ...
} catch (error) {
  if (error instanceof WorkspaceError) {
    return exitWithCode(ExitCode.WORKSPACE_ERROR, error.message);
  }
  // ...
}
```

**Acceptance Criteria:**
- Commands show "Workspace not initialized" when no workspace
- Exit code is 4 (WORKSPACE_ERROR) not 5 (PROBLEM_ERROR)
- Error message guides user to run `at init`

**Estimated Effort:** 1 hour

---

## Priority 2: Exit Code Consistency Fixes

### FIX-012: Fix Workspace Already Initialized Exit Code

**Severity:** Medium
**Files to Modify:** `src/cli/commands/init.ts`

**Current Behavior:**
```bash
at init /existing/workspace  # Shows info message, exits with code 0
```

**Expected Behavior:**
```bash
at init /existing/workspace  # Shows warning, exits with code 3 (CONFIG_ERROR)
```

**Implementation:**
```typescript
// In init command
if (await workspaceExists(targetPath) && !args.force) {
  logInfo(`Workspace already initialized at ${targetPath}`);
  logInfo('Use --force to reinitialize');
  return exitWithCode(ExitCode.CONFIG_ERROR);  // Exit code 3
}
```

**Acceptance Criteria:**
- Returns exit code 3 when workspace already exists (without --force)
- Message still informative but treated as an error condition
- Scripts can detect this condition via exit code

**Estimated Effort:** 30 minutes

---

### FIX-046: Fix Invalid Hint Level Exit Code

**Severity:** Low
**Files to Modify:** `src/cli/commands/hint.ts`

**Current Behavior:**
```bash
at hint --level 99  # Shows error message, exits with code 0
```

**Expected Behavior:**
```bash
at hint --level 99  # Shows error message, exits with code 2 (USAGE_ERROR)
```

**Implementation:**
```typescript
// In hint command validation
const level = parseInt(args.level);
if (isNaN(level) || level < 1 || level > 3) {
  logError('Invalid hint level. Must be 1, 2, or 3');
  return exitWithCode(ExitCode.USAGE_ERROR);  // Exit code 2
}
```

**Acceptance Criteria:**
- Invalid hint levels return exit code 2
- Valid levels are 1, 2, 3 only
- Clear error message about valid range

**Estimated Effort:** 30 minutes

---

### FIX-117: Fix Invalid Environment Variable Exit Code

**Severity:** Low
**Files to Modify:**
- `src/cli/env.ts` or environment loading module
- `src/cli/main.ts` (initialization)

**Current Behavior:**
```bash
AT_LANGUAGE=invalid at list  # Shows warning, continues with exit 0
```

**Expected Behavior:**
```bash
AT_LANGUAGE=invalid at list  # Shows error, exits with code 2 (USAGE_ERROR)
```

**Implementation:**
```typescript
// In environment variable validation
export function validateEnvironmentVariables(): void {
  const language = Deno.env.get('AT_LANGUAGE');

  if (language && !VALID_LANGUAGES.includes(language)) {
    logError(`Invalid AT_LANGUAGE: ${language}`);
    logError(`Valid languages: ${VALID_LANGUAGES.join(', ')}`);
    Deno.exit(ExitCode.USAGE_ERROR);  // Exit code 2
  }

  // Validate other env vars...
}

// Call early in main.ts
validateEnvironmentVariables();
```

**Acceptance Criteria:**
- Invalid environment variables cause immediate exit with code 2
- Clear error message showing valid values
- Validation happens before any command execution

**Estimated Effort:** 45 minutes

---

## Priority 3: Feature Bugs

### FIX-063: Investigate and Fix Tag Filtering

**Severity:** Low
**Files to Modify:**
- `src/cli/commands/list.ts`
- `src/core/problems/manager.ts` (if filtering logic is there)

**Current Behavior:**
```bash
at list -t array  # Shows all 16 problems instead of filtered subset
```

**Expected Behavior:**
```bash
at list -t array  # Shows only problems tagged with "array"
```

**Investigation Steps:**
1. Check if all problems actually have the "array" tag (data issue)
2. Verify tag filtering logic in list command
3. Check if filter is being applied correctly

**Implementation:**
```typescript
// First, verify the data
const problems = await loadProblems();
const arrayProblems = problems.filter(p => p.tags?.includes('array'));
console.log(`Found ${arrayProblems.length} problems with 'array' tag`);

// Fix filtering if needed
export function filterByTag(problems: Problem[], tag: string): Problem[] {
  return problems.filter(problem =>
    problem.tags && problem.tags.includes(tag.toLowerCase())
  );
}

// In list command
if (args.tag) {
  problems = filterByTag(problems, args.tag);
  if (problems.length === 0) {
    logInfo(`No problems found with tag: ${args.tag}`);
  }
}
```

**Acceptance Criteria:**
- Tag filtering returns only problems with specified tag
- Case-insensitive tag matching
- Clear message when no problems match tag
- List available tags if invalid tag provided

**Estimated Effort:** 1 hour (including investigation)

---

## Priority 4: Testing & Validation

### TEST-001: Add Binary Compilation Tests

**Severity:** High (Prevents regression of critical issue)
**Files to Create/Modify:**
- `tests/build/binary_test.ts` (new)
- `.github/workflows/build.yml` (if using CI)

**Purpose:**
Ensure the binary includes all necessary data files and works standalone.

**Test Implementation:**
```typescript
// tests/build/binary_test.ts
Deno.test("Binary includes problem data", async () => {
  // Build the binary
  const buildProcess = await Deno.run({
    cmd: ["deno", "task", "build"],
    stdout: "piped",
    stderr: "piped",
  });

  const status = await buildProcess.status();
  assertEquals(status.success, true);

  // Test binary can list problems
  const listProcess = await Deno.run({
    cmd: ["./bin/at", "list", "--json"],
    stdout: "piped",
  });

  const output = await listProcess.output();
  const problems = JSON.parse(new TextDecoder().decode(output));

  assertNotEquals(problems.length, 0, "Binary should include problem data");
  assert(problems.length > 10, "Should have multiple problems");
});

Deno.test("Binary works without source files", async () => {
  // Create temp directory
  const tempDir = await Deno.makeTempDir();

  // Copy only the binary
  await Deno.copyFile("./bin/at", `${tempDir}/at`);

  // Run from temp directory (no source files)
  const process = await Deno.run({
    cmd: [`${tempDir}/at`, "list"],
    cwd: tempDir,
    stdout: "piped",
  });

  const status = await process.status();
  assertEquals(status.success, true, "Binary should work standalone");
});
```

**Acceptance Criteria:**
- Test verifies binary includes data files
- Test runs in CI/CD pipeline
- Catches regression if build process breaks

**Estimated Effort:** 1.5 hours

---

### TEST-002: Add Exit Code Validation Tests

**Severity:** Medium
**Files to Create/Modify:** `tests/cli/exit_codes_test.ts`

**Test Cases:**
```typescript
// Test workspace already initialized
Deno.test("Init returns code 3 for existing workspace", async () => {
  const tempDir = await Deno.makeTempDir();

  // First init succeeds
  const init1 = await runCommand(["init", tempDir]);
  assertEquals(init1.code, 0);

  // Second init without force fails with code 3
  const init2 = await runCommand(["init", tempDir]);
  assertEquals(init2.code, 3);
});

// Test invalid hint level
Deno.test("Hint returns code 2 for invalid level", async () => {
  const result = await runCommand(["hint", "--level", "99"]);
  assertEquals(result.code, 2);
});

// Test invalid environment variable
Deno.test("Invalid env var causes exit code 2", async () => {
  const result = await runCommand([], {
    env: { AT_LANGUAGE: "invalid-lang" }
  });
  assertEquals(result.code, 2);
});
```

**Estimated Effort:** 1 hour

---

### TEST-003: Update Manual QA Test Suite

**Severity:** Low
**Files to Modify:** Manual QA test documentation

**Updates Required:**
1. Add test case for `at init` without arguments
2. Update expected exit codes in test cases
3. Add regression tests for fixed issues
4. Document the binary build verification process

**New Test Cases to Add:**
- TC-010a: Init in current directory without argument
- TC-BINARY-001: Verify binary includes data files
- TC-EXIT-001: Verify all error exit codes

**Estimated Effort:** 1 hour

---

## Implementation Checklist

Track progress as tasks are completed:

### Critical Priority
- [ ] **FIX-001**: Fix binary compilation to include data files

### High Priority
- [ ] **FIX-010**: Allow init without path argument
- [ ] **FIX-030**: Fix workspace detection error message

### Medium Priority
- [ ] **FIX-012**: Fix workspace already initialized exit code
- [ ] **FIX-046**: Fix invalid hint level exit code
- [ ] **FIX-117**: Fix invalid environment variable exit code

### Low Priority
- [ ] **FIX-063**: Investigate and fix tag filtering

### Testing
- [ ] **TEST-001**: Add binary compilation tests
- [ ] **TEST-002**: Add exit code validation tests
- [ ] **TEST-003**: Update manual QA test suite

---

## Implementation Order Recommendation

**Day 1: Critical Fix (2-3 hours)**
1. FIX-001: Binary compilation (MUST fix first)
2. TEST-001: Binary tests (prevent regression)

**Day 2: Core Functionality (2-3 hours)**
1. FIX-010: Init without path
2. FIX-030: Workspace detection
3. Quick smoke test of both fixes

**Day 3: Exit Codes (2 hours)**
1. FIX-012: Already initialized exit code
2. FIX-046: Invalid hint level exit code
3. FIX-117: Invalid env var exit code
4. TEST-002: Exit code tests

**Day 4: Feature Investigation (1-2 hours)**
1. FIX-063: Tag filtering investigation and fix
2. TEST-003: Update QA suite
3. Full regression test

---

## Testing Strategy

### Local Testing Commands

```bash
# Test binary compilation fix
deno task build
./bin/at list  # Should show problems
./bin/at challenge easy  # Should work

# Test init without path
./bin/at init  # Should work in current directory

# Test exit codes
./bin/at init /tmp/test && ./bin/at init /tmp/test
echo $?  # Should be 3

AT_LANGUAGE=invalid ./bin/at list
echo $?  # Should be 2

# Test workspace detection
rm -rf ~/.config/algo-trainer
./bin/at challenge easy  # Should show "Workspace not initialized"
```

### Automated Test Suite

Run after each fix:
```bash
deno test tests/cli/  # Unit tests
deno test tests/build/  # Binary tests
deno test tests/integration/  # Integration tests
```

---

## Success Criteria

All fixes are considered complete when:

1. **Binary Works Standalone**
   - Can be distributed without source files
   - All commands function correctly
   - No "No problems found" errors

2. **Exit Codes Are Consistent**
   - All error conditions return appropriate non-zero codes
   - Scripts can reliably detect error conditions
   - Matches documented exit code schema

3. **User Experience Improved**
   - Clear error messages guide users
   - Init works intuitively in current directory
   - No confusing "Problem not found" when workspace missing

4. **All Tests Pass**
   - Existing tests still pass
   - New tests verify fixes
   - No regressions introduced

---

## Risk Mitigation

**Potential Risks:**

1. **Binary Size**: Including data files might increase binary size
   - Monitor binary size before/after
   - Consider compression if needed

2. **Breaking Changes**: Exit code changes might break existing scripts
   - Document changes clearly
   - Consider adding a migration guide

3. **Performance**: Data embedding might affect startup time
   - Profile before/after changes
   - Optimize if necessary

---

## Total Estimated Effort

| Category | Tasks | Estimated Time |
|----------|-------|----------------|
| Critical Fix | 1 | 2-3 hours |
| High Priority | 2 | 1.5 hours |
| Medium Priority | 3 | 1.75 hours |
| Low Priority | 1 | 1 hour |
| Testing | 3 | 3.5 hours |
| **Total** | **10** | **9.75-10.75 hours** |

This can be completed in approximately 2-3 days of focused work, with the critical binary fix being the absolute top priority.

---

## Notes for Implementers

### Key Files to Review First
- `deno.json` - Build configuration
- `src/data/loader.ts` - How problems are loaded
- `src/cli/commands/*.ts` - Command implementations
- `src/cli/exit-codes.ts` - Exit code definitions (if exists)

### Testing Each Fix
After implementing each fix, verify:
1. The specific issue is resolved
2. No other functionality is broken
3. Tests pass
4. Exit codes are correct

### Communication
- Update this document as tasks are completed
- Note any discoveries or complications
- Create issues for any new bugs found

---

## Post-Implementation Actions

Once all fixes are complete:

1. **Update Documentation**
   - Update README with build instructions
   - Document all exit codes
   - Update CLI help text if needed

2. **Create Release Notes**
   - List all fixed issues
   - Note any breaking changes
   - Thank QA team for thorough testing

3. **Tag New Version**
   - Increment version appropriately
   - Create GitHub release
   - Build and attach binary to release

4. **Notify Users**
   - Announce fixes
   - Provide migration guide if needed
   - Request feedback on fixes