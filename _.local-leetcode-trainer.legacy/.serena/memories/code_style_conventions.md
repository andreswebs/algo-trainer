# Code Style and Conventions

## General Naming Conventions
- **File Names**: kebab-case (e.g., `test-runner.js`, `ai-challenge.js`)
- **Function Names**: camelCase (e.g., `getCurrentLanguage`, `runJavaScriptTests`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `LANGUAGE_CONFIGS`, `CONFIG_FILE`)
- **Variables**: camelCase for local variables, descriptive names

## JavaScript Code Style
- **Module System**: CommonJS (`require`/`module.exports`)
- **Function Structure**: Clear function declarations with descriptive names
- **Error Handling**: Comprehensive try-catch blocks with user-friendly error messages
- **Console Output**: Emoji-prefixed messages for better UX (🎯, ✅, ❌, 💡, 🧪)

## File Organization Patterns
- Main entry points in `/bin/` directory
- Core logic in `/scripts/` directory
- Each script focuses on single responsibility
- Helper functions exported via module.exports

## Code Documentation
- **Function Headers**: JSDoc-style comments with parameter descriptions
- **Inline Comments**: Explanatory comments for complex logic
- **Error Messages**: User-friendly with actionable guidance
- **Console Output**: Structured with clear visual indicators

## Template Standards
- Language-specific templates in `LANGUAGE_CONFIGS`
- Placeholder syntax: `{{variableName}}`
- TODO comments for user guidance
- Consistent header format with LeetCode problem information

## Testing Conventions
- Test files with `.test.js` suffix
- Test cases exported as modules
- `runAllTests()` function pattern
- Clear test case structure with input/expected/description

## AI Integration Standards
- YAML-based teaching configurations (`trainer.yaml`)
- Progressive hint system with step-by-step guidance
- Contextual feedback based on code analysis
- Proactive teaching approach integrated into all commands