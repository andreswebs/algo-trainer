# Test Runner Feature

## Overview

Add the ability to run and validate student solutions against problem test cases. Currently, the app only scaffolds files and tracks progress—students must manually compile/run their code and verify correctness externally (e.g., on LeetCode itself).

## Current State

- **No execution capability** - No `Deno.Command` or subprocess usage in codebase
- **Test files are scaffolds** - Generated `solution_test.cpp` etc. are templates for students to fill in
- **Structured test data exists** - Problem JSON files already contain `examples` with structured `input`/`output`:

```json
{
  "input": { "nums": [2, 7, 11, 15], "target": 9 },
  "output": [0, 1],
  "explanation": "Because nums[0] + nums[1] == 9, we return [0, 1]."
}
```

## Proposed Commands

### Option A: Single `run` command
```bash
at run [slug]              # Run solution against example test cases
at run [slug] --all        # Run against all test cases (if we have more than examples)
at run [slug] --verbose    # Show input/output details for each case
```

### Option B: Separate `run` and `test` commands
```bash
at run [slug]              # Run solution once (for debugging/manual input)
at test [slug]             # Run against test cases with pass/fail reporting
```

### Option C: Integrated into existing commands
```bash
at challenge [slug] --run  # Generate files and run immediately
at complete [slug] --verify # Verify solution passes before marking complete
```

## Execution Models

### Model 1: Generate + Execute Harness

Generate a temporary test harness file that:
1. Imports/includes the student's solution
2. Iterates through test cases from problem JSON
3. Compares outputs and reports results

**Pros:** Full control over test execution, consistent output format
**Cons:** Complex template generation per language, must handle language quirks

### Model 2: Direct Execution (TS/JS only)

For TypeScript/JavaScript, dynamically import the solution module in Deno:

```typescript
const solution = await import(solutionPath);
const result = solution.twoSum(nums, target);
assertEqual(result, expected);
```

For other languages, fall back to Model 1 or require external toolchain.

**Pros:** Simple for TS/JS (our primary use case?), fast iteration
**Cons:** Two different code paths, limited language support

### Model 3: Language Server / REPL Approach

Start a persistent REPL process per language and send commands:

```
> load solution.py
> twoSum([2,7,11,15], 9)
[0, 1]
```

**Pros:** Fast repeated runs, interactive debugging potential
**Cons:** Complex setup, state management issues

## Language-Specific Requirements

| Language   | Toolchain       | Compile Command              | Run Command                |
|------------|-----------------|------------------------------|----------------------------|
| TypeScript | Deno            | N/A                          | `deno run solution.ts`     |
| JavaScript | Deno/Node       | N/A                          | `deno run solution.js`     |
| Python     | python3         | N/A                          | `python3 solution.py`      |
| C++        | g++/clang++     | `g++ -o solution solution.cpp` | `./solution`             |
| Java       | javac/java      | `javac Solution.java`        | `java Solution`            |
| Rust       | rustc/cargo     | `rustc solution.rs`          | `./solution`               |
| Go         | go              | `go build solution.go`       | `./solution`               |

### Toolchain Detection

Need to detect available toolchains and provide helpful errors:

```
Error: C++ compiler not found.
Install with: apt install g++ (Linux) / brew install gcc (macOS)
```

Consider: `at doctor` command to check all toolchain availability.

## Test Case Handling

### Input Serialization

Problem inputs are JSON objects with named parameters:
```json
{ "nums": [2, 7, 11, 15], "target": 9 }
```

Need to map these to function arguments in order. Options:
- Store parameter order in problem metadata
- Parse function signature from solution file
- Use conventions (alphabetical, declaration order)

### Output Comparison

Different comparison strategies needed:

| Type | Strategy |
|------|----------|
| Primitives | Exact match |
| Arrays (ordered) | Element-wise comparison |
| Arrays (unordered) | Sort then compare, or set equality |
| Floating point | Tolerance-based (1e-6) |
| Objects | Deep equality |

Some problems explicitly allow multiple valid answers (e.g., "return any valid path"). Need metadata flag:
```json
{
  "outputMode": "exact" | "unordered" | "anyValid"
}
```

### Edge Cases

- **Multiple valid outputs** - Some problems accept different correct answers
- **Order doesn't matter** - `[0,1]` and `[1,0]` both valid for Two Sum
- **Floating point precision** - Need configurable epsilon
- **Large outputs** - Truncate display, still validate

## Safety & Resource Limits

### Timeout
```typescript
const TIMEOUT_MS = 10_000; // 10 seconds default
// Kill process if exceeds timeout
```

### Memory Limits
- May need `ulimit` or container-based isolation
- Could be overkill for local practice tool

### Infinite Loop Protection
- Timeout handles this
- Consider: instruction count limits for interpreted languages

## Output Format

```
$ at run two-sum

Running two-sum (C++)...
Compiling: g++ -O2 -o solution solution.cpp
Compiled successfully.

Test 1/3: PASS (2ms)
  Input:  nums=[2,7,11,15], target=9
  Output: [0,1]

Test 2/3: PASS (1ms)
  Input:  nums=[3,2,4], target=6
  Output: [1,2]

Test 3/3: FAIL (1ms)
  Input:  nums=[3,3], target=6
  Expected: [0,1]
  Got:      [1,0]  // unless unordered comparison enabled

Results: 2/3 passed
```

## Architecture Considerations

### New Files
```
src/
├── cli/commands/run.ts       # New command
├── core/
│   ├── runner/
│   │   ├── mod.ts            # Public API
│   │   ├── types.ts          # RunResult, TestCase, etc.
│   │   ├── executor.ts       # Process execution wrapper
│   │   ├── harness.ts        # Test harness generation
│   │   ├── comparison.ts     # Output comparison logic
│   │   └── languages/        # Language-specific handlers
│   │       ├── typescript.ts
│   │       ├── python.ts
│   │       ├── cpp.ts
│   │       └── ...
```

### Integration Points

- `ProblemManager` - Access problem test cases
- `WorkspaceManager` - Locate solution files
- `ConfigManager` - Timeout settings, preferred toolchains
- Templates - May need to adjust generated code to be importable/callable

## Open Questions

1. **Should we validate solutions before marking complete?**
   - `at complete` could require passing tests, or just warn

2. **How to handle function signatures?**
   - LeetCode uses class-based `Solution` with specific method names
   - Need to know method name and parameter order

3. **Do we support custom test cases?**
   - Let students add their own test cases to a file
   - `at run --custom tests.json`

4. **What about problems requiring data structures?**
   - Linked lists, trees, graphs need serialization/deserialization
   - LeetCode uses specific formats: `[1,2,3]` for linked list, `[1,null,2,3]` for tree

5. **Interactive problems?**
   - Some LeetCode problems are interactive (guessing games, etc.)
   - Probably out of scope initially

6. **Performance benchmarking?**
   - Show execution time, compare to expected complexity
   - `at run --bench` to run multiple iterations

## MVP Scope

For initial implementation, consider:

1. **TypeScript/JavaScript only** - Direct Deno execution, no toolchain complexity
2. **Example test cases only** - Use existing `problem.examples` data
3. **Exact output matching** - Simple comparison, add modes later
4. **Basic timeout** - 10 second default
5. **Single `at run` command** - Keep it simple

Then iterate to add:
- More languages (Python next, then compiled)
- Unordered comparison modes
- Custom test cases
- Performance metrics

## References

- Current problem types: `src/types/global.ts`
- Problem data: `src/data/problems/*.json`
- Template system: `src/core/problem/templates.ts`
- Workspace file paths: `src/core/workspace/files.ts`
