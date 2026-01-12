# PMS-001 — On-Disk Problem Format Specification

This document defines the standardized on-disk representation for problems in Algo Trainer.

## File Format

**Format**: JSON

All problem files use JSON format for:
- Easy validation and parsing
- Human readability and editability
- Native TypeScript/Deno support via `JSON.parse()`

No other formats (YAML, TOML, etc.) are supported in Phase 2.

## Directory Layout

### Built-in Problems

```
src/data/problems/
├── two-sum.json
├── add-two-numbers.json
├── longest-substring-without-repeating-characters.json
└── ...
```

**Path pattern**: `src/data/problems/<slug>.json`

### Custom (User) Problems

```
$XDG_DATA_HOME/algo-trainer/problems/
├── my-custom-problem.json
└── ...
```

**Default location**: `~/.local/share/algo-trainer/problems/`

**Path pattern**: `$XDG_DATA_HOME/algo-trainer/problems/<slug>.json`

## Field Definitions

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier (e.g., `"1"`, `"two-sum"`, `"custom-abc123"`) |
| `slug` | `string` | URL-friendly identifier, must be kebab-case (e.g., `"two-sum"`) |
| `title` | `string` | Human-readable title (e.g., `"Two Sum"`) |
| `difficulty` | `"easy" \| "medium" \| "hard"` | Problem difficulty level |
| `description` | `string` | Full problem description (Markdown supported) |
| `examples` | `Example[]` | At least one example required |

### Optional Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `constraints` | `string[]` | `[]` | Problem constraints (e.g., `"2 <= nums.length <= 10^4"`) |
| `hints` | `string[]` | `[]` | Progressive hints for solving |
| `tags` | `string[]` | `[]` | Category tags (e.g., `["array", "hash-table"]`) |
| `companies` | `string[]` | `[]` | Companies known to ask this problem |
| `leetcodeUrl` | `string` | `undefined` | LeetCode problem URL if applicable |
| `createdAt` | `string` | `undefined` | When the problem was created (ISO-8601 format) |
| `updatedAt` | `string` | `undefined` | When the problem was last updated (ISO-8601 format) |
| `metadata` | `ProblemMetadata` | `undefined` | Source metadata (origin information) |

### Example Object Schema

```typescript
interface Example {
  input: Record<string, unknown>;  // Named input parameters
  output: unknown;                  // Expected output
  explanation?: string;             // Optional explanation
}
```

**Input format**: Always an object with named parameters, not positional arguments.

```json
{
  "input": { "nums": [2, 7, 11, 15], "target": 9 },
  "output": [0, 1],
  "explanation": "Because nums[0] + nums[1] == 9, we return [0, 1]."
}
```

### Metadata Object Schema

The `metadata` field contains source-related information about where the problem originated:

```typescript
interface ProblemMetadata {
  source?: string;      // Problem source (e.g., "leetcode", "original")
  sourceId?: string;    // ID from original source
}
```

## Date Encoding

**On-disk format**: ISO-8601 string (e.g., `"2024-01-15T10:30:00.000Z"`)

**In-memory format**: `Date` object

**Parsing expectation**: When loading a problem, date strings in `createdAt` and `updatedAt` must be converted to `Date` objects. Missing dates remain `undefined`.

```json
{
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-06-20T14:45:00.000Z"
}
```

## Naming and Uniqueness Rules

### Slug Requirements

1. **Format**: kebab-case only (lowercase letters, numbers, hyphens)
2. **Pattern**: `/^[a-z0-9]+(-[a-z0-9]+)*$/`
3. **Length**: 1–100 characters
4. **Examples**:
   - ✅ `two-sum`
   - ✅ `add-two-numbers`
   - ✅ `3sum` (numbers allowed)
   - ❌ `Two_Sum` (no uppercase, no underscores)
   - ❌ `two--sum` (no consecutive hyphens)
   - ❌ `-two-sum` (no leading hyphen)

### File Naming

The filename **must** match the problem's `slug` field:

```
src/data/problems/two-sum.json  →  { "slug": "two-sum", ... }
```

### Uniqueness Constraints

1. **`id`**: Must be unique across all problems (built-in + custom)
2. **`slug`**: Must be unique across all problems (built-in + custom)
3. **Enforcement**: Parser/indexer will fail-fast on duplicates for built-in problems

### ID Generation Guidelines

- Built-in problems: Use LeetCode problem number as string (e.g., `"1"`, `"42"`)
- Custom problems: Use a prefixed unique ID (e.g., `"custom-<uuid>"` or `"custom-<slug>"`)

## Array Normalization

When loading a problem, missing array fields are normalized to empty arrays:

```json
// On disk (minimal)
{
  "id": "1",
  "slug": "two-sum",
  "title": "Two Sum",
  "difficulty": "easy",
  "description": "Given an array...",
  "examples": [{ "input": { "nums": [2,7], "target": 9 }, "output": [0,1] }]
}

// In memory (normalized)
{
  "id": "1",
  "slug": "two-sum",
  "title": "Two Sum",
  "difficulty": "easy",
  "description": "Given an array...",
  "examples": [{ "input": { "nums": [2,7], "target": 9 }, "output": [0,1] }],
  "constraints": [],
  "hints": [],
  "tags": []
}
```

## Complete Example

```json
{
  "id": "1",
  "slug": "two-sum",
  "title": "Two Sum",
  "difficulty": "easy",
  "description": "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have **exactly one solution**, and you may not use the same element twice.\n\nYou can return the answer in any order.",
  "examples": [
    {
      "input": { "nums": [2, 7, 11, 15], "target": 9 },
      "output": [0, 1],
      "explanation": "Because nums[0] + nums[1] == 9, we return [0, 1]."
    },
    {
      "input": { "nums": [3, 2, 4], "target": 6 },
      "output": [1, 2]
    },
    {
      "input": { "nums": [3, 3], "target": 6 },
      "output": [0, 1]
    }
  ],
  "constraints": [
    "2 <= nums.length <= 10^4",
    "-10^9 <= nums[i] <= 10^9",
    "-10^9 <= target <= 10^9",
    "Only one valid answer exists."
  ],
  "hints": [
    "A brute force approach would check every pair of numbers. Can you do better?",
    "Think about what information you need to store as you iterate through the array.",
    "Use a hash map to store numbers you've seen and their indices."
  ],
  "tags": ["array", "hash-table"],
  "companies": ["Amazon", "Google", "Facebook", "Microsoft", "Apple"],
  "leetcodeUrl": "https://leetcode.com/problems/two-sum/",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-06-20T14:45:00.000Z",
  "metadata": {
    "source": "leetcode",
    "sourceId": "1"
  }
}
```

## Validation Rules Summary

| Rule | Validation |
|------|------------|
| `id` | Non-empty string |
| `slug` | Non-empty, kebab-case, matches filename |
| `title` | Non-empty string |
| `difficulty` | One of: `"easy"`, `"medium"`, `"hard"` |
| `description` | Non-empty string |
| `examples` | Non-empty array with valid `Example` objects |
| `examples[].input` | Object (not null, not array) |
| `examples[].output` | Any value (including null) |
| `constraints` | Array of non-empty strings (if present) |
| `hints` | Array of non-empty strings (if present) |
| `tags` | Array of non-empty strings (if present) |
| `companies` | Array of non-empty strings (if present) |
| `leetcodeUrl` | Valid URL string (if present) |
| `createdAt` | ISO-8601 date string (if present) |
| `updatedAt` | ISO-8601 date string (if present) |
| `metadata.source` | Non-empty string (if present) |
| `metadata.sourceId` | Non-empty string (if present) |

## Error Handling

Invalid problem files should produce clear error messages:

```
ProblemError: Invalid problem file
  at parseProblem
  context:
    path: src/data/problems/invalid-problem.json
    errors:
      - "slug must be kebab-case, got 'Invalid_Slug'"
      - "difficulty must be 'easy', 'medium', or 'hard', got 'super-hard'"
      - "examples must be a non-empty array"
```

---

## Definition of Done

- ✅ File format chosen: JSON
- ✅ Required and optional fields documented
- ✅ Metadata encoding specified: ISO-8601 strings
- ✅ Naming and uniqueness rules defined
- ✅ Complete example provided
- ✅ Validation rules summarized
