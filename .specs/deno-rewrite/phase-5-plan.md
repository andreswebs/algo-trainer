# Phase 5: Testing, Documentation & Polish - Implementation Plan

## Executive Summary

Phase 5 focuses on final polish before release. Testing coverage is already excellent (39 test files, 303+ tests, 100% pass rate), so the testing effort is minimal. Documentation exists but is scattered - the goal is consolidation, not creation. The main work is output polish and consistency.

**Estimated Effort:** 10-15 hours total

---

## Current State Assessment

### Testing: Already Solid ✅

| Category     | Files  | Tests    | Status        |
| ------------ | ------ | -------- | ------------- |
| CLI Commands | 9      | 170+     | ✅ Complete   |
| Core Systems | 6      | 50+      | ✅ Complete   |
| AI Teaching  | 6      | 40+      | ✅ Complete   |
| Templates    | 3      | 20+      | ✅ Complete   |
| Workspace    | 3      | 15+      | ✅ Complete   |
| **Total**    | **39** | **303+** | **100% pass** |

**Gaps to Address:**

- Performance benchmarks (startup time <500ms target)
- Code coverage metrics (aim for 90%+)

### Documentation: Scattered but Comprehensive

**Existing Locations:**

1. `.specs/deno-rewrite/` - 15+ spec documents
2. `docs/` - 4 user-facing guides
3. `.serena/memories/` - 6 project context files
4. `README.md`, `AGENTS.md` - root documentation
5. Code comments (TSDoc) in `src/`

**Goal:** Consolidate and organize, not write new content.

### Polish: Several Consistency Issues

**Primary Issues:**

1. Mixed `console.*` vs output utilities usage
2. Some error messages not actionable
3. Display formatting inconsistencies
4. 3 active TODOs in source code

---

## Task Breakdown

### PHASE5-010: Output Consistency Audit

**Priority:** High
**Effort:** 3-4 hours

Consolidate all console output to use `src/utils/output.ts` utilities.

**Files with Direct Console Usage:**

| File                         | Lines         | Issue                     |
| ---------------------------- | ------------- | ------------------------- |
| `src/main.ts`                | 9             | `console.error(error)`    |
| `src/cli/env.ts`             | 144, 154, 166 | `console.warn()`          |
| `src/cli/commands/list.ts`   | 188, 200, 209 | Mixed console.log/error   |
| `src/cli/commands/config.ts` | 188-211       | 20+ console.error() calls |
| `src/cli/commands/teach.ts`  | 174-179       | `console.log()`           |
| `src/cli/commands/hint.ts`   | 68-70, 91+    | `console.log()`           |
| `src/core/ai/triggers.ts`    | 59, 66, 74    | `console.warn()`          |

**Actions:**

- [ ] Replace `console.log()` with `logInfo()` or `outputData()`
- [ ] Replace `console.error()` for display with `logInfo()` (stderr)
- [ ] Replace `console.warn()` with `logWarning()`
- [ ] Replace `console.error()` for errors with `logError()`
- [ ] Verify quiet mode suppresses info/progress
- [ ] Verify verbose mode enables debug output

**Validation:** Run test suite, manually test `--quiet` and `--verbose` flags.

---

### PHASE5-020: Error Message Enhancement

**Priority:** High
**Effort:** 2-3 hours

Make error messages actionable with fix suggestions.

**Issues Found:**

| File                         | Line    | Issue                                           |
| ---------------------------- | ------- | ----------------------------------------------- |
| `src/cli/commands/config.ts` | 100-109 | Uses generic `Error()` instead of `ConfigError` |
| Various                      | -       | Missing "how to fix" suggestions                |
| `src/core/ai/triggers.ts`    | 59+     | Warnings lack context                           |

**Actions:**

- [ ] Replace generic `Error()` with typed errors (`ConfigError`, `ValidationError`, etc.)
- [ ] Add actionable suggestions to common errors:
  - "Workspace not initialized" → "Run 'algo-trainer init [path]' to create a workspace"
  - "Problem not found" → "Use 'algo-trainer list' to see available problems"
  - "Invalid configuration value" → Show valid options
- [ ] Add context objects to error constructors
- [ ] Review AI trigger warnings for clarity

**Pattern to Follow:**

```typescript
// Before
throw new Error(`Invalid theme: ${value}`);

// After
throw new ConfigError(
  `Invalid theme: ${value}. Valid options: light, dark, auto`,
  { key: 'preferences.theme', value, validOptions: ['light', 'dark', 'auto'] },
);
```

---

### PHASE5-030: Display Formatting Consistency

**Priority:** Medium
**Effort:** 2 hours

Use display utilities instead of hardcoded formatting.

**Issues:**

| File                                 | Issue                                          |
| ------------------------------------ | ---------------------------------------------- |
| `src/cli/commands/config.ts:188-211` | Hardcoded padding: `'  language:            '` |
| `src/cli/commands/hint.ts`           | Hardcoded separator: `'─'.repeat(50)`          |

**Actions:**

- [ ] Use `formatTable()` or `formatKeyValue()` from `src/utils/display.ts`
- [ ] Use consistent box/separator utilities
- [ ] Verify output looks correct at various terminal widths

---

### PHASE5-040: TODO Resolution

**Priority:** Medium
**Effort:** 2-3 hours

Resolve active TODOs or convert to tracked issues.

**Active TODOs:**

| Location                         | ID      | Description                                        |
| -------------------------------- | ------- | -------------------------------------------------- |
| `src/cli/commands/shared.ts:141` | CLI-001 | Implement current problem detection from workspace |
| `src/cli/commands/hint.ts:164`   | CLI-021 | Support problem lookup by ID or auto-detection     |
| `src/core/ai/generator.ts:643`   | ATS-011 | Replace with @std/yaml when integrated             |

**Actions:**

- [ ] Evaluate CLI-001: Is auto-detection needed for v1.0?
- [ ] Evaluate CLI-021: Same question
- [ ] Evaluate ATS-011: Is YAML integration critical?
- [ ] Either implement or document as future enhancement

---

### PHASE5-050: Documentation Organization

**Priority:** Medium
**Effort:** 2-3 hours

**Goal:** Create a documentation index and organize existing docs. Do NOT write new content.

**Existing Documentation Map:**

```
Root Level:
├── README.md              # Project overview, AI workflow
└── AGENTS.md              # Agent instructions, standards

User-Facing (docs/):
├── ENVIRONMENT_VARIABLES.md    # AT_* env var reference
├── INTERACTIVE_PROMPTS.md      # Smart prompts documentation
├── SHELL_COMPLETIONS.md        # Shell setup guides
└── TRIGGER_EVALUATOR.md        # Trigger expression system

Specifications (.specs/deno-rewrite/):
├── plan.md                      # Master implementation plan
├── phase-1.review.md            # Phase 1 completion review
├── ai-teaching-system/
│   └── tasks.md                 # AI system task breakdown
├── problem-management-system/
│   ├── tasks.md                 # PMS task list
│   ├── progress.md              # PMS completion status
│   ├── PMS-001-problem-format.md
│   ├── PMS-010-template-renderer.md
│   └── template-format.md
├── cli/
│   ├── tasks.md                 # CLI tasks
│   └── phase3-integration-guide.md
├── CLI-050-IMPLEMENTATION.md    # Test implementation report
├── deno-cli.research.md         # Deno CLI research
└── node-to-deno-conversion.research.md

Project Context (.serena/memories/):
├── project_overview.md
├── project_structure.md
├── code_style_conventions.md
├── development_guidelines.md
├── tech_stack.md
└── CLI-050-implementation.md
```

**Actions:**

- [ ] Create `docs/INDEX.md` linking all user-facing documentation
- [ ] Create `.specs/deno-rewrite/INDEX.md` linking all spec documents
- [ ] Verify all docs are up-to-date with Phase 4 completion
- [ ] Identify orphaned or duplicate documentation
- [ ] Add cross-references between related documents

---

### PHASE5-060: Testing Enhancements

**Priority:** Low
**Effort:** 2 hours

Testing is solid; these are nice-to-haves.

**Actions:**

- [ ] Add startup time benchmark test (target <500ms)
- [ ] Add code coverage reporting to `deno.json` tasks
- [ ] Document test categories and running subsets

**Optional:**

- [ ] Cross-platform CI setup (if not already present)
- [ ] Performance regression tests

---

### PHASE5-070: Final Review & Release Prep

**Priority:** Low
**Effort:** 1-2 hours

**Actions:**

- [ ] Full test suite pass
- [ ] Manual testing of all commands with various flags
- [ ] Update plan.md to mark Phase 5 complete
- [ ] Update version in config defaults
- [ ] Create CHANGELOG.md (if not exists)

---

## Implementation Order

```
Week 1:
├── PHASE5-010: Output Consistency Audit (3-4h)
├── PHASE5-020: Error Message Enhancement (2-3h)
└── PHASE5-030: Display Formatting (2h)

Week 2:
├── PHASE5-040: TODO Resolution (2-3h)
├── PHASE5-050: Documentation Organization (2-3h)
├── PHASE5-060: Testing Enhancements (2h)
└── PHASE5-070: Final Review (1-2h)
```

---

## Success Criteria

| Metric                          | Target          | Current |
| ------------------------------- | --------------- | ------- |
| Test pass rate                  | 100%            | ✅ 100% |
| Direct console.\* calls in src/ | 0               | ~30+    |
| Actionable error messages       | 100%            | ~70%    |
| Documentation indexed           | Yes             | No      |
| Active TODOs resolved           | 0 or documented | 3       |
| Startup time                    | <500ms          | TBD     |

---

## Files to Modify

**Output Polish:**

- `src/main.ts`
- `src/cli/env.ts`
- `src/cli/commands/list.ts`
- `src/cli/commands/config.ts`
- `src/cli/commands/teach.ts`
- `src/cli/commands/hint.ts`
- `src/core/ai/triggers.ts`

**Error Enhancement:**

- `src/cli/commands/config.ts`
- Various command files

**Documentation:**

- `docs/INDEX.md` (create)
- `.specs/deno-rewrite/INDEX.md` (create)

---

## Notes

- **Do not write new documentation** - organize existing content only
- **Test coverage is sufficient** - focus on polish, not more tests
- **Prioritize user-facing changes** - output and error messages matter most
- **Quick wins first** - output consistency has immediate impact
