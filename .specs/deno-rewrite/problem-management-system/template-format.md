# Template Format Specification (PMS-009)

This document defines the template format, directory layout, and placeholder vocabulary
for the Algo Trainer problem template system.

## Directory Layout

Templates are organized by language and style in the following structure:

```
src/data/templates/
├── typescript/
│   ├── minimal/
│   │   ├── solution.tpl
│   │   ├── test.tpl
│   │   └── readme.tpl
│   ├── documented/
│   │   ├── solution.tpl
│   │   ├── test.tpl
│   │   └── readme.tpl
│   └── comprehensive/
│       ├── solution.tpl
│       ├── test.tpl
│       └── readme.tpl
├── javascript/
│   └── ... (same structure)
├── python/
│   └── ...
├── java/
│   └── ...
├── cpp/
│   └── ...
├── rust/
│   └── ...
└── go/
    └── ...
```

### Path Resolution

Template path format: `<baseDir>/<language>/<style>/<kind>.tpl`

- `baseDir`: Base templates directory (e.g., `src/data/templates`)
- `language`: One of `SupportedLanguage` values
- `style`: One of `minimal`, `documented`, `comprehensive`
- `kind`: One of `solution`, `test`, `readme`

Example: `src/data/templates/typescript/documented/solution.tpl`

### Style Mapping

The `UserPreferences.templateStyle` configuration value maps directly to the `<style>` directory:

| `templateStyle` Value | Template Directory          |
| --------------------- | --------------------------- |
| `minimal`             | `<language>/minimal/`       |
| `documented`          | `<language>/documented/`    |
| `comprehensive`       | `<language>/comprehensive/` |

## Template Syntax

Templates use double curly braces for placeholders:

```
{{PLACEHOLDER_NAME}}
```

### Delimiter Specification

- **Open delimiter**: `{{`
- **Close delimiter**: `}}`
- **Placeholder names**: UPPER_SNAKE_CASE

Placeholders are replaced verbatim with their computed values. Unknown placeholders
cause an error by default (configurable via `strictPlaceholders` option).

## Placeholder Reference

### Problem Data Placeholders

| Placeholder               | Description                                     | Source                |
| ------------------------- | ----------------------------------------------- | --------------------- |
| `{{PROBLEM_TITLE}}`       | Human-readable title                            | `problem.title`       |
| `{{PROBLEM_SLUG}}`        | URL-friendly slug (kebab-case)                  | `problem.slug`        |
| `{{PROBLEM_ID}}`          | Unique problem identifier                       | `problem.id`          |
| `{{PROBLEM_DIFFICULTY}}`  | Difficulty level (easy, medium, hard)           | `problem.difficulty`  |
| `{{PROBLEM_DESCRIPTION}}` | Full problem description (may contain markdown) | `problem.description` |

### Problem Content Placeholders

| Placeholder       | Description                          | Source                | Formatting                     |
| ----------------- | ------------------------------------ | --------------------- | ------------------------------ |
| `{{EXAMPLES}}`    | Formatted examples with input/output | `problem.examples`    | Multi-line, language-aware     |
| `{{CONSTRAINTS}}` | List of constraints                  | `problem.constraints` | Bullet list                    |
| `{{HINTS}}`       | List of hints                        | `problem.hints`       | Numbered list (for README)     |
| `{{TAGS}}`        | Comma-separated list of tags         | `problem.tags`        | Comma-separated                |
| `{{COMPANIES}}`   | Comma-separated list of companies    | `problem.companies`   | Comma-separated, empty if none |

### Template Context Placeholders

| Placeholder            | Description                     | Example      |
| ---------------------- | ------------------------------- | ------------ |
| `{{LANGUAGE}}`         | Target programming language     | `typescript` |
| `{{LANGUAGE_DISPLAY}}` | Display name of the language    | `TypeScript` |
| `{{TEMPLATE_STYLE}}`   | Template style being used       | `documented` |
| `{{FILE_EXTENSION}}`   | File extension for the language | `.ts`        |

### Code Generation Placeholders

| Placeholder         | Description             | Derivation              |
| ------------------- | ----------------------- | ----------------------- |
| `{{FUNCTION_NAME}}` | Generated function name | camelCase from slug     |
| `{{CLASS_NAME}}`    | Generated class name    | PascalCase from slug    |
| `{{DATE}}`          | Current date            | ISO format (YYYY-MM-DD) |
| `{{YEAR}}`          | Current year            | Four-digit year         |

### URL Placeholders

| Placeholder        | Description          | Note                          |
| ------------------ | -------------------- | ----------------------------- |
| `{{LEETCODE_URL}}` | LeetCode problem URL | Empty string if not available |

## Placeholder Formatting Details

### `{{EXAMPLES}}` Formatting

For solution and test files, examples are formatted for the target language.

**In test files (TypeScript example):**

```typescript
it('should return [0, 1] for nums=[2,7,11,15], target=9', () => {
  assertEquals(twoSum([2, 7, 11, 15], 9), [0, 1]);
});
```

**In README files:**

```markdown
### Example 1

**Input:** nums = [2,7,11,15], target = 9
**Output:** [0, 1]
**Explanation:** Because nums[0] + nums[1] == 9, we return [0, 1].
```

### `{{CONSTRAINTS}}` Formatting

Rendered as a markdown bullet list:

```markdown
- 2 <= nums.length <= 10^4
- -10^9 <= nums[i] <= 10^9
- -10^9 <= target <= 10^9
- Only one valid answer exists.
```

### `{{HINTS}}` Formatting

Rendered as a numbered/expandable list:

```markdown
1. A brute force approach would check every pair of numbers. Can you do better?
2. Think about what information you need to store as you iterate through the array.
3. Use a hash map to store numbers you've seen and their indices.
```

### `{{FUNCTION_NAME}}` and `{{CLASS_NAME}}` Derivation

From slug `two-sum`:

- `{{FUNCTION_NAME}}` → `twoSum`
- `{{CLASS_NAME}}` → `TwoSum`

Conversion rules:

1. Split by hyphens
2. For function name: First part lowercase, rest capitalized (camelCase)
3. For class name: All parts capitalized (PascalCase)

## Template File Content Guidelines

### Solution Templates

- Include appropriate file/function documentation
- Provide type annotations where applicable
- Include TODO markers for implementation
- Throw "Not implemented" error as placeholder

### Test Templates

- Import the solution function
- Provide test structure matching language conventions
- Include examples as initial test cases
- Leave room for edge cases and additional tests

### README Templates

- Include problem metadata (difficulty, tags, companies)
- Include full problem description
- Include formatted examples and constraints
- Provide sections for solution approach and notes

## Style Differences

### Minimal

- Bare minimum to start solving
- No documentation beyond the title
- No extra structure

### Documented

- Full function/file documentation
- TODO markers with guidance
- Balanced verbosity

### Comprehensive

- Extensive documentation and structure
- Multiple solution approaches
- Complexity analysis sections
- Reflection and learning sections

## Example: Rendered Output

Given problem `two-sum` with:

- Title: "Two Sum"
- Difficulty: "easy"
- Slug: "two-sum"

The `documented` style solution template renders to:

```typescript
/**
 * Two Sum
 *
 * Difficulty: easy
 * Tags: array, hash-table
 *
 * Given an array of integers `nums` and an integer `target`, return indices
 * of the two numbers such that they add up to `target`.
 *
 * @see https://leetcode.com/problems/two-sum/
 * @date 2026-01-12
 */

/**
 * Solution for Two Sum
 *
 * ## Approach
 * TODO: Describe your approach here
 *
 * ## Complexity
 * - Time: O(?)
 * - Space: O(?)
 *
 * @param args - Input parameters
 * @returns The result
 */
export function twoSum(...args: unknown[]): unknown {
  // TODO: Implement your solution here
  throw new Error('Not implemented');
}
```

## Type Definitions

Template types are defined in `src/core/problem/types.ts`:

- `TemplateKind` - Type of template file (`solution`, `test`, `readme`)
- `TemplateStyle` - Style alias from `UserPreferences.templateStyle`
- `TemplatePlaceholder` - Valid placeholder names
- `LanguageConfig` - Language-specific configuration
- `TemplateContext` - Data available during rendering
- `TemplateRenderOptions` - Rendering configuration
- `TemplateRenderResult` - Rendering output

## Error Handling

The template system uses `TemplateError` from `src/utils/errors.ts` for:

- Template file not found
- Unknown placeholder (when `strictPlaceholders: true`)
- Invalid template syntax

Error context includes:

- Template path
- Language and style
- Problematic placeholder (if applicable)

## Related Tasks

- **PMS-010**: Template renderer implementation
- **PMS-011**: Language template packs
- **PMS-012**: Template tests
