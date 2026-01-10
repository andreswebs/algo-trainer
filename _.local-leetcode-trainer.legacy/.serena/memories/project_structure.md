# Project Structure and Codebase Organization

## Root Level Structure
```
/
├── bin/                          # CLI entry points
│   └── leetcode-trainer.js      # Main CLI executable
├── scripts/                     # Core functionality modules
├── docs/                        # Documentation files
├── easy/                        # Easy difficulty problems
├── medium/                      # Medium difficulty problems  
├── hard/                        # Hard difficulty problems
├── release-notes/               # Version release notes
├── package.json                 # Node.js project configuration
├── README.md                    # Project documentation
└── LICENSE                      # MIT license
```

## Core Scripts Directory (`/scripts/`)
```
scripts/
├── index.js                     # Main module exports
├── config.js                    # Language configuration
├── test-runner.js               # Test execution engine
├── challenge.js                 # Problem generation
├── complete.js                  # Problem completion
├── open-problem.js              # Problem opening utility
├── hint.js                      # Hint system
├── learn.js                     # Learning system
├── ai-challenge.js              # AI-guided challenges
├── setup.js                     # Post-install setup
├── simple-challenge.js          # Basic challenge generation
├── enhanced-challenge.js        # Enhanced challenge features
├── enhanced-hint.js             # Enhanced hint system
├── demo-ai-teaching.js          # AI teaching demonstration
├── generate-teaching-script.js   # Teaching script generator
├── progress-check.js            # Progress tracking
├── simple-scraper.js            # Basic web scraping
└── dynamic/                     # AI teaching engine
```

## Dynamic AI System (`/scripts/dynamic/`)
```
dynamic/
├── ai-teaching-engine.js        # Core AI teaching logic
├── cache-manager.js             # Caching system
├── config.js                    # Dynamic configuration
├── leetcode-api.js              # LeetCode API integration
├── leetcode-scraper.js          # Web scraping utilities
├── offline-manager.js           # Offline functionality
├── problem-manager.js           # Problem management
├── problem-parser.js            # Problem parsing logic
├── test-case-generator.js       # Test case generation
├── fallback-validator.js        # Validation fallbacks
├── condensed-guide.js           # Condensed learning guides
├── interfaces.js                # Type definitions/interfaces
└── problems/                    # Problem database with AI configs
    ├── index.js                 # Problem index
    ├── easy/                    # Easy problems with trainer.yaml
    ├── medium/                  # Medium problems with trainer.yaml
    └── hard/                    # Hard problems with trainer.yaml
```

## Problem Structure
Each problem directory contains:
- `problem-name.js` - Main solution file
- `problem-name.test.js` - Test cases
- `trainer.yaml` - AI teaching configuration (for dynamic problems)

## Documentation Structure (`/docs/`)
```
docs/
├── AI_TEACHING_GUIDE.md         # AI system documentation
├── LEARN_GUIDE.md               # Learning methodology
├── TESTING_GUIDE.md             # Testing instructions
├── RELEASE_PROCESS.md           # Release workflow
└── ai-*.md                      # Various AI integration guides
```

## Key File Patterns
- **Entry Points**: All CLI commands route through `/bin/leetcode-trainer.js`
- **Module Organization**: Each script has single responsibility
- **Problem Database**: Hierarchical by difficulty with AI configurations
- **Testing**: Co-located test files with `.test.js` suffix
- **Documentation**: Comprehensive guides for different aspects
- **AI Integration**: YAML-based configurations for teaching scripts