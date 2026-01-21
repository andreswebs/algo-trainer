# Algo-Trainer Manual Testing Plan

Comprehensive manual testing plan for the Algo-Trainer CLI application.

---

## 1. Introduction

### 1.1 Purpose

This document provides a complete manual testing plan for Algo-Trainer, a CLI tool for offline algorithm practice. It covers all user paths, commands, and edge cases to ensure quality before release.

### 1.2 Scope

**In Scope:**

- All 8 CLI commands (init, challenge, complete, hint, list, progress, config, teach)
- Interactive prompts and user inputs
- Configuration management
- File operations and workspace management
- Error handling and exit codes
- Environment variable handling

**Out of Scope:**

- Performance/load testing
- Security penetration testing
- Automated test development

### 1.3 References

- Application: Algo-Trainer v0.0.1
- Technology: TypeScript / Deno

---

## 2. Test Environment

### 2.1 Prerequisites

- Deno runtime installed
- Terminal with UTF-8 support
- Write access to test directories
- Clean test workspace for each test session

### 2.2 Supported Platforms

| Platform | Versions                           |
| -------- | ---------------------------------- |
| macOS    | 12.0+                              |
| Linux    | Ubuntu 20.04+, other major distros |
| Windows  | 10+, WSL2                          |

### 2.3 Environment Setup

```bash
# Create fresh test directory for each session
mkdir ~/algo-trainer-test-workspace
cd ~/algo-trainer-test-workspace

# Ensure no existing config
rm -rf ~/.config/algo-trainer

# Clear environment variables
unset AT_WORKSPACE AT_LANGUAGE AT_VERBOSE AT_QUIET AT_NO_COLOR AT_NO_EMOJI
```

---

## 3. Test Cases

### 3.1 Global Help and Version

#### TC-001: Display global help

- **Priority**: High
- **Preconditions**: None
- **Steps**:
  1. Run `algo-trainer--help`
- **Expected Result**:
  - Shows application name and version
  - Lists all available commands with descriptions
  - Shows global options
  - Exit code: 0

#### TC-002: Display version

- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Run `algo-trainer--version`
- **Expected Result**:
  - Displays version number (0.0.1)
  - Exit code: 0

#### TC-003: Unknown command

- **Priority**: High
- **Preconditions**: None
- **Steps**:
  1. Run `algo-trainer unknowncommand`
- **Expected Result**:
  - Shows error message about unknown command
  - Suggests similar commands or shows help
  - Exit code: 2

---

### 3.2 Workspace Initialization (algo-trainer init)

#### TC-010: Initialize new workspace in current directory

- **Priority**: Critical
- **Preconditions**: Empty directory, no existing workspace
- **Steps**:
  1. Create and enter empty directory: `mkdir test-ws && cd test-ws`
  2. Run `algo-trainer init`
- **Expected Result**:
  - Creates `problems/` directory
  - Creates `completed/` directory
  - Creates `templates/` directory
  - Creates `config/` directory
  - Shows success message
  - Exit code: 0

#### TC-011: Initialize workspace algo-trainer specified path

- **Priority**: Critical
- **Preconditions**: Target path doesn't exist
- **Steps**:
  1. Run `algo-trainer init ~/my-algo-practice`
- **Expected Result**:
  - Creates directory algo-trainer specified path
  - Creates all subdirectories
  - Shows success message with path
  - Exit code: 0

#### TC-012: Initialize in existing workspace (no force)

- **Priority**: High
- **Preconditions**: Workspace already initialized algo-trainer path
- **Steps**:
  1. Run `algo-trainer init` in initialized workspace
- **Expected Result**:
  - Shows error/warning about existing workspace
  - Does NOT overwrite existing files
  - Exit code: non-zero (likely 3)

#### TC-013: Force reinitialize workspace

- **Priority**: High
- **Preconditions**: Workspace already initialized
- **Steps**:
  1. Run `algo-trainer init --force`
- **Expected Result**:
  - Reinitializes workspace
  - Preserves or recreates directory structure
  - Shows success message
  - Exit code: 0

#### TC-014: Initialize with path containing spaces

- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Run `algo-trainer init "/tmp/my test workspace"`
- **Expected Result**:
  - Creates workspace algo-trainer path with spaces
  - All operations work correctly
  - Exit code: 0

#### TC-015: Initialize with insufficient permissions

- **Priority**: Medium
- **Preconditions**: Read-only directory
- **Steps**:
  1. Create read-only directory: `mkdir /tmp/readonly && chmod 444 /tmp/readonly`
  2. Run `algo-trainer init /tmp/readonly/workspace`
- **Expected Result**:
  - Shows permission denied error
  - Exit code: 7

#### TC-016: Init help display

- **Priority**: Low
- **Preconditions**: None
- **Steps**:
  1. Run `algo-trainer init --help`
- **Expected Result**:
  - Shows init command usage
  - Lists available options (-f/--force)
  - Exit code: 0

---

### 3.3 Challenge Command (algo-trainer challenge)

#### TC-020: Start challenge by slug

- **Priority**: Critical
- **Preconditions**: Workspace initialized, default language configured
- **Steps**:
  1. Run `algo-trainer challenge two-sum`
- **Expected Result**:
  - Creates problem file in `problems/` directory
  - Creates solution template file
  - Displays problem title, ID, difficulty
  - Displays problem description
  - Shows examples and constraints
  - Exit code: 0

#### TC-021: Start challenge with difficulty filter

- **Priority**: Critical
- **Preconditions**: Workspace initialized
- **Steps**:
  1. Run `algo-trainer challenge -d easy`
  2. When prompted, select a language
- **Expected Result**:
  - Prompts for language selection (if not configured)
  - Shows only easy problems
  - Creates problem and solution files
  - Exit code: 0

#### TC-022: Start random challenge

- **Priority**: High
- **Preconditions**: Workspace initialized
- **Steps**:
  1. Run `algo-trainer challenge --random`
- **Expected Result**:
  - Selects a random problem
  - Creates problem and solution files
  - Displays problem details
  - Exit code: 0

#### TC-023: Start challenge with multiple filters

- **Priority**: High
- **Preconditions**: Workspace initialized
- **Steps**:
  1. Run `algo-trainer challenge -d medium -c arrays -l python`
- **Expected Result**:
  - Filters by difficulty AND category
  - Uses specified language for template
  - Creates problem and solution files
  - Exit code: 0

#### TC-024: Challenge with explicit language override

- **Priority**: High
- **Preconditions**: Workspace initialized, default language is TypeScript
- **Steps**:
  1. Run `algo-trainer challenge two-sum -l python`
- **Expected Result**:
  - Creates Python solution template (not TypeScript)
  - Template has .py extension
  - Template contains Python syntax
  - Exit code: 0

#### TC-025: Start challenge thalgo-trainer already exists (no force)

- **Priority**: High
- **Preconditions**: two-sum challenge already started
- **Steps**:
  1. Run `algo-trainer challenge two-sum`
- **Expected Result**:
  - Prompts for confirmation to overwrite
  - If declined: exits without changes
  - Exit code depends on user choice

#### TC-026: Force overwrite existing challenge

- **Priority**: High
- **Preconditions**: two-sum challenge already started
- **Steps**:
  1. Run `algo-trainer challenge two-sum --force`
- **Expected Result**:
  - Overwrites existing files without prompting
  - Creates fresh problem and solution files
  - Exit code: 0

#### TC-027: Challenge with invalid slug

- **Priority**: High
- **Preconditions**: Workspace initialized
- **Steps**:
  1. Run `algo-trainer challenge nonexistent-problem`
- **Expected Result**:
  - Shows "Problem not found" error
  - Suggests using `algo-trainer list` to find problems
  - Exit code: 5

#### TC-028: Challenge with invalid difficulty

- **Priority**: Medium
- **Preconditions**: Workspace initialized
- **Steps**:
  1. Run `algo-trainer challenge -d impossible`
- **Expected Result**:
  - Shows error about invalid difficulty
  - Lists valid options (easy, medium, hard)
  - Exit code: 2

#### TC-029: Challenge with invalid language

- **Priority**: Medium
- **Preconditions**: Workspace initialized
- **Steps**:
  1. Run `algo-trainer challenge two-sum -l cobol`
- **Expected Result**:
  - Shows error about invalid language
  - Lists valid options (typescript, javascript, python, java, cpp, rust, go)
  - Exit code: 2

#### TC-030: Challenge without initialized workspace

- **Priority**: Critical
- **Preconditions**: No workspace initialized
- **Steps**:
  1. Navigate to directory without workspace
  2. Run `algo-trainer challenge two-sum`
- **Expected Result**:
  - Shows "Workspace not initialized" error
  - Suggests running `algo-trainer init` first
  - Exit code: 4

#### TC-031: Verify all 7 languages generate correct templates

- **Priority**: High
- **Preconditions**: Workspace initialized
- **Steps**:
  1. Run `algo-trainer challenge two-sum -l typescript` - verify .ts file
  2. Run `algo-trainer challenge two-sum -l javascript --force` - verify .js file
  3. Run `algo-trainer challenge two-sum -l python --force` - verify .py file
  4. Run `algo-trainer challenge two-sum -l java --force` - verify .java file
  5. Run `algo-trainer challenge two-sum -l cpp --force` - verify .cpp file
  6. Run `algo-trainer challenge two-sum -l rust --force` - verify .rs file
  7. Run `algo-trainer challenge two-sum -l go --force` - verify .go file
- **Expected Result**:
  - Each language creates correct file extension
  - Each template contains valid syntax for thalgo-trainer language
  - Templates include function signature
  - Exit code: 0 for all

#### TC-032: Challenge with topic filter

- **Priority**: Medium
- **Preconditions**: Workspace initialized
- **Steps**:
  1. Run `algo-trainer challenge -t hash-table`
- **Expected Result**:
  - Shows problems tagged with hash-table
  - Creates problem and solution files
  - Exit code: 0

---

### 3.4 Hint Command (algo-trainer hint)

#### TC-040: Get first hint for problem

- **Priority**: Critical
- **Preconditions**: two-sum challenge started
- **Steps**:
  1. Run `algo-trainer hint two-sum`
- **Expected Result**:
  - Displays level 1 hint (General Approach)
  - Shows hint progress indicator (e.g., 1/3)
  - Marks hint as used in metadata
  - Exit code: 0

#### TC-041: Get progressive hints

- **Priority**: Critical
- **Preconditions**: two-sum challenge started, no hints used
- **Steps**:
  1. Run `algo-trainer hint two-sum` (first time)
  2. Run `algo-trainer hint two-sum` (second time)
  3. Run `algo-trainer hint two-sum` (third time)
  4. Run `algo-trainer hint two-sum` (fourth time)
- **Expected Result**:
  - First call: Level 1 hint
  - Second call: Level 2 hint
  - Third call: Level 3 hint
  - Fourth call: Message thalgo-trainer all hints have been viewed
  - Progress bar updates each time
  - Exit code: 0 for all

#### TC-042: Get specific hint level

- **Priority**: High
- **Preconditions**: two-sum challenge started
- **Steps**:
  1. Run `algo-trainer hint two-sum --level 2`
- **Expected Result**:
  - Displays level 2 hint directly
  - Skips level 1
  - Exit code: 0

#### TC-043: Get all hints algo-trainer once

- **Priority**: High
- **Preconditions**: two-sum challenge started
- **Steps**:
  1. Run `algo-trainer hint two-sum --all`
- **Expected Result**:
  - Displays all 3 hint levels
  - Shows hints in order (1, 2, 3)
  - Exit code: 0

#### TC-044: Hint for invalid problem

- **Priority**: High
- **Preconditions**: Workspace initialized
- **Steps**:
  1. Run `algo-trainer hint nonexistent-problem`
- **Expected Result**:
  - Shows "Problem not found" error
  - Exit code: 5

#### TC-045: Hint by problem ID

- **Priority**: Medium
- **Preconditions**: two-sum challenge started (ID: 1)
- **Steps**:
  1. Run `algo-trainer hint 1`
- **Expected Result**:
  - Finds problem by ID
  - Displays hint for two-sum
  - Exit code: 0

#### TC-046: Hint with invalid level

- **Priority**: Medium
- **Preconditions**: two-sum challenge started
- **Steps**:
  1. Run `algo-trainer hint two-sum --level 5`
- **Expected Result**:
  - Shows error about invalid hint level
  - Indicates valid range (1-3)
  - Exit code: 2

#### TC-047: Hint without problem specified

- **Priority**: Medium
- **Preconditions**: Only one problem in workspace
- **Steps**:
  1. Run `algo-trainer hint`
- **Expected Result**:
  - Auto-detects current problem OR
  - Shows error requesting problem specification
  - Exit code depends on implementation

---

### 3.5 Complete Command (algo-trainer complete)

#### TC-050: Complete problem by slug

- **Priority**: Critical
- **Preconditions**: two-sum challenge started, solution written
- **Steps**:
  1. Run `algo-trainer complete two-sum`
- **Expected Result**:
  - Moves problem files to `completed/` directory
  - Shows completion summary
  - Displays hints used count
  - Suggests next problems
  - Exit code: 0

#### TC-051: Complete with notes

- **Priority**: High
- **Preconditions**: two-sum challenge started
- **Steps**:
  1. Run `algo-trainer complete two-sum -n "Used hash map for O(n) solution"`
- **Expected Result**:
  - Archives problem with notes saved
  - Notes stored in problem metadata
  - Shows completion summary including notes
  - Exit code: 0

#### TC-052: Complete without archiving

- **Priority**: High
- **Preconditions**: two-sum challenge started
- **Steps**:
  1. Run `algo-trainer complete two-sum --no-archive`
- **Expected Result**:
  - Marks problem as complete
  - Files remain in `problems/` directory
  - Metadata updated with completion status
  - Exit code: 0

#### TC-053: Interactive problem selection (single problem)

- **Priority**: High
- **Preconditions**: Only one problem in workspace
- **Steps**:
  1. Run `algo-trainer complete`
- **Expected Result**:
  - Auto-detects the single problem
  - Completes it without prompting for selection
  - Exit code: 0

#### TC-054: Interactive problem selection (multiple problems)

- **Priority**: High
- **Preconditions**: Multiple problems in workspace
- **Steps**:
  1. Start two-sum and add-two-numbers challenges
  2. Run `algo-trainer complete`
- **Expected Result**:
  - Prompts for problem selection
  - Shows list of in-progress problems
  - Completes selected problem
  - Exit code: 0

#### TC-055: Complete with no problems in workspace

- **Priority**: High
- **Preconditions**: Workspace initialized, no problems started
- **Steps**:
  1. Run `algo-trainer complete`
- **Expected Result**:
  - Shows message thalgo-trainer no problems are in progress
  - Suggests starting a challenge
  - Exit code: appropriate error code

#### TC-056: Complete invalid problem

- **Priority**: High
- **Preconditions**: Workspace initialized
- **Steps**:
  1. Run `algo-trainer complete nonexistent-problem`
- **Expected Result**:
  - Shows "Problem not found" error
  - Exit code: 5

#### TC-057: Archive collision handling

- **Priority**: Medium
- **Preconditions**: Completed two-sum once already, started it again
- **Steps**:
  1. Run `algo-trainer complete two-sum` again
- **Expected Result**:
  - Handles filename collision (timestamp suffix or prompt)
  - Archives without overwriting previous completion
  - Exit code: 0

#### TC-058: Next problem suggestions

- **Priority**: Medium
- **Preconditions**: Complete an easy problem
- **Steps**:
  1. Run `algo-trainer complete two-sum`
  2. Observe suggestions
- **Expected Result**:
  - Suggests problems of similar difficulty
  - Suggestions are different from completed problem
  - Shows 2-3 suggestions

---

### 3.6 List Command (algo-trainer list)

#### TC-060: List all problems (default)

- **Priority**: Critical
- **Preconditions**: None (uses built-in problem database)
- **Steps**:
  1. Run `algo-trainer list`
- **Expected Result**:
  - Shows table with ID, Difficulty, Title
  - Displays up to 20 problems (default limit)
  - Shows total count
  - Exit code: 0

#### TC-061: List with difficulty filter

- **Priority**: High
- **Preconditions**: None
- **Steps**:
  1. Run `algo-trainer list -d easy`
- **Expected Result**:
  - Shows only easy problems
  - All displayed problems have "Easy" difficulty
  - Exit code: 0

#### TC-062: List with search term

- **Priority**: High
- **Preconditions**: None
- **Steps**:
  1. Run `algo-trainer list -s "tree"`
- **Expected Result**:
  - Shows problems with "tree" in title or description
  - Search is case-insensitive
  - Exit code: 0

#### TC-063: List with category filter

- **Priority**: High
- **Preconditions**: None
- **Steps**:
  1. Run `algo-trainer list -c arrays`
- **Expected Result**:
  - Shows only problems tagged with "arrays"
  - Exit code: 0

#### TC-064: List with custom limit

- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Run `algo-trainer list -l 5`
- **Expected Result**:
  - Shows exactly 5 problems (or less if fewer exist)
  - Exit code: 0

#### TC-065: List with verbose output

- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Run `algo-trainer list --verbose`
- **Expected Result**:
  - Shows full descriptions for each problem
  - Shows tags/categories
  - Exit code: 0

#### TC-066: List with JSON output

- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Run `algo-trainer list --json`
- **Expected Result**:
  - Outputs valid JSON array
  - Each problem is a JSON object
  - No table formatting
  - Exit code: 0

#### TC-067: List with combined filters

- **Priority**: High
- **Preconditions**: None
- **Steps**:
  1. Run `algo-trainer list -d medium -c arrays -l 10`
- **Expected Result**:
  - Shows medium difficulty problems
  - All are tagged with arrays
  - Maximum 10 results
  - Exit code: 0

#### TC-068: List with no matching results

- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Run `algo-trainer list -s "xyznonexistent123"`
- **Expected Result**:
  - Shows "No problems found" message
  - Exit code: 0 (not an error)

---

### 3.7 Progress Command (algo-trainer progress)

#### TC-070: View basic progress

- **Priority**: Critical
- **Preconditions**: Workspace with some completed problems
- **Steps**:
  1. Run `algo-trainer progress`
- **Expected Result**:
  - Shows total completed count
  - Shows in-progress count
  - Shows breakdown by difficulty
  - Exit code: 0

#### TC-071: View detailed progress

- **Priority**: High
- **Preconditions**: Workspace with completed problems
- **Steps**:
  1. Run `algo-trainer progress --detailed`
- **Expected Result**:
  - Shows all statistics from basic view
  - Shows breakdown by all categories (not just top 10)
  - Shows percentages
  - Exit code: 0

#### TC-072: View progress by category

- **Priority**: High
- **Preconditions**: Workspace with completed problems
- **Steps**:
  1. Run `algo-trainer progress --category`
- **Expected Result**:
  - Groups progress by problem category/tag
  - Shows count per category
  - Exit code: 0

#### TC-073: Progress JSON output

- **Priority**: Medium
- **Preconditions**: Workspace with some progress
- **Steps**:
  1. Run `algo-trainer progress --json`
- **Expected Result**:
  - Outputs valid JSON
  - Contains all progress data
  - Suitable for parsing/scripting
  - Exit code: 0

#### TC-074: Progress with empty workspace

- **Priority**: High
- **Preconditions**: Workspace initialized, no problems completed
- **Steps**:
  1. Run `algo-trainer progress`
- **Expected Result**:
  - Shows 0 completed
  - Shows 0 in progress (or actual count)
  - Does not error
  - Exit code: 0

#### TC-075: Progress without initialized workspace

- **Priority**: High
- **Preconditions**: No workspace
- **Steps**:
  1. Run `algo-trainer progress`
- **Expected Result**:
  - Shows workspace not initialized error
  - Suggests running `algo-trainer init`
  - Exit code: 4

---

### 3.8 Configuration Command (algo-trainer config)

#### TC-080: List all configuration

- **Priority**: Critical
- **Preconditions**: None
- **Steps**:
  1. Run `algo-trainer config list`
- **Expected Result**:
  - Shows all configuration keys and values
  - Shows language, workspace, aiEnabled, preferences
  - Exit code: 0

#### TC-081: Get specific configuration value

- **Priority**: High
- **Preconditions**: None
- **Steps**:
  1. Run `algo-trainer config get language`
- **Expected Result**:
  - Shows only the language value
  - Exit code: 0

#### TC-082: Set configuration value

- **Priority**: Critical
- **Preconditions**: None
- **Steps**:
  1. Run `algo-trainer config set language python`
  2. Run `algo-trainer config get language`
- **Expected Result**:
  - Set shows success message
  - Get shows "python"
  - Exit code: 0

#### TC-083: Set nested preference

- **Priority**: High
- **Preconditions**: None
- **Steps**:
  1. Run `algo-trainer config set preferences.theme dark`
  2. Run `algo-trainer config get preferences.theme`
- **Expected Result**:
  - Set succeeds
  - Get shows "dark"
  - Exit code: 0

#### TC-084: Reset single configuration key

- **Priority**: High
- **Preconditions**: Language set to python
- **Steps**:
  1. Run `algo-trainer config reset language`
  2. Run `algo-trainer config get language`
- **Expected Result**:
  - Reset succeeds
  - Language returns to default (typescript)
  - Exit code: 0

#### TC-085: Reset all configuration

- **Priority**: High
- **Preconditions**: Multiple settings changed
- **Steps**:
  1. Run `algo-trainer config reset`
- **Expected Result**:
  - All settings return to defaults
  - Shows confirmation or success
  - Exit code: 0

#### TC-086: Set invalid language

- **Priority**: High
- **Preconditions**: None
- **Steps**:
  1. Run `algo-trainer config set language invalid`
- **Expected Result**:
  - Shows validation error
  - Lists valid languages
  - Configuration not changed
  - Exit code: 2 or 3

#### TC-087: Set invalid boolean

- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Run `algo-trainer config set aiEnabled maybe`
- **Expected Result**:
  - Shows validation error
  - Indicates valid values (true/false)
  - Exit code: 2 or 3

#### TC-088: Config JSON output

- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Run `algo-trainer config list --json`
- **Expected Result**:
  - Outputs valid JSON object
  - Contains all configuration
  - Exit code: 0

#### TC-089: Get nonexistent key

- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Run `algo-trainer config get nonexistent.key`
- **Expected Result**:
  - Shows error about unknown key
  - Exit code: 2 or 3

#### TC-090: Set all valid languages

- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Test each: `algo-trainer config set language <lang>`
  2. Languages: typescript, javascript, python, java, cpp, rust, go
- **Expected Result**:
  - All 7 languages accepted
  - Exit code: 0 for all

#### TC-091: Set all valid themes

- **Priority**: Low
- **Preconditions**: None
- **Steps**:
  1. Test each: `algo-trainer config set preferences.theme <theme>`
  2. Themes: light, dark, auto
- **Expected Result**:
  - All 3 themes accepted
  - Exit code: 0 for all

#### TC-092: Boolean parsing variations

- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. `algo-trainer config set aiEnabled true` - verify true
  2. `algo-trainer config set aiEnabled false` - verify false
  3. `algo-trainer config set aiEnabled 1` - verify true
  4. `algo-trainer config set aiEnabled 0` - verify false
  5. `algo-trainer config set aiEnabled yes` - verify true
  6. `algo-trainer config set aiEnabled no` - verify false
- **Expected Result**:
  - All variations parsed correctly
  - Exit code: 0 for all

---

### 3.9 Teach Command (algo-trainer teach)

#### TC-100: Generate teaching script

- **Priority**: High
- **Preconditions**: Workspace initialized
- **Steps**:
  1. Run `algo-trainer teach generate two-sum`
- **Expected Result**:
  - Generates YAML teaching script
  - Script saved in problem directory
  - Shows success message
  - Exit code: 0

#### TC-101: Generate with custom output path

- **Priority**: Medium
- **Preconditions**: Workspace initialized
- **Steps**:
  1. Run `algo-trainer teach generate two-sum --output ./custom-script.yaml`
- **Expected Result**:
  - Script saved to specified path
  - Exit code: 0

#### TC-102: Validate valid teaching script

- **Priority**: High
- **Preconditions**: Valid teaching script exists
- **Steps**:
  1. Run `algo-trainer teach validate ./trainer.yaml`
- **Expected Result**:
  - Shows "Script is valid" or similar
  - Exit code: 0

#### TC-103: Validate invalid teaching script

- **Priority**: High
- **Preconditions**: Invalid YAML file
- **Steps**:
  1. Create malformed YAML file
  2. Run `algo-trainer teach validate ./invalid.yaml`
- **Expected Result**:
  - Shows validation errors
  - Describes what's wrong
  - Exit code: non-zero

#### TC-104: Teaching system info

- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Run `algo-trainer teach info`
- **Expected Result**:
  - Shows AI system status
  - Shows whether aiEnabled
  - Shows teaching capabilities
  - Exit code: 0

#### TC-105: Generate for invalid problem

- **Priority**: Medium
- **Preconditions**: Workspace initialized
- **Steps**:
  1. Run `algo-trainer teach generate nonexistent-problem`
- **Expected Result**:
  - Shows problem not found error
  - Exit code: 5

---

### 3.10 Environment Variables

#### TC-110: AT_WORKSPACE override

- **Priority**: High
- **Preconditions**: Different workspace exists
- **Steps**:
  1. Run `AT_WORKSPACE=/tmp/other-ws algo-trainer challenge two-sum`
- **Expected Result**:
  - Uses /tmp/other-ws as workspace
  - Creates files there
  - Exit code: 0

#### TC-111: AT_LANGUAGE override

- **Priority**: High
- **Preconditions**: Config language is typescript
- **Steps**:
  1. Run `AT_LANGUAGE=python algo-trainer challenge three-sum`
- **Expected Result**:
  - Creates Python template despite config
  - Exit code: 0

#### TC-112: AT_VERBOSE flag

- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Run `AT_VERBOSE=1 algo-trainer list`
- **Expected Result**:
  - Shows verbose/debug output
  - More detailed than normal
  - Exit code: 0

#### TC-113: AT_QUIET flag

- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Run `AT_QUIET=1 algo-trainer challenge two-sum`
- **Expected Result**:
  - Minimal output
  - Only essential information shown
  - Exit code: 0

#### TC-114: AT_NO_COLOR flag

- **Priority**: Low
- **Preconditions**: Terminal supports colors
- **Steps**:
  1. Run `AT_NO_COLOR=1 algo-trainer list`
- **Expected Result**:
  - Output has no ANSI color codes
  - Plain text only
  - Exit code: 0

#### TC-115: AT_NO_EMOJI flag

- **Priority**: Low
- **Preconditions**: None
- **Steps**:
  1. Run `AT_NO_EMOJI=1 algo-trainer progress`
- **Expected Result**:
  - No emoji characters in output
  - Exit code: 0

#### TC-116: Environment precedence over config

- **Priority**: High
- **Preconditions**: Config language is typescript
- **Steps**:
  1. Run `AT_LANGUAGE=java algo-trainer config get language`
  2. Run `algo-trainer config get language` (without env var)
- **Expected Result**:
  - With env: shows java (env overrides)
  - Without env: shows typescript (from config)
  - Exit code: 0

#### TC-117: Invalid environment variable value

- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Run `AT_LANGUAGE=invalid algo-trainer challenge two-sum`
- **Expected Result**:
  - Shows error about invalid language
  - Does not crash
  - Exit code: 2

---

### 3.11 Interactive Prompts

#### TC-120: Difficulty selection prompt

- **Priority**: High
- **Preconditions**: Workspace initialized, no difficulty specified
- **Steps**:
  1. Run `algo-trainer challenge`
  2. Select "medium" when prompted
- **Expected Result**:
  - Shows difficulty options (easy, medium, hard)
  - Accepts selection
  - Proceeds with medium difficulty
  - Exit code: 0

#### TC-121: Language selection prompt

- **Priority**: High
- **Preconditions**: No default language configured
- **Steps**:
  1. Run `algo-trainer challenge two-sum`
  2. Select "python" when prompted
- **Expected Result**:
  - Shows language options
  - Creates Python template
  - Exit code: 0

#### TC-122: Overwrite confirmation (decline)

- **Priority**: High
- **Preconditions**: two-sum already exists
- **Steps**:
  1. Run `algo-trainer challenge two-sum`
  2. Select "no" when asked to overwrite
- **Expected Result**:
  - Does not overwrite files
  - Shows appropriate message
  - Exit code: 0 or appropriate code

#### TC-123: Overwrite confirmation (accept)

- **Priority**: High
- **Preconditions**: two-sum already exists
- **Steps**:
  1. Run `algo-trainer challenge two-sum`
  2. Select "yes" when asked to overwrite
- **Expected Result**:
  - Overwrites existing files
  - Creates fresh challenge
  - Exit code: 0

#### TC-124: Problem selection prompt

- **Priority**: High
- **Preconditions**: Multiple problems in progress
- **Steps**:
  1. Run `algo-trainer complete`
  2. Select problem from list
- **Expected Result**:
  - Shows list of in-progress problems
  - Accepts selection
  - Completes selected problem
  - Exit code: 0

#### TC-125: Invalid selection retry

- **Priority**: Medium
- **Preconditions**: Interactive prompt active
- **Steps**:
  1. Run `algo-trainer challenge`
  2. Enter invalid option (e.g., "99")
- **Expected Result**:
  - Shows error about invalid selection
  - Prompts again OR exits with error
  - Does not crash

---

### 3.12 Global Flags

#### TC-130: --verbose flag

- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Run `algo-trainer--verbose challenge two-sum`
- **Expected Result**:
  - Shows extra debug/verbose information
  - Exit code: 0

#### TC-131: --quiet flag

- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Run `algo-trainer--quiet complete two-sum`
- **Expected Result**:
  - Minimal output
  - Exit code: 0

#### TC-132: --no-color flag

- **Priority**: Low
- **Preconditions**: None
- **Steps**:
  1. Run `algo-trainer--no-color list`
- **Expected Result**:
  - No color codes in output
  - Exit code: 0

#### TC-133: --no-emoji flag

- **Priority**: Low
- **Preconditions**: None
- **Steps**:
  1. Run `algo-trainer--no-emoji progress`
- **Expected Result**:
  - No emoji in output
  - Exit code: 0

#### TC-134: -c/--config custom config path

- **Priority**: Medium
- **Preconditions**: Custom config file exists
- **Steps**:
  1. Create custom config algo-trainer/tmp/custom-config.json
  2. Run `algo-trainer-c /tmp/custom-config.json config list`
- **Expected Result**:
  - Uses custom config file
  - Shows settings from custom file
  - Exit code: 0

---

### 3.13 Error Handling

#### TC-140: Missing required argument

- **Priority**: High
- **Preconditions**: None
- **Steps**:
  1. Run `algo-trainer config set` (missing key and value)
- **Expected Result**:
  - Shows usage error
  - Indicates required arguments
  - Exit code: 2

#### TC-141: Corrupt config file recovery

- **Priority**: High
- **Preconditions**: Corrupt JSON in config file
- **Steps**:
  1. Write invalid JSON to ~/.config/algo-trainer/config.json
  2. Run `algo-trainer config list`
- **Expected Result**:
  - Shows error about corrupt config
  - Suggests `algo-trainer config reset` or manual fix
  - Exit code: 3

#### TC-142: Permission denied on write

- **Priority**: Medium
- **Preconditions**: Read-only workspace directory
- **Steps**:
  1. Make workspace read-only: `chmod 444 ~/workspace/problems`
  2. Run `algo-trainer challenge two-sum`
- **Expected Result**:
  - Shows permission denied error
  - Clear error message
  - Exit code: 7

#### TC-143: Disk full simulation

- **Priority**: Low
- **Preconditions**: Near-full disk or simulated condition
- **Steps**:
  1. Attempt to create large files
- **Expected Result**:
  - Shows appropriate error
  - Does not crash
  - Exit code: non-zero

---

### 3.14 Edge Cases

#### TC-150: Unicode in problem titles and descriptions

- **Priority**: Medium
- **Preconditions**: Problem with unicode content
- **Steps**:
  1. Run `algo-trainer list` with unicode content
  2. Run `algo-trainer challenge <problem-with-unicode>`
- **Expected Result**:
  - Unicode displays correctly
  - No encoding errors
  - Exit code: 0

#### TC-151: Very long problem description

- **Priority**: Low
- **Preconditions**: Problem with lengthy description
- **Steps**:
  1. Run `algo-trainer challenge <long-description-problem>`
- **Expected Result**:
  - Description displays (possibly paginated)
  - Does not truncate unexpectedly
  - Exit code: 0

#### TC-152: Special characters in file paths

- **Priority**: Medium
- **Preconditions**: None
- **Steps**:
  1. Run `algo-trainer init "/tmp/test workspace (1)"`
- **Expected Result**:
  - Handles parentheses and spaces
  - Creates valid directory
  - Exit code: 0

#### TC-153: Rapid successive commands

- **Priority**: Low
- **Preconditions**: Workspace initialized
- **Steps**:
  1. Run multiple commands rapidly in succession
- **Expected Result**:
  - No race conditions
  - Data integrity maintained
  - Exit code: 0

#### TC-154: Empty workspace operations

- **Priority**: Medium
- **Preconditions**: Workspace initialized but empty
- **Steps**:
  1. Run `algo-trainer complete`
  2. Run `algo-trainer progress`
  3. Run `algo-trainer hint`
- **Expected Result**:
  - Appropriate "no problems" messages
  - No crashes
  - Sensible exit codes

---

## 4. Test Execution Tracking

### 4.1 Test Run Template

| TC ID  | Status | Tester | Date | Notes |
| ------ | ------ | ------ | ---- | ----- |
| TC-001 |        |        |      |       |
| TC-002 |        |        |      |       |
| ...    |        |        |      |       |

**Status Values:**

- PASS - Test passed
- FAIL - Test failed (log defect)
- BLOCKED - Cannot execute (dependency issue)
- SKIP - Intentionally skipped (document reason)

### 4.2 Defect Log Template

| Defect ID | TC ID | Severity | Title | Steps | Expected | Actual | Status |
| --------- | ----- | -------- | ----- | ----- | -------- | ------ | ------ |
|           |       |          |       |       |          |        |        |

**Severity Levels:**

- Critical - Application crash, data loss
- High - Major feature broken
- Medium - Feature partially broken
- Low - Minor issue, cosmetic

---

## 5. Test Environment Cleanup

After testing, clean up:

```bash
# Remove test workspaces
rm -rf ~/at-test-workspace
rm -rf /tmp/test*workspace*

# Reset configuration
rm -rf ~/.config/algo-trainer

# Unset environment variables
unset AT_WORKSPACE AT_LANGUAGE AT_VERBOSE AT_QUIET AT_NO_COLOR AT_NO_EMOJI AT_CONFIG_PATH
```

---

## 6. Sign-Off

| Role          | Name | Date | Signature |
| ------------- | ---- | ---- | --------- |
| QA Lead       |      |      |           |
| Developer     |      |      |           |
| Product Owner |      |      |           |
