# algo-trainer

An offline LeetCode practice environment.

**Note**: This is an experiment in AI spec-driven development. Don't take it too seriously.

## The story

This is a work-in-progress. I started this repo to test the capabilities of Cursor with the `Claude Opus 4.5` model and investigate orchestrating agents in parallel. This is essentially an experiment for `$WORK`, but may turn out to be a useful pedagogical tool. I recently started on a project which gave me access to Cursor and `Claude Opus 4.5`, and I felt I needed a deep dive into their capabilities.

This repo was originally a fork of [karote00/local-leetcode-trainer](https://github.com/karote00/local-leetcode-trainer). I'm testing how well Cursor with `Opus 4.5` can convert it to Deno + TypeScript and implement various improvements to the CLI.

## Shell Completions

Bash shell completions are available to enhance the CLI experience with auto-completion of commands, flags, and values.

### Installation

#### Bash

**Option 1: User installation (recommended)**

Add the following line to your `~/.bashrc` or `~/.bash_profile`:

```bash
source /path/to/algo-trainer/completions/at.bash
```

Then reload your shell configuration:

```bash
source ~/.bashrc
```

**Option 2: System-wide installation**

Copy the completion script to your system's bash completion directory:

```bash
# On most Linux systems
sudo cp completions/at.bash /etc/bash_completion.d/at

# On macOS with bash-completion installed via Homebrew
cp completions/at.bash $(brew --prefix)/etc/bash_completion.d/at

# Or to user's local completion directory
mkdir -p ~/.local/share/bash-completion/completions
cp completions/at.bash ~/.local/share/bash-completion/completions/at
```

### Features

The bash completion script provides:

- **Command completion**: All available commands (`challenge`, `complete`, `config`, `hint`, `init`, `list`, `progress`)
- **Flag completion**: Global flags (`--help`, `--version`, `--verbose`, etc.) and command-specific flags
- **Value completion**: 
  - Languages: `typescript`, `javascript`, `python`, `java`, `cpp`, `rust`, `go`
  - Difficulties: `easy`, `medium`, `hard`
  - Config keys and their valid values
  - Template styles: `minimal`, `documented`, `comprehensive`
  - And more contextual completions

### Usage Examples

After installation, you can use tab completion:

```bash
at <TAB>                    # Shows all commands
at ch<TAB>                  # Completes to "challenge"
at challenge --<TAB>        # Shows challenge flags
at challenge -d <TAB>       # Shows difficulty options
at config set <TAB>         # Shows config keys
at config set language <TAB> # Shows language options
```

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

## Features

- **Shell Completions**: Tab completion for Zsh (Bash and Fish coming soon). See [docs/SHELL_COMPLETIONS.md](docs/SHELL_COMPLETIONS.md) for installation instructions.
- **Environment Variables**: Configure via environment variables. See [docs/ENVIRONMENT_VARIABLES.md](docs/ENVIRONMENT_VARIABLES.md).
- **Interactive Prompts**: User-friendly interactive prompts. See [docs/INTERACTIVE_PROMPTS.md](docs/INTERACTIVE_PROMPTS.md).

## Authors

**Andre Silva** - [@andreswebs](https://github.com/andreswebs)

## License

This project is licensed under the [GPL-3.0-or-later](LICENSE).
