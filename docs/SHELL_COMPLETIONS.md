# Shell Completions

Algo Trainer provides shell completion scripts for popular shells, enabling tab completion for commands, flags, and values.

## Supported Shells

- **Zsh** (`completions/_at`)
- Bash (coming soon)
- Fish (coming soon)

## Features

The completion scripts provide intelligent tab completion for:

- **Commands**: `challenge`, `complete`, `config`, `hint`, `init`, `list`, `progress`
- **Global flags**: `--help`, `--version`, `--verbose`, `--quiet`, `--no-color`, `--no-emoji`, `--config`
- **Command-specific flags**: Each command has its own set of flags and options
- **Dynamic values**: Completion of difficulty levels, languages, categories, and more
- **Subcommands**: Config subcommands (`get`, `set`, `list`, `reset`)
- **Config keys**: Completion of valid configuration keys and their values

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

## Usage Examples

Once installed, you can use tab completion for all commands and options:

```bash
# Command completion
at <TAB>
# Shows: challenge  complete  config  hint  init  list  progress

# Difficulty completion
at challenge <TAB>
# Shows: easy  medium  hard

# Flag completion
at challenge --<TAB>
# Shows: --category  --difficulty  --force  --help  --language  --random  --topic

# Language completion
at challenge --language <TAB>
# Shows: typescript  javascript  python  java  cpp  rust  go

# Config subcommand completion
at config <TAB>
# Shows: get  list  reset  set

# Config key completion
at config get <TAB>
# Shows: language  workspace  aiEnabled  companies  preferences.theme  ...

# Config value completion (for set)
at config set language <TAB>
# Shows: typescript  javascript  python  java  cpp  rust  go

at config set preferences.theme <TAB>
# Shows: light  dark  auto
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
