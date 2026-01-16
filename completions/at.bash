#!/usr/bin/env bash
# Bash completion script for Algo Trainer (at) CLI
#
# Installation:
#   Source this file in your .bashrc or .bash_profile:
#     source /path/to/completions/at.bash
#
#   Or copy to system completion directory:
#     sudo cp completions/at.bash /etc/bash_completion.d/at
#     # or
#     cp completions/at.bash ~/.local/share/bash-completion/completions/at

_at_completion() {
    local cur prev words cword
    _init_completion || return

    # All available commands
    local commands="challenge complete config hint init list progress"
    
    # Global flags available for all commands
    local global_flags="--help --version --verbose --quiet --no-color --no-emoji --config -h -v -c"
    
    # Config subcommands
    local config_subcommands="list get set reset"
    
    # Valid configuration keys
    local config_keys="language workspace aiEnabled companies preferences.theme preferences.verbosity preferences.autoSave preferences.templateStyle preferences.useEmoji preferences.useColors"
    
    # Supported languages
    local languages="typescript javascript python java cpp rust go"
    
    # Difficulty levels
    local difficulties="easy medium hard"
    
    # Problem categories (common ones)
    local categories="arrays strings hash-table linked-list trees graphs dynamic-programming sorting searching backtracking greedy binary-search depth-first-search breadth-first-search"
    
    # Template styles
    local template_styles="minimal documented comprehensive"
    
    # Theme options
    local themes="light dark auto"
    
    # Verbosity levels
    local verbosity_levels="quiet normal verbose"

    # Handle first word (command selection)
    if [[ $cword -eq 1 ]]; then
        COMPREPLY=($(compgen -W "$commands $global_flags" -- "$cur"))
        return 0
    fi

    # Get the command (first non-flag argument)
    local command="${words[1]}"
    
    # Handle global flags before command
    if [[ $command == -* ]]; then
        COMPREPLY=($(compgen -W "$commands" -- "$cur"))
        return 0
    fi

    # Command-specific completions
    case "$command" in
        challenge)
            # challenge command flags
            local challenge_flags="--difficulty --category --topic --language --force --random -d -c -t -l -f"
            
            # Handle flag values
            case "$prev" in
                --difficulty|-d)
                    COMPREPLY=($(compgen -W "$difficulties" -- "$cur"))
                    return 0
                    ;;
                --category|-c)
                    COMPREPLY=($(compgen -W "$categories" -- "$cur"))
                    return 0
                    ;;
                --language|-l)
                    COMPREPLY=($(compgen -W "$languages" -- "$cur"))
                    return 0
                    ;;
                --topic|-t)
                    # Topics are free-form, no completion
                    return 0
                    ;;
            esac
            
            # If no flag value expected, suggest flags or difficulty/slug
            if [[ $cur == -* ]]; then
                COMPREPLY=($(compgen -W "$challenge_flags $global_flags" -- "$cur"))
            else
                # Suggest difficulties or problem slugs
                COMPREPLY=($(compgen -W "$difficulties" -- "$cur"))
                # Could add dynamic problem slug completion here
            fi
            ;;
            
        complete)
            # complete command flags
            local complete_flags="--notes --no-archive -n"
            
            case "$prev" in
                --notes|-n)
                    # Notes are free-form text
                    return 0
                    ;;
            esac
            
            if [[ $cur == -* ]]; then
                COMPREPLY=($(compgen -W "$complete_flags $global_flags" -- "$cur"))
            else
                # Could add dynamic problem slug completion from current workspace
                return 0
            fi
            ;;
            
        config)
            # config subcommand handling
            if [[ $cword -eq 2 ]]; then
                # Suggest subcommands
                COMPREPLY=($(compgen -W "$config_subcommands --json --help -h" -- "$cur"))
                return 0
            fi
            
            local subcommand="${words[2]}"
            
            case "$subcommand" in
                get|set|reset)
                    if [[ $cword -eq 3 ]]; then
                        # Suggest config keys
                        COMPREPLY=($(compgen -W "$config_keys" -- "$cur"))
                        return 0
                    elif [[ $cword -eq 4 && $subcommand == "set" ]]; then
                        # Suggest values based on key
                        local key="${words[3]}"
                        case "$key" in
                            language)
                                COMPREPLY=($(compgen -W "$languages" -- "$cur"))
                                ;;
                            preferences.theme)
                                COMPREPLY=($(compgen -W "$themes" -- "$cur"))
                                ;;
                            preferences.verbosity)
                                COMPREPLY=($(compgen -W "$verbosity_levels" -- "$cur"))
                                ;;
                            preferences.templateStyle)
                                COMPREPLY=($(compgen -W "$template_styles" -- "$cur"))
                                ;;
                            aiEnabled|preferences.autoSave|preferences.useEmoji|preferences.useColors)
                                COMPREPLY=($(compgen -W "true false yes no 1 0" -- "$cur"))
                                ;;
                            workspace)
                                # Suggest directory paths
                                _filedir -d
                                ;;
                            *)
                                # No specific completion for other keys
                                return 0
                                ;;
                        esac
                        return 0
                    fi
                    ;;
                list)
                    if [[ $cur == -* ]]; then
                        COMPREPLY=($(compgen -W "--json $global_flags" -- "$cur"))
                    fi
                    ;;
            esac
            ;;
            
        hint)
            # hint command flags
            local hint_flags="--level --all -a"
            
            case "$prev" in
                --level)
                    COMPREPLY=($(compgen -W "1 2 3" -- "$cur"))
                    return 0
                    ;;
            esac
            
            if [[ $cur == -* ]]; then
                COMPREPLY=($(compgen -W "$hint_flags $global_flags" -- "$cur"))
            else
                # Could add dynamic problem slug completion
                return 0
            fi
            ;;
            
        init)
            # init command flags
            local init_flags="--force -f"
            
            if [[ $cur == -* ]]; then
                COMPREPLY=($(compgen -W "$init_flags $global_flags" -- "$cur"))
            else
                # Suggest directory paths for init
                _filedir -d
            fi
            ;;
            
        list)
            # list command flags
            local list_flags="--difficulty --category --search --limit --json --verbose -d -c -s -l"
            
            case "$prev" in
                --difficulty|-d)
                    COMPREPLY=($(compgen -W "$difficulties" -- "$cur"))
                    return 0
                    ;;
                --category|-c)
                    COMPREPLY=($(compgen -W "$categories" -- "$cur"))
                    return 0
                    ;;
                --search|-s)
                    # Search is free-form text
                    return 0
                    ;;
                --limit|-l)
                    # Suggest common limits
                    COMPREPLY=($(compgen -W "10 20 50 100" -- "$cur"))
                    return 0
                    ;;
            esac
            
            if [[ $cur == -* ]]; then
                COMPREPLY=($(compgen -W "$list_flags $global_flags" -- "$cur"))
            fi
            ;;
            
        progress)
            # progress command flags
            local progress_flags="--detailed --category --json -d -c"
            
            if [[ $cur == -* ]]; then
                COMPREPLY=($(compgen -W "$progress_flags $global_flags" -- "$cur"))
            fi
            ;;
            
        *)
            # Unknown command, suggest global flags
            if [[ $cur == -* ]]; then
                COMPREPLY=($(compgen -W "$global_flags" -- "$cur"))
            fi
            ;;
    esac
}

# Register completion function
complete -F _at_completion at
