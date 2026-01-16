# Shell Completions

Algo Trainer provides shell completion scripts for popular shells, enabling tab completion for commands, flags, and values.

## Supported Shells

- Zsh
- Bash
- Fish

## Features

- Command completion for all CLI commands (challenge, complete, config, hint, init, list, progress)
- Flag completion with descriptions
- Config subcommand completion
- Difficulty and language option completion with predefined values
- Help flag completion for each command

## Zsh Installation

### Method 1: Manual Installation (Recommended)

1. Copy the completion script to a directory in your `$fpath`:

```bash
# Create a completions directory if it doesn't exist
mkdir -p ~/.zsh/completions

# Copy the completion script
cp completions/_at ~/.zsh/completions/

# Add the directory to your fpath in ~/.zshrc (if not already added)
echo 'fpath=(~/.zsh/completions $fpath)' >> ~/.zshrc

# Initialize completions (if not already done)
echo 'autoload -Uz compinit && compinit' >> ~/.zshrc
```

2. Restart your shell or reload your configuration:

```bash
source ~/.zshrc
```

### Method 2: Using a Plugin Manager

#### Oh My Zsh

```bash
# Copy to Oh My Zsh completions directory
cp completions/_at ~/.oh-my-zsh/completions/

# Reload your shell
source ~/.zshrc
```

#### Zinit

Add to your `.zshrc`:

```bash
zinit ice as"completion"
zinit snippet /path/to/algo-trainer/completions/_at
```

#### Antigen

Add to your `.zshrc`:

```bash
antigen bundle /path/to/algo-trainer/completions
```

### Method 3: System-wide Installation (Requires sudo)

```bash
# Copy to system completions directory
sudo cp completions/_at /usr/local/share/zsh/site-functions/

# Rebuild completion cache
rm -f ~/.zcompdump
exec zsh
```

## Bash Shell

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

## Troubleshooting

### Completions Not Working

1. **Check if completions are enabled:**
   ```bash
   echo $fpath
   # Should include the directory where _at is located
   ```

2. **Rebuild completion cache:**
   ```bash
   rm -f ~/.zcompdump
   compinit
   ```

3. **Verify the completion file is in the right place:**
   ```bash
   # Should show the path to _at
   whence -v _at
   ```

4. **Check for syntax errors:**
   ```bash
   zsh -n completions/_at
   # Should not show any errors
   ```

For Fish:

1. Make sure Fish is restarted or run `source ~/.config/fish/config.fish`
2. Verify the completion file is in the correct location: `ls ~/.config/fish/completions/at.fish`
3. Test if Fish can find the completions: `complete -C"at " | grep challenge`

### Completions Are Slow

If completions are slow, you might want to enable completion caching:

```bash
# Add to ~/.zshrc
zstyle ':completion:*' use-cache on
zstyle ':completion:*' cache-path ~/.zsh/cache
```

### Completions Show Wrong Options

Make sure you're using the latest version of the completion script:

```bash
# Re-copy the completion script
cp completions/_at ~/.zsh/completions/

# Rebuild cache
rm -f ~/.zcompdump
compinit
```

## Development

If you're developing the completion script:

1. Make changes to `completions/_at`
2. Test without restarting your shell:
   ```bash
   # Reload the completion
   unfunction _at
   autoload -U _at
   ```
3. Test the completion:
   ```bash
   at <TAB>
   ```

## Contributing

Found a bug or want to add completion for a new command? Contributions are welcome! Please:

1. Test your changes thoroughly
2. Ensure the script has no syntax errors: `zsh -n completions/_at`
3. Document any new completions
4. Submit a pull request

## See Also

- [Environment Variables](./ENVIRONMENT_VARIABLES.md) - Configuration via environment variables
- [Interactive Prompts](./INTERACTIVE_PROMPTS.md) - Interactive command prompts
  Algo Trainer provides shell completion scripts to enhance your command-line experience with auto-completion for commands, subcommands, and options.

## Updating completions

If you update the Algo Trainer CLI, you may need to reinstall the completion scripts to get the latest commands and options.
