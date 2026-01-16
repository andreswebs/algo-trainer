# Fish shell completions for Algo Trainer (at)
#
# Installation:
#   Copy this file to ~/.config/fish/completions/at.fish
#   Or add to your fish_complete_path:
#     set -g fish_complete_path $fish_complete_path /path/to/algo-trainer/completions

# Main command description
complete -c at -f -d 'Algo Trainer - Practice algorithmic problem solving'

# Global flags
complete -c at -s h -l help -d 'Show help message'
complete -c at -s v -l version -d 'Show version information'
complete -c at -l verbose -d 'Enable verbose output'
complete -c at -l quiet -d 'Suppress non-essential output'
complete -c at -l no-color -d 'Disable colored output'
complete -c at -l no-emoji -d 'Disable emoji in output'
complete -c at -s c -l config -d 'Specify custom config file path' -r

# Commands
complete -c at -n '__fish_use_subcommand' -a challenge -d 'Start a new coding challenge'
complete -c at -n '__fish_use_subcommand' -a complete -d 'Mark a problem as completed'
complete -c at -n '__fish_use_subcommand' -a config -d 'Manage configuration settings'
complete -c at -n '__fish_use_subcommand' -a hint -d 'Get progressive hints for a problem'
complete -c at -n '__fish_use_subcommand' -a init -d 'Initialize a new workspace'
complete -c at -n '__fish_use_subcommand' -a list -d 'List and filter available problems'
complete -c at -n '__fish_use_subcommand' -a progress -d 'View progress stats and completion'

# challenge command options
complete -c at -n '__fish_seen_subcommand_from challenge' -s d -l difficulty -d 'Filter by difficulty' -a 'easy medium hard'
complete -c at -n '__fish_seen_subcommand_from challenge' -s c -l category -d 'Filter by category'
complete -c at -n '__fish_seen_subcommand_from challenge' -s t -l topic -d 'Filter by topic'
complete -c at -n '__fish_seen_subcommand_from challenge' -s l -l language -d 'Override default language' -a 'typescript javascript python java cpp rust go'
complete -c at -n '__fish_seen_subcommand_from challenge' -s f -l force -d 'Overwrite existing files'
complete -c at -n '__fish_seen_subcommand_from challenge' -l random -d 'Start random problem'
complete -c at -n '__fish_seen_subcommand_from challenge' -s h -l help -d 'Show help message'

# complete command options
complete -c at -n '__fish_seen_subcommand_from complete' -s n -l notes -d 'Add completion notes' -r
complete -c at -n '__fish_seen_subcommand_from complete' -l no-archive -d 'Keep files in current workspace'
complete -c at -n '__fish_seen_subcommand_from complete' -s h -l help -d 'Show help message'

# config command subcommands
complete -c at -n '__fish_seen_subcommand_from config; and not __fish_seen_subcommand_from list get set reset' -a list -d 'List all configuration values'
complete -c at -n '__fish_seen_subcommand_from config; and not __fish_seen_subcommand_from list get set reset' -a get -d 'Get a configuration value'
complete -c at -n '__fish_seen_subcommand_from config; and not __fish_seen_subcommand_from list get set reset' -a set -d 'Set a configuration value'
complete -c at -n '__fish_seen_subcommand_from config; and not __fish_seen_subcommand_from list get set reset' -a reset -d 'Reset configuration to defaults'

# config command options
complete -c at -n '__fish_seen_subcommand_from config' -l json -d 'Output in JSON format'
complete -c at -n '__fish_seen_subcommand_from config' -s h -l help -d 'Show help message'

# config keys for get/set/reset
set -l config_keys 'language' 'workspace' 'aiEnabled' 'companies' 'preferences.theme' 'preferences.verbosity' 'preferences.autoSave' 'preferences.templateStyle' 'preferences.useEmoji' 'preferences.useColors'
complete -c at -n '__fish_seen_subcommand_from config; and __fish_seen_subcommand_from get' -a "$config_keys" -d 'Configuration key'
complete -c at -n '__fish_seen_subcommand_from config; and __fish_seen_subcommand_from set' -a "$config_keys" -d 'Configuration key'
complete -c at -n '__fish_seen_subcommand_from config; and __fish_seen_subcommand_from reset' -a "$config_keys" -d 'Configuration key'

# hint command options
complete -c at -n '__fish_seen_subcommand_from hint' -l level -d 'Get specific hint level (1-3)' -a '1 2 3'
complete -c at -n '__fish_seen_subcommand_from hint' -s a -l all -d 'Show all available hints'
complete -c at -n '__fish_seen_subcommand_from hint' -s h -l help -d 'Show help message'

# init command options
complete -c at -n '__fish_seen_subcommand_from init' -s f -l force -d 'Reinitialize existing workspace'
complete -c at -n '__fish_seen_subcommand_from init' -s h -l help -d 'Show help message'

# list command options
complete -c at -n '__fish_seen_subcommand_from list' -s d -l difficulty -d 'Filter by difficulty' -a 'easy medium hard'
complete -c at -n '__fish_seen_subcommand_from list' -s c -l category -d 'Filter by category'
complete -c at -n '__fish_seen_subcommand_from list' -s s -l search -d 'Search in title/description' -r
complete -c at -n '__fish_seen_subcommand_from list' -s l -l limit -d 'Limit results' -r
complete -c at -n '__fish_seen_subcommand_from list' -l json -d 'Output in JSON format'
complete -c at -n '__fish_seen_subcommand_from list' -l verbose -d 'Show full descriptions'
complete -c at -n '__fish_seen_subcommand_from list' -s h -l help -d 'Show help message'

# progress command options
complete -c at -n '__fish_seen_subcommand_from progress' -s d -l detailed -d 'Show detailed breakdown'
complete -c at -n '__fish_seen_subcommand_from progress' -s c -l category -d 'Group by category'
complete -c at -n '__fish_seen_subcommand_from progress' -l json -d 'Output in JSON format'
complete -c at -n '__fish_seen_subcommand_from progress' -s h -l help -d 'Show help message'
