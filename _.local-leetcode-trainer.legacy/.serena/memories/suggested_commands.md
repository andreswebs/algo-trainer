# Suggested Commands and CLI Usage

## Primary CLI Commands (Global Usage)
All commands available via `lct`, `local-leetcode-trainer`, or `leetcode-trainer` (deprecated).

### Core Practice Commands
```bash
# Generate practice problems
lct challenge easy 1        # Generate 1 easy problem
lct challenge medium 2      # Generate 2 medium problems
lct challenge hard 1        # Generate 1 hard problem

# Test solutions
lct test [problem-path]     # Run tests for specific problem
lct test                    # Run tests for current problem

# Get hints and help
lct hint two-sum 1          # Progressive AI-powered hints
lct learn two-sum           # Deep algorithm analysis

# Open problems in editor
lct open two-sum            # Open problem for solving

# Complete and submit solutions
lct complete two-sum        # Mark problem as completed
```

### Configuration Commands
```bash
lct lang                    # Switch programming language
lct config                  # View/modify configuration
```

### AI Teaching Commands
```bash
lct ai-challenge two-sum    # AI-guided problem solving
lct ai-help                 # General AI assistance
lct ai-help "question"      # Ask specific questions
```

## Development Commands (Local Testing)
⚠️ **Important**: When developing locally, always use `node` directly, NOT `lct`:

### Local Testing Commands
```bash
# Generate challenges locally
node scripts/challenge.js easy 1
node scripts/challenge.js medium 2
node scripts/challenge.js hard 1

# Test generated problems locally
node scripts/test-runner.js easy/problem-name
node easy/problem-name/problem-name.test.js

# Run other local scripts
node scripts/open-problem.js
node scripts/complete.js
node scripts/hint.js
node scripts/learn.js
node scripts/simple-challenge.js easy 1
node scripts/ai-challenge.js two-sum
```

## Package Scripts
```bash
npm test                    # Run test runner
npm run open                # Open problem script
npm run challenge           # Challenge generation
npm run complete            # Complete problem script
npm run lang                # Language configuration
npm run hint                # Hint system
npm run learn               # Learning system
```

## Installation Commands
```bash
npm install -g local-leetcode-trainer   # Global installation
npm install                             # Local dependencies
```

## System Commands (macOS)
```bash
# File system navigation
find . -name "*.js" -type f     # Find JavaScript files
grep -r "pattern" .             # Search for patterns
ls -la                          # List directory contents
cd path/to/directory            # Change directory

# Git operations
git status                      # Check repository status
git add .                       # Stage all changes
git commit -m "message"         # Commit changes
git push origin branch-name     # Push to remote
```