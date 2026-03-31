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
