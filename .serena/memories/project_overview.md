# Project Overview

## What is Algo Trainer?

Algo Trainer is a CLI application for practicing algorithmic problem solving. It helps developers improve their coding skills by providing:

- Coding challenges with varying difficulty levels (easy, medium, hard)
- Progressive hint system
- Multi-language support (TypeScript, JavaScript, Python, Java, C++, Rust, Go)
- AI-powered teaching features (planned)
- Progress tracking

## Project Status

This is a **complete rewrite** from a legacy Node.js application. The original codebase is preserved in `_.local-leetcode-trainer.legacy/` for reference only.

### Clean Break Approach

- **NO backwards compatibility** with the legacy Node.js application
- **NO migration utilities** for config, workspaces, or data
- **NO command compatibility** with previous CLI syntax
- All formats and data structures are new

### Development Phases

| Phase   | Description                            | Status         |
| ------- | -------------------------------------- | -------------- |
| Phase 1 | Foundation & Core Infrastructure       | ✅ COMPLETED   |
| Phase 2 | Problem Management System              | ⏳ Not Started |
| Phase 3 | CLI Interface & Commands               | ⏳ Not Started |
| Phase 4 | AI Teaching Engine & Advanced Features | ⏳ Not Started |
| Phase 5 | Testing, Documentation & Polish        | ⏳ Not Started |

### Phase 1 Completed Work

- All utility modules (`output`, `display`, `errors`, `fs`, `validation`, `http`)
- Type system (`global.ts`, `external.ts`)
- XDG-compliant configuration system
- Basic CLI skeleton with argument parsing
- HTTP client with rate limiting

## Key Design Principles

1. **12-Factor CLI Principles**: Proper stdout/stderr separation, environment variables, stateless design
2. **XDG Compliance**: Configuration follows XDG Base Directory Specification
3. **Type Safety**: Strict TypeScript with comprehensive type coverage
4. **Modern Deno**: Leverages Deno's built-in capabilities (testing, formatting, linting)
