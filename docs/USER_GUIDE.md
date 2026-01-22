# Algo-Trainer User Guide

**Version:** 0.0.1
**Last Updated:** 2026-01-21

A comprehensive guide to using Algo-Trainer for practicing algorithmic problem solving.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Basic Workflow](#basic-workflow)
3. [Working with Problems](#working-with-problems)
4. [Managing Your Progress](#managing-your-progress)
5. [Configuration](#configuration)
6. [Common Use Cases](#common-use-cases)
7. [Tips and Best Practices](#tips-and-best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Installation

Ensure you have Deno installed on your system. Build the binary:

```sh
deno task build
```

This creates the `bin/algo-trainer` executable.

### First Time Setup

1. **Verify installation**:

```sh
algo-trainer --version
algo-trainer --help
```

2. **Initialize a workspace** in your desired practice directory:

```sh
# Initialize in current directory
algo-trainer init

# Or specify a path
algo-trainer init ~/algo-practice
```

This creates the following structure:

```
your-workspace/
├── problems/      # Active challenges
├── completed/     # Solved problems archive
├── templates/     # Language templates
└── config/        # Workspace configuration
```

---

## Basic Workflow

The typical workflow for practicing algorithmic problems:

### 1. Browse Available Problems

```sh
# List all problems
algo-trainer list

# Filter by difficulty
algo-trainer list -d easy
algo-trainer list -d medium
algo-trainer list -d hard

# Search by keyword
algo-trainer list -s "two sum"

# Filter by tag/category
algo-trainer list -t array
algo-trainer list -c string

# Show more details
algo-trainer list --verbose

# Get JSON output
algo-trainer list --json
```

### 2. Start a Challenge

```sh
# Start a specific problem
algo-trainer challenge two-sum

# Start a random problem by difficulty
algo-trainer challenge easy
algo-trainer challenge medium
algo-trainer challenge hard

# Start any random problem
algo-trainer challenge --random

# Use a specific language
algo-trainer challenge two-sum -l python
algo-trainer challenge -d hard -l rust

# Filter by topic
algo-trainer challenge -t "dynamic-programming"
```

**What happens:**

- Problem files are generated in `problems/[problem-slug]/`
- You get a solution template in your chosen language
- Problem description, test cases, and metadata are included

### 3. Solve the Problem

Navigate to the problem directory and work on your solution:

```sh
cd problems/two-sum/
# Edit solution.ts (or solution.py, solution.java, etc.)
```

### 4. Get Hints (Optional)

If you're stuck, get progressive hints:

```sh
# Get the next hint
algo-trainer hint two-sum

# Get a specific hint level (1-3)
algo-trainer hint two-sum --level 2

# Show all hints algo-trainer once
algo-trainer hint two-sum --all
```

**Hint Levels:**

1. **General Approach** - High-level strategy
2. **Algorithm/Data Structure** - Specific techniques to use
3. **Solution Strategy** - Detailed implementation guidance

### 5. Complete the Problem

When you've solved it:

```sh
# Mark as complete - archives to completed/
# You'll be prompted for notes
algo-trainer complete two-sum

# Complete without archiving
algo-trainer complete two-sum --no-archive
```

---

## Working with Problems

### Problem Selection Strategies

**By Difficulty:**

```sh
# Good for beginners
algo-trainer challenge easy

# Intermediate practice
algo-trainer challenge medium

# Advanced challenges
algo-trainer challenge hard
```

**By Topic:**

```sh
# Focus on specific data structures
algo-trainer list -t array
algo-trainer list -t tree
algo-trainer list -t graph

# Focus on algorithms
algo-trainer list -t "dynamic-programming"
algo-trainer list -t greedy
algo-trainer list -t sorting
```

**By Company:**

```sh
# Practice problems from specific companies
algo-trainer list --verbose  # Shows company tags
```

### Managing Active Problems

```sh
# See what you're currently working on
ls problems/

# Multiple problems at once is okay
algo-trainer challenge binary-search
algo-trainer challenge valid-parentheses
# Work on whichever you prefer
```

### Problem Files Structure

Each problem generates:

```
problems/two-sum/
├── solution.ts          # Your solution (or .py, .java, etc.)
├── problem.md           # Problem description
├── test-cases.json      # Test cases
└── .metadata.json       # Progress tracking
```

---

## Managing Your Progress

### View Your Progress

```sh
# Basic progress overview
algo-trainer progress

# Detailed breakdown by difficulty
algo-trainer progress --detailed

# Progress by category/topic
algo-trainer progress --by-category

# Get JSON output for scripts
algo-trainer progress --json
```

**Sample Output:**

```txt
📊 Progress Summary
═══════════════════════════════════════════

Problems Solved: 12 / 16 (75%)
Current Streak: 5 days 🔥

By Difficulty:
  Easy:   ████████░░ 8/10 (80%)
  Medium: ███░░░░░░░ 3/5  (60%)
  Hard:   █░░░░░░░░░ 1/1  (100%)

Recently Completed:
  1. Two Sum (easy) - 2 days ago
  2. Valid Parentheses (easy) - 3 days ago
  3. Binary Search (easy) - 5 days ago
```

### Archive Management

Completed problems are moved to `completed/` with metadata:

```sh
# View completed problems
ls completed/

# Review a past solution
calgo-trainer completed/two-sum/solution.ts
calgo-trainer completed/two-sum/.metadata.json
```

**Metadata includes:**

- Completion date
- Hints used
- Time spent (if tracked)
- Your notes

---

## Configuration

### View Configuration

```sh
# Show all settings
algo-trainer config list

# Get specific value
algo-trainer config get language
algo-trainer config get workspace
algo-trainer config get preferences.theme
```

### Update Settings

```sh
# Set default language
algo-trainer config set language python
algo-trainer config set language typescript
algo-trainer config set language java

# Set preferences
algo-trainer config set preferences.theme dark
algo-trainer config set preferences.verbosity verbose
algo-trainer config set preferences.useEmoji false

# Enable/disable AI features
algo-trainer config set aiEnabled true
```

### Supported Languages

```sh
algo-trainer config set language <language>
```

Available languages:

- `typescript` (default)
- `javascript`
- `python`
- `java`
- `cpp`
- `rust`
- `go`

### Reset Configuration

```sh
# Reset specific key
algo-trainer config reset language

# Reset entire configuration
algo-trainer config reset --all
```

### Environment Variables

Override configuration with environment variables:

```sh
# Temporary language override
AT_LANGUAGE=python algo-trainer challenge two-sum

# Custom workspace location
AT_WORKSPACE=/tmp/practice algo-trainer init

# Disable colors
AT_NO_COLOR=1 algo-trainer list

# Verbose output
AT_VERBOSE=1 algo-trainer challenge easy
```

See [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) for full list.

---

## Common Use Cases

### Use Case 1: Daily Practice Routine

**Goal:** Solve one problem every day

```sh
# Morning routine
cd ~/algo-practice

# Start an easy warm-up
algo-trainer challenge easy

# Check your streak
algo-trainer progress

# Solve the problem...

# Mark complete when done
algo-trainer complete <problem-slug>
```

### Use Case 2: Topic-Focused Learning

**Goal:** Master a specific topic (e.g., arrays)

```sh
# Find all array problems
algo-trainer list -t array

# Start with easy ones
algo-trainer challenge easy -t array

# Progress through difficulty levels
algo-trainer list -t array -d medium
algo-trainer challenge <slug>

# Track progress
algo-trainer progress --by-category
```

### Use Case 3: Interview Preparation

**Goal:** Practice company-specific problems

```sh
# Find problems by company (in verbose mode)
algo-trainer list --verbose | grep -i "google"

# Mix of difficulties
algo-trainer challenge -d easy
algo-trainer challenge -d medium
algo-trainer challenge -d hard

# Time yourself (manual timing)
time algo-trainer complete <slug>
```

### Use Case 4: Learning a New Language

**Goal:** Implement solutions in a new language

```sh
# Set your learning language
algo-trainer config set language rust

# Start with familiar problems
algo-trainer challenge two-sum
algo-trainer challenge binary-search

# Use verbose templates for learning
algo-trainer config set preferences.templateStyle comprehensive

# Challenge yourself
algo-trainer challenge -d medium
```

### Use Case 5: Review Past Solutions

**Goal:** Revisit and improve old solutions

```sh
# Check completed problems
ls completed/

# Re-do a problem with better approach
algo-trainer challenge two-sum --force

# Compare with old solution
diff problems/two-sum/solution.ts completed/two-sum/solution.ts

# Mark new version complete
algo-trainer complete two-sum
```

---

## Tips and Best Practices

### Effective Problem-Solving Workflow

1. **Read the problem carefully**
   - Understand input/output formats
   - Note constraints and edge cases
   - Read the examples thoroughly

2. **Plan before coding**
   - Sketch out the approach
   - Consider time/space complexity
   - Think about edge cases

3. **Start simple**
   - Get a working solution first
   - Optimize later if needed
   - Test with examples

4. **Use hints wisely**
   - Try for 15-30 minutes first
   - Use progressive hints
   - Don't skip to the final hint immediately

5. **Review and reflect**
   - Add notes when completing
   - Review the optimal solution
   - Understand why it works

### Organizing Your Practice

**Daily Goals:**

```sh
# Set realistic targets
- Beginners: 1 easy problem/day
- Intermediate: 1 medium problem/day
- Advanced: 1 hard problem/day or 2 medium
```

**Weekly Themes:**

```sh
# Week 1: Arrays and Strings
algo-trainer list -t array
algo-trainer list -t string

# Week 2: Linked Lists and Trees
algo-trainer list -t linked-list
algo-trainer list -t tree

# Week 3: Dynamic Programming
algo-trainer list -t dynamic-programming
```

**Track Your Time:**

```sh
# Use external timer or shell timing
time algo-trainer complete two-sum

# Set time goals
- Easy: 15-20 minutes
- Medium: 30-45 minutes
- Hard: 45-60 minutes
```

### Managing Multiple Languages

```sh
# Practice same problem in different languages
algo-trainer challenge two-sum -l python
algo-trainer complete two-sum --no-archive

algo-trainer challenge two-sum -l rust --force
algo-trainer complete two-sum

# Both solutions kept in completed/
```

### Workspace Organization

```sh
# Keep workspace clean
# Complete or remove abandoned problems regularly

# Archive old workspaces
mv ~/algo-practice ~/algo-practice-2024
algo-trainer init ~/algo-practice-2025

# Use multiple workspaces for different goals
~/interview-prep/     # Interview practice
~/learning-rust/      # Language learning
~/daily-practice/     # Regular practice
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: "Workspace not initialized"

**Symptom:**

```txt
❌ Workspace error: Workspace not initialized. Run "algo-trainer init" to create workspace structure.
```

**Solution:**

```sh
# Initialize workspace first
algo-trainer init

# Or specify workspace path
algo-trainer init ~/my-practice
```

---

#### Issue: "Problem already exists"

**Symptom:**

```txt
⚠️  Problem 'two-sum' already exists in workspace
```

**Solutions:**

```sh
# Option 1: Work on the existing problem
cd problems/two-sum

# Option 2: Force overwrite (loses current progress)
algo-trainer challenge two-sum --force

# Option 3: Complete current one first
algo-trainer complete two-sum
algo-trainer challenge two-sum  # Now will work
```

---

#### Issue: Invalid hint level

**Symptom:**

```txt
❌ Invalid hint level: 5
```

**Solution:**

```sh
# Valid hint levels are 1-3
algo-trainer hint two-sum --level 1
algo-trainer hint two-sum --level 2
algo-trainer hint two-sum --level 3

# Or just get next hint
algo-trainer hint two-sum
```

---

#### Issue: Cannot find problem

**Symptom:**

```txt
❌ Problem 'xyz' not found.
```

**Solutions:**

```sh
# Check exact slug
algo-trainer list -s "problem name"

# Use correct slug from list
algo-trainer list | grep -i "two sum"
# Shows: 1    easy    Two Sum
algo-trainer challenge two-sum  # Use lowercase with hyphens
```

---

#### Issue: Wrong language template generated

**Solution:**

```sh
# Set default language
algo-trainer config set language python

# Or override per-challenge
algo-trainer challenge two-sum -l python --force
```

---

#### Issue: Exit code errors

**Understanding exit codes:**

- `0` - Success
- `1` - General error
- `2` - Usage error (invalid arguments)
- `3` - Config error (e.g., workspace already initialized)
- `4` - Workspace error (not initialized)
- `5` - Problem error (problem not found)

**Debugging:**

```sh
# Check exit code
algo-trainer some-command
echo $?

# Enable verbose output
algo-trainer challenge easy --verbose

# Use environment variable
AT_VERBOSE=1 algo-trainer list
```

---

#### Issue: Environment variable not working

**Symptom:**

```txt
❌ Invalid AT_LANGUAGE: "pythn"
```

**Solution:**

```sh
# Check valid values
algo-trainer --help  # Shows valid options

# Use correct spelling
AT_LANGUAGE=python algo-trainer challenge easy

# Valid languages:
AT_LANGUAGE=typescript
AT_LANGUAGE=javascript
AT_LANGUAGE=python
AT_LANGUAGE=java
AT_LANGUAGE=cpp
AT_LANGUAGE=rust
AT_LANGUAGE=go
```

---

### Getting Help

**Command-specific help:**

```sh
algo-trainer --help
algo-trainer challenge --help
algo-trainer hint --help
algo-trainer complete --help
algo-trainer list --help
algo-trainer progress --help
algo-trainer config --help
```

**Check version:**

```sh
algo-trainer --version
```

**Report issues:**

- GitHub: https://github.com/andreswebs/algo-trainer/issues
- Check existing documentation in `docs/`

---

## Quick Reference

### Essential Commands

| Command                  | Description          | Example                                   |
| ------------------------ | -------------------- | ----------------------------------------- |
| `algo-trainer init`      | Initialize workspace | `algo-trainer init ~/practice`            |
| `algo-trainer challenge` | Start a problem      | `algo-trainer challenge two-sum`          |
| `algo-trainer hint`      | Get hints            | `algo-trainer hint two-sum --level 2`     |
| `algo-trainer complete`  | Mark as complete     | `algo-trainer complete two-sum`           |
| `algo-trainer list`      | Browse problems      | `algo-trainer list -d easy -t array`      |
| `algo-trainer progress`  | View stats           | `algo-trainer progress --detailed`        |
| `algo-trainer config`    | Manage settings      | `algo-trainer config set language python` |

### Useful Flags

| Flag               | Description          | Works With             |
| ------------------ | -------------------- | ---------------------- |
| `-d, --difficulty` | Filter by difficulty | challenge, list        |
| `-t, --tag`        | Filter by tag        | challenge, list        |
| `-l, --language`   | Override language    | challenge              |
| `--force`          | Force overwrite      | challenge, init        |
| `--json`           | JSON output          | list, progress, config |
| `--verbose`        | Detailed output      | list, global           |
| `--help`           | Show help            | all commands           |

### File Locations

| Path                      | Description         |
| ------------------------- | ------------------- |
| `problems/`               | Active challenges   |
| `completed/`              | Archived solutions  |
| `templates/`              | Language templates  |
| `config/`                 | Workspace config    |
| `~/.config/algo-trainer/` | Global config (XDG) |

---

**Happy coding! 🚀**

For more advanced features, see:

- [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)
- [INTERACTIVE_PROMPTS.md](./INTERACTIVE_PROMPTS.md)
- [SHELL_COMPLETIONS.md](./SHELL_COMPLETIONS.md)
