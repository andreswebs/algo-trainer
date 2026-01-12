# algo-trainer

An offline LeetCode practice environment.

**Note**: This is an experiment in AI spec-driven development. Don't take it too seriously.

## The story

This is a work-in-progress. I started this repo to test the capabilities of Cursor with the `Claude Opus 4.5` model and investigate orchestrating agents in parallel. This is essentially an experiment for `$WORK`, but may turn out to be a useful pedagogical tool. I recently started on a project which gave me access to Cursor and `Claude Opus 4.5`, and I felt I needed a deep dive into their capabilities.

This repo was originally a fork of [karote00/local-leetcode-trainer](https://github.com/karote00/local-leetcode-trainer). I'm testing how well Cursor with `Opus 4.5` can convert it to Deno + TypeScript and implement various improvements to the CLI.

## AI Development Workflow

This project serves as a testbed for various AI-assisted development strategies. The first one is parallel agent orchestration.

### Parallel agent orchestration

#### Components

- **Dockerized Cursor CLI**: Running Cursor in a containerized environment with API key authentication: this allows safer YOLO mode
- **Worktrunk (wt)**: Git worktree management tool: this facilitates branching and parallel development workflows
- **Parallel Agent Orchestration**: Multiple AI agents running simultaneously in separate worktrees, each handling different aspects of development

### Workflow Process

1. **Worktree Setup**: Use `worktrunk` to create isolated git worktrees for different features or experiments
2. **Agent Deployment**: One container is created per worktree, with a separate agent context
3. **Parallel Execution**: Multiple agents work simultaneously on tasks
4. **AI reviews**: PRs are reviewed separately by GitHub Copilot

## Authors

**Andre Silva** - [@andreswebs](https://github.com/andreswebs)

## License

This project is licensed under the [GPL-3.0-or-later](LICENSE).
