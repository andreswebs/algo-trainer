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

```bash
deno task build
```

This creates the `bin/at` executable.

### First Time Setup

1. **Initialize a workspace** in your desired practice directory:

```bash
# Initialize in current directory
at init

# Or specify a path
at init ~/algo-practice
```

This creates the following structure:
```
your-workspace/
├── problems/      # Active challenges
├── completed/     # Solved problems archive
├── templates/     # Language templates
└── config/        # Workspace configuration
```

2. **Verify installation**:

```bash
at --version
at --help
```

---

## Basic Workflow

The typical workflow for practicing algorithmic problems:

### 1. Browse Available Problems

```bash
# List all problems
at list

# Filter by difficulty
at list -d easy
at list -d medium
at list -d hard

# Search by keyword
at list -s "two sum"

# Filter by tag/category
at list -t array
at list -c string

# Show more details
at list --verbose

# Get JSON output
at list --json
```

### 2. Start a Challenge

```bash
# Start a specific problem
at challenge two-sum

# Start a random problem by difficulty
at challenge easy
at challenge medium
at challenge hard

# Start any random problem
at challenge --random

# Use a specific language
at challenge two-sum -l python
at challenge -d hard -l rust

# Filter by topic
at challenge -t "dynamic-programming"
```

**What happens:**
- Problem files are generated in `problems/[problem-slug]/`
- You get a solution template in your chosen language
- Problem description, test cases, and metadata are included

### 3. Solve the Problem

Navigate to the problem directory and work on your solution:

```bash
cd problems/two-sum/
# Edit solution.ts (or solution.py, solution.java, etc.)
```

### 4. Get Hints (Optional)

If you're stuck, get progressive hints:

```bash
# Get the next hint
at hint two-sum

# Get a specific hint level (1-3)
at hint two-sum --level 2

# Show all hints at once
at hint two-sum --all
```

**Hint Levels:**
1. **General Approach** - High-level strategy
2. **Algorithm/Data Structure** - Specific techniques to use
3. **Solution Strategy** - Detailed implementation guidance

### 5. Complete the Problem

When you've solved it:

```bash
# Mark as complete (archives to completed/)
at complete two-sum

# Complete without archiving
at complete two-sum --no-archive

# Add solution notes
at complete two-sum
# (You'll be prompted for notes)
```

---

## Working with Problems

### Problem Selection Strategies

**By Difficulty:**
```bash
# Good for beginners
at challenge easy

# Intermediate practice
at challenge medium

# Advanced challenges
at challenge hard
```

**By Topic:**
```bash
# Focus on specific data structures
at list -t array
at list -t tree
at list -t graph

# Focus on algorithms
at list -t "dynamic-programming"
at list -t greedy
at list -t sorting
```

**By Company:**
```bash
# Practice problems from specific companies
at list --verbose  # Shows company tags
```

### Managing Active Problems

```bash
# See what you're currently working on
ls problems/

# Multiple problems at once is okay
at challenge binary-search
at challenge valid-parentheses
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

```bash
# Basic progress overview
at progress

# Detailed breakdown by difficulty
at progress --detailed

# Progress by category/topic
at progress --by-category

# Get JSON output for scripts
at progress --json
```

**Sample Output:**
```
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

```bash
# View completed problems
ls completed/

# Review a past solution
cat completed/two-sum/solution.ts
cat completed/two-sum/.metadata.json
```

**Metadata includes:**
- Completion date
- Hints used
- Time spent (if tracked)
- Your notes

---

## Configuration

### View Configuration

```bash
# Show all settings
at config list

# Get specific value
at config get language
at config get workspace
at config get preferences.theme
```

### Update Settings

```bash
# Set default language
at config set language python
at config set language typescript
at config set language java

# Set preferences
at config set preferences.theme dark
at config set preferences.verbosity verbose
at config set preferences.useEmoji false

# Enable/disable AI features
at config set aiEnabled true
```

### Supported Languages

```bash
at config set language <language>
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

```bash
# Reset specific key
at config reset language

# Reset entire configuration
at config reset --all
```

### Environment Variables

Override configuration with environment variables:

```bash
# Temporary language override
AT_LANGUAGE=python at challenge two-sum

# Custom workspace location
AT_WORKSPACE=/tmp/practice at init

# Disable colors
AT_NO_COLOR=1 at list

# Verbose output
AT_VERBOSE=1 at challenge easy
```

See [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) for full list.

---

## Common Use Cases

### Use Case 1: Daily Practice Routine

**Goal:** Solve one problem every day

```bash
# Morning routine
cd ~/algo-practice

# Start an easy warm-up
at challenge easy

# Check your streak
at progress

# Solve the problem...

# Mark complete when done
at complete <problem-slug>
```

### Use Case 2: Topic-Focused Learning

**Goal:** Master a specific topic (e.g., arrays)

```bash
# Find all array problems
at list -t array

# Start with easy ones
at challenge easy -t array

# Progress through difficulty levels
at list -t array -d medium
at challenge <slug>

# Track progress
at progress --by-category
```

### Use Case 3: Interview Preparation

**Goal:** Practice company-specific problems

```bash
# Find problems by company (in verbose mode)
at list --verbose | grep -i "google"

# Mix of difficulties
at challenge -d easy
at challenge -d medium
at challenge -d hard

# Time yourself (manual timing)
time at complete <slug>
```

### Use Case 4: Learning a New Language

**Goal:** Implement solutions in a new language

```bash
# Set your learning language
at config set language rust

# Start with familiar problems
at challenge two-sum
at challenge binary-search

# Use verbose templates for learning
at config set preferences.templateStyle comprehensive

# Challenge yourself
at challenge -d medium
```

### Use Case 5: Review Past Solutions

**Goal:** Revisit and improve old solutions

```bash
# Check completed problems
ls completed/

# Re-do a problem with better approach
at challenge two-sum --force

# Compare with old solution
diff problems/two-sum/solution.ts completed/two-sum/solution.ts

# Mark new version complete
at complete two-sum
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
```bash
# Set realistic targets
- Beginners: 1 easy problem/day
- Intermediate: 1 medium problem/day
- Advanced: 1 hard problem/day or 2 medium
```

**Weekly Themes:**
```bash
# Week 1: Arrays and Strings
at list -t array
at list -t string

# Week 2: Linked Lists and Trees
at list -t linked-list
at list -t tree

# Week 3: Dynamic Programming
at list -t dynamic-programming
```

**Track Your Time:**
```bash
# Use external timer or shell timing
time at complete two-sum

# Set time goals
- Easy: 15-20 minutes
- Medium: 30-45 minutes  
- Hard: 45-60 minutes
```

### Managing Multiple Languages

```bash
# Practice same problem in different languages
at challenge two-sum -l python
at complete two-sum --no-archive

at challenge two-sum -l rust --force
at complete two-sum

# Both solutions kept in completed/
```

### Workspace Organization

```bash
# Keep workspace clean
# Complete or remove abandoned problems regularly

# Archive old workspaces
mv ~/algo-practice ~/algo-practice-2024
at init ~/algo-practice-2025

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
```
❌ Workspace error: Workspace not initialized. Run "at init" to create workspace structure.
```

**Solution:**
```bash
# Initialize workspace first
at init

# Or specify workspace path
at init ~/my-practice
```

---

#### Issue: "Problem already exists"

**Symptom:**
```
⚠️  Problem 'two-sum' already exists in workspace
```

**Solutions:**
```bash
# Option 1: Work on the existing problem
cd problems/two-sum

# Option 2: Force overwrite (loses current progress)
at challenge two-sum --force

# Option 3: Complete current one first
at complete two-sum
at challenge two-sum  # Now will work
```

---

#### Issue: Invalid hint level

**Symptom:**
```
❌ Invalid hint level: 5
```

**Solution:**
```bash
# Valid hint levels are 1-3
at hint two-sum --level 1
at hint two-sum --level 2
at hint two-sum --level 3

# Or just get next hint
at hint two-sum
```

---

#### Issue: Cannot find problem

**Symptom:**
```
❌ Problem 'xyz' not found.
```

**Solutions:**
```bash
# Check exact slug
at list -s "problem name"

# Use correct slug from list
at list | grep -i "two sum"
# Shows: 1    easy    Two Sum
at challenge two-sum  # Use lowercase with hyphens
```

---

#### Issue: Wrong language template generated

**Solution:**
```bash
# Set default language
at config set language python

# Or override per-challenge
at challenge two-sum -l python --force
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
```bash
# Check exit code
at some-command
echo $?

# Enable verbose output
at challenge easy --verbose

# Use environment variable
AT_VERBOSE=1 at list
```

---

#### Issue: Environment variable not working

**Symptom:**
```
❌ Invalid AT_LANGUAGE: "pythn"
```

**Solution:**
```bash
# Check valid values
at --help  # Shows valid options

# Use correct spelling
AT_LANGUAGE=python at challenge easy

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
```bash
at --help
at challenge --help
at hint --help
at complete --help
at list --help
at progress --help
at config --help
```

**Check version:**
```bash
at --version
```

**Report issues:**
- GitHub: https://github.com/andreswebs/algo-trainer/issues
- Check existing documentation in `docs/`

---

## Quick Reference

### Essential Commands

| Command | Description | Example |
|---------|-------------|---------|
| `at init` | Initialize workspace | `at init ~/practice` |
| `at challenge` | Start a problem | `at challenge two-sum` |
| `at hint` | Get hints | `at hint two-sum --level 2` |
| `at complete` | Mark as complete | `at complete two-sum` |
| `at list` | Browse problems | `at list -d easy -t array` |
| `at progress` | View stats | `at progress --detailed` |
| `at config` | Manage settings | `at config set language python` |

### Useful Flags

| Flag | Description | Works With |
|------|-------------|------------|
| `-d, --difficulty` | Filter by difficulty | challenge, list |
| `-t, --tag` | Filter by tag | challenge, list |
| `-l, --language` | Override language | challenge |
| `--force` | Force overwrite | challenge, init |
| `--json` | JSON output | list, progress, config |
| `--verbose` | Detailed output | list, global |
| `--help` | Show help | all commands |

### File Locations

| Path | Description |
|------|-------------|
| `problems/` | Active challenges |
| `completed/` | Archived solutions |
| `templates/` | Language templates |
| `config/` | Workspace config |
| `~/.config/algo-trainer/` | Global config (XDG) |

---

**Happy coding! 🚀**

For more advanced features, see:
- [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)
- [INTERACTIVE_PROMPTS.md](./INTERACTIVE_PROMPTS.md)
- [SHELL_COMPLETIONS.md](./SHELL_COMPLETIONS.md)
