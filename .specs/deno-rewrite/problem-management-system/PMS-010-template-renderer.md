# PMS-010: Template Renderer Implementation

**Status**: ✅ Complete
**Depends on**: PMS-009
**Related files**:

- `src/core/problem/templates.ts` (main implementation)
- `test/core/problem/templates.test.ts` (unit tests)
- `test/core/problem/templates.integration.test.ts` (integration tests)

## Overview

This task implements the template rendering system that processes template files with placeholder substitution to generate problem-specific code files (solution, test, README).

## Implementation Details

### Core Components

#### 1. Template Path Resolution (`resolveTemplatePath`)

Resolves template file paths based on language, style, and kind:

```typescript
const path = await resolveTemplatePath('typescript', 'minimal', 'solution');
// Returns: /path/to/src/data/templates/typescript/minimal/solution.tpl
```

**Features**:

- Validates template file existence
- Throws `TemplateError` if template not found
- Supports all languages: `typescript`, `javascript`, `python`, `java`, `cpp`, `rust`, `go`
- Supports all styles: `minimal`, `documented`, `comprehensive`
- Supports all kinds: `solution`, `test`, `readme`

#### 2. Placeholder System

**Supported Placeholders**:

| Placeholder               | Description                                                | Example                    |
| ------------------------- | ---------------------------------------------------------- | -------------------------- |
| `{{PROBLEM_TITLE}}`       | Problem title                                              | "Two Sum"                  |
| `{{PROBLEM_SLUG}}`        | URL-friendly slug                                          | "two-sum"                  |
| `{{PROBLEM_ID}}`          | Unique identifier                                          | "test-001"                 |
| `{{PROBLEM_DIFFICULTY}}`  | Capitalized difficulty                                     | "Easy"                     |
| `{{PROBLEM_DESCRIPTION}}` | Full problem description                                   | "Given an array..."        |
| `{{EXAMPLES}}`            | Formatted examples                                         | "Example 1:\nInput:..."    |
| `{{CONSTRAINTS}}`         | Bulleted constraint list                                   | "- 2 <= nums.length..."    |
| `{{HINTS}}`               | Numbered hint list                                         | "1. Use a hash map..."     |
| `{{TAGS}}`                | Comma-separated tags                                       | "array, hash-table"        |
| `{{COMPANIES}}`           | Comma-separated companies                                  | "Amazon, Google"           |
| `{{LANGUAGE}}`            | Programming language                                       | "typescript"               |
| `{{TEMPLATE_STYLE}}`      | Template style                                             | "minimal"                  |
| `{{LEETCODE_URL}}`        | LeetCode URL or "N/A"                                      | "https://leetcode.com/..." |
| `{{DATE}}`                | Current date (YYYY-MM-DD)                                  | "2025-01-14"               |
| `{{FUNCTION_NAME}}`       | Camelized slug                                             | "twoSum"                   |
| `{{CLASS_NAME}}`          | PascalCased class name derived from the problem slug/title | "TwoSum"                   |

**Placeholder Replacement**:

- Unknown placeholders throw `TemplateError` by default
- Can optionally allow unknown placeholders with `allowUnknown` flag
- All placeholders use `{{UPPERCASE_NAME}}` format
- Case-sensitive matching

#### 3. Formatting Helpers

**`formatExamples(problem)`**:

```
Example 1:
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].

Example 2:
Input: nums = [3,2,4], target = 6
Output: [1,2]
```

**`formatConstraints(constraints)`**:

```
- 2 <= nums.length <= 10^4
- -10^9 <= nums[i] <= 10^9
- Only one valid answer exists.
```

**`formatHints(hints)`**:

```
1. Use a hash map to store values you have seen.
2. For each element, check if target - element exists in the map.
```

**`formatTags(tags)`**:

```
array, hash-table, two-pointers
```

**`formatCompanies(companies)`**:

```
Amazon, Google, Microsoft
```

All formatters handle empty/missing data gracefully with appropriate fallback messages.

#### 4. Function Name Generation (`slugToFunctionName`)

Converts kebab-case slugs to camelCase function names:

```typescript
slugToFunctionName('two-sum'); // 'twoSum'
slugToFunctionName('reverse-linked-list'); // 'reverseLinkedList'
slugToFunctionName('3sum'); // 'threeSum'
slugToFunctionName('4sum-ii'); // 'fourSumIi'
```

**Features**:

- Converts leading digits to words (3 → "three")
- Properly camelCases multi-word slugs
- Handles single-word slugs
- Handles slugs with numbers anywhere in the string

#### 5. Main Rendering Functions

**`renderTemplate(context, kind)`**:

Renders a single template file:

```typescript
const context: TemplateContext = {
  problem: myProblem,
  config: {
    language: 'typescript',
    style: 'minimal',
    includeImports: true,
    includeTypes: true,
    includeExample: false,
  },
};

const solutionCode = await renderTemplate(context, 'solution');
```

**`renderAllTemplates(context)`**:

Convenience function to render all three template types in parallel:

```typescript
const { solution, test, readme } = await renderAllTemplates(context);
```

### Error Handling

All functions use `TemplateError` with `createErrorContext()` for consistent error reporting:

```typescript
throw new TemplateError(
  'Template file not found: solution.tpl',
  createErrorContext('resolveTemplatePath', {
    language: 'typescript',
    style: 'minimal',
    kind: 'solution',
    expectedPath: '/path/to/template.tpl',
  }),
);
```

**Error Scenarios**:

- Template file not found
- Unknown placeholders in template
- File read errors
- Invalid template syntax

### Custom Placeholders

Support for runtime-defined placeholders:

```typescript
const context: TemplateContext = {
  problem: myProblem,
  config: myConfig,
  customPlaceholders: {
    CUSTOM_VALUE: 'my-custom-value',
    AUTHOR: 'John Doe',
  },
};
```

Custom placeholders override default values if there's a conflict.

## Testing

### Unit Tests (`templates.test.ts`)

**Coverage**:

- ✅ `slugToFunctionName` - various slug formats, edge cases
- ✅ `formatExamples` - single/multiple examples, with/without explanations
- ✅ `formatConstraints` - normal and empty cases
- ✅ `formatHints` - normal and empty cases
- ✅ `formatTags` - normal and empty cases
- ✅ `formatCompanies` - normal, empty, and undefined cases
- ✅ `replacePlaceholders` - replacement, multiple occurrences, unknown handling
- ✅ Error handling for missing templates
- ✅ Placeholder value generation with minimal data

### Integration Tests (`templates.integration.test.ts`)

**Coverage**:

- ✅ Template path resolution for actual template files
- ✅ Rendering with real TypeScript/Python/etc. templates
- ✅ All three template kinds (solution, test, readme)
- ✅ All supported languages (7 languages × 3 styles)
- ✅ Placeholder verification in rendered output
- ✅ Handling of problems with missing optional fields
- ✅ Custom placeholder overrides

**Test Execution**:

```bash
deno test test/core/problem/templates.test.ts
deno test test/core/problem/templates.integration.test.ts
```

## Usage Examples

### Basic Usage

```typescript
import { renderTemplate, type TemplateContext } from '@/core/problem/templates.ts';

const context: TemplateContext = {
  problem: {
    id: 'two-sum-001',
    slug: 'two-sum',
    title: 'Two Sum',
    difficulty: 'easy',
    description: 'Given an array...',
    examples: [...],
    constraints: [...],
    hints: [...],
    tags: ['array', 'hash-table'],
  },
  config: {
    language: 'typescript',
    style: 'documented',
    includeImports: true,
    includeTypes: true,
    includeExample: true,
  },
};

const solution = await renderTemplate(context, 'solution');
const test = await renderTemplate(context, 'test');
const readme = await renderTemplate(context, 'readme');
```

### Render All Templates

```typescript
import { renderAllTemplates } from '@/core/problem/templates.ts';

const { solution, test, readme } = await renderAllTemplates(context);

// Write to files
await Deno.writeTextFile('solution.ts', solution);
await Deno.writeTextFile('solution.test.ts', test);
await Deno.writeTextFile('README.md', readme);
```

### Path Resolution Only

```typescript
import { resolveTemplatePath } from '@/core/problem/templates.ts';

const path = await resolveTemplatePath('python', 'comprehensive', 'solution');
const content = await Deno.readTextFile(path);
```

### Custom Placeholders

```typescript
const context: TemplateContext = {
  problem: myProblem,
  config: myConfig,
  customPlaceholders: {
    AUTHOR: 'Jane Smith',
    VERSION: '1.0.0',
    COPYRIGHT: '2025',
  },
};

const rendered = await renderTemplate(context, 'solution');
```

## Integration with PMS-015 (Workspace File Generation)

The template renderer is designed to be consumed by `PMS-015` workspace file generation:

```typescript
// In workspace manager (PMS-015)
import { renderAllTemplates } from '@/core/problem/templates.ts';
import { getById } from '@/core/problem/manager.ts';

async function generateProblemFiles(problemId: string, config: TemplateConfig) {
  const problem = await getById(problemId);
  if (!problem) throw new Error('Problem not found');

  const context = { problem, config };
  const { solution, test, readme } = await renderAllTemplates(context);

  // Write to workspace (PMS-015 responsibility)
  // ...
}
```

## Performance Considerations

- Template path resolution is async and validates file existence
- All template rendering is deterministic
- `renderAllTemplates` uses `Promise.all` for parallel rendering
- Template files are read on each render (no caching in Phase 2)
- Placeholder replacement uses `String.prototype.replaceAll` for efficiency

## Future Enhancements (Post-Phase 2)

1. **Template Caching**: Cache parsed templates in memory
2. **Additional Placeholders**: Support for more dynamic content
3. **Template Validation**: Pre-validate templates on startup
4. **Custom Template Directories**: Support user-provided template directories
5. **Template Inheritance**: Base templates with language-specific overrides
6. **Conditional Blocks**: Support for conditional template sections

## API Documentation

All public functions are fully documented with JSDoc comments including:

- Purpose and behavior
- Parameter descriptions with types
- Return value documentation
- Error conditions with `@throws` tags
- Usage examples with `@example` tags

See `src/core/problem/templates.ts` for complete API documentation.

## Checklist

- ✅ Template path resolution implemented
- ✅ Placeholder replacement system implemented
- ✅ All formatting helpers implemented
- ✅ Main rendering functions implemented
- ✅ Error handling with `TemplateError`
- ✅ Custom placeholder support
- ✅ Comprehensive unit tests
- ✅ Integration tests with real templates
- ✅ JSDoc documentation
- ✅ Exported from `src/core/problem/mod.ts`
- ✅ Ready for consumption by PMS-015

## Definition of Done

✅ **All subtasks completed**:

- ✅ Resolve correct template path for `(language, style, kind)` tuple
- ✅ Implement placeholder replacement
- ✅ Implement formatting helpers (bullet lists, examples, etc.)
- ✅ Handle unknown placeholders (error by default)
- ✅ Error handling with `TemplateError` and `createErrorContext()`

✅ **Quality standards met**:

- ✅ Renderer behavior is deterministic
- ✅ Unit tests cover all formatting functions
- ✅ Integration tests verify real template rendering
- ✅ All tests pass reliably
- ✅ Documentation complete

PMS-010 is complete and ready for integration with PMS-015 (workspace file generation).
