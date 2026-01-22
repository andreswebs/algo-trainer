# Environment Variable Configuration Guide

This document describes the environment variable support for Algo Trainer CLI (CLI-003).

## Overview

Algo Trainer supports configuration via environment variables with the `AT_*` prefix. Environment variables provide a convenient way to configure the application without modifying configuration files, which is especially useful in CI/CD environments, Docker containers, and different development setups.

## Configuration Precedence

Configuration is loaded with the following precedence (highest to lowest):

1. **Environment variables** (`AT_*`)
2. **Configuration file** (`config.json`)
3. **Default values**

This means environment variables will always override values from the configuration file and defaults.

## Supported Environment Variables

### Workspace Configuration

#### `AT_WORKSPACE`

**Type:** String (path)\
**Default:** `''` (empty string)\
**Description:** Specifies the workspace directory path where problems and solutions are stored.

```sh
export AT_WORKSPACE=/home/user/algo-practice
algo-trainer init
```

#### `AT_CONFIG_PATH`

**Type:** String (path)\
**Default:** System default config path\
**Description:** Specifies a custom location for the configuration file.

```sh
export AT_CONFIG_PATH=/custom/path/config.json
algo-trainer config list
```

### Language Settings

#### `AT_LANGUAGE`

**Type:** String\
**Valid values:** `typescript`, `javascript`, `python`, `java`, `cpp`, `rust`, `go`\
**Default:** `typescript`\
**Description:** Sets the default programming language for problem solutions.

```sh
export AT_LANGUAGE=python
algo-trainer challenge easy
```

### Template Settings

#### `AT_TEMPLATE_STYLE`

**Type:** String\
**Valid values:** `minimal`, `documented`, `comprehensive`\
**Default:** `documented`\
**Description:** Specifies the code template style for generated files.

```sh
export AT_TEMPLATE_STYLE=minimal
algo-trainer challenge two-sum
```

## Usage Examples

### Basic Setup

```sh
# Set up your workspace and language preference
export AT_WORKSPACE=~/algo-practice
export AT_LANGUAGE=python

# Initialize and start a challenge
algo-trainer init
algo-trainer challenge easy
```

### CI/CD Environment

```sh
# Configure for automated testing
export AT_WORKSPACE=/workspace
export AT_LANGUAGE=typescript
export AT_NO_COLOR=1
export AT_NO_EMOJI=1
export AT_QUIET=1

# Run commands without interactive prompts
algo-trainer init
algo-trainer challenge two-sum
```

## Testing

To test environment variable configuration:

```sh
# Run tests
deno test test/env.test.ts --allow-env --allow-read --allow-write

# Run integration tests
deno test test/env-integration.test.ts --allow-env --allow-read --allow-write
```

## Implementation Details

- **Module:** `src/cli/env.ts`
- **Integration:** `src/config/manager.ts`
- **Tests:** `test/env.test.ts`, `test/env-integration.test.ts`
