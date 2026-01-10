# Tech Stack and Architecture

## Core Technology
- **Runtime**: Node.js (>=24.0.0)
- **Primary Language**: JavaScript (ES modules and CommonJS)
- **CLI Framework**: Commander.js
- **Configuration**: YAML (js-yaml)

## Multi-Language Support
### JavaScript
- Extension: `.js`
- Test Command: `node`
- Module exports with CommonJS

### Python
- Extension: `.py`
- Test Command: `python3`
- Function-based structure

### Java
- Extension: `.java`
- Test Command: `javac {{file}} && java {{className}}`
- Class-based structure

### C++
- Extension: `.cpp`
- Test Command: `g++ -o {{output}} {{file}} && ./{{output}}`

## Architecture Patterns
- **Modular Design**: Separate scripts for different functionalities
- **CLI-First**: Primary interface through command-line tools
- **Dynamic Problem Loading**: AI-enhanced problem management system
- **Template-Based Generation**: Language-specific code templates
- **YAML Configuration**: AI teaching scripts use YAML for configuration

## Key Dependencies
- `commander@^14.0.0`: CLI argument parsing and command structure
- `js-yaml@^4.1.0`: YAML parsing for AI teaching configurations

## File Organization
- `/bin/`: CLI entry points
- `/scripts/`: Core functionality modules
- `/scripts/dynamic/`: AI teaching engine and problem management
- `/docs/`: Documentation and guides
- Problem directories: `/easy/`, `/medium/`, `/hard/`