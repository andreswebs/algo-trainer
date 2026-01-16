# Shell Completions

Algo Trainer provides shell completion scripts to enhance your command-line experience with auto-completion for commands, subcommands, and options.

## Fish Shell

### Installation

#### Option 1: Copy to Fish completions directory

```bash
cp completions/at.fish ~/.config/fish/completions/
```

#### Option 2: Add to fish_complete_path

Add the completions directory to your Fish configuration:

```bash
set -g fish_complete_path $fish_complete_path /path/to/algo-trainer/completions
```

### Usage

After installation, you can use Tab completion with the `at` command:

```bash
at <Tab>              # Shows all available commands
at challenge -<Tab>   # Shows all available flags for challenge command
at config <Tab>       # Shows config subcommands (list, get, set, reset)
at config get <Tab>   # Shows available configuration keys
```

### Features

- Command completion for all CLI commands (challenge, complete, config, hint, init, list, progress)
- Flag completion with descriptions
- Config subcommand completion
- Difficulty and language option completion with predefined values
- Help flag completion for each command

## Bash Shell

*Coming soon - CLI-041*

## Zsh Shell

*Coming soon - CLI-042*

## Troubleshooting

### Completions not working

1. Make sure Fish is restarted or run `source ~/.config/fish/config.fish`
2. Verify the completion file is in the correct location: `ls ~/.config/fish/completions/at.fish`
3. Test if Fish can find the completions: `complete -C"at " | grep challenge`

### Updating completions

If you update the Algo Trainer CLI, you may need to reinstall the completion scripts to get the latest commands and options.
