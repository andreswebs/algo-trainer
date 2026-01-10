# Task Completion Guidelines

## What to Do When a Task is Completed

### 1. Code Quality Checks
- **Linting**: No formal linter configured, follow existing code style patterns
- **Code Review**: Ensure consistency with existing codebase patterns
- **Error Handling**: Implement comprehensive try-catch blocks with user-friendly messages
- **Documentation**: Add JSDoc-style comments for functions and complex logic

### 2. Testing Requirements
#### For Development Changes
```bash
# Test local changes (DO NOT use global lct commands)
node scripts/test-runner.js
node scripts/challenge.js easy 1
node scripts/test-runner.js easy/problem-name
```

#### For New Features
- Test all supported languages (JavaScript, Python, Java, C++)
- Verify template generation works correctly
- Test AI teaching integration if applicable
- Ensure backward compatibility with existing problems

### 3. Validation Steps
#### Problem Generation
```bash
# Test problem generation for each difficulty
node scripts/challenge.js easy 1
node scripts/challenge.js medium 1  
node scripts/challenge.js hard 1
```

#### Testing Framework
- Verify test files generate with correct format
- Check that `runAllTests()` function exists
- Ensure test cases have proper structure (input/expected/description)

#### Language Switching
```bash
node scripts/config.js          # Test language configuration
```

### 4. AI Teaching System Verification
If changes involve AI teaching:
- Verify `trainer.yaml` files are properly formatted
- Test AI guidance progression
- Ensure contextual hints work correctly
- Validate teaching script generation

### 5. Documentation Updates
- Update README.md if new features added
- Update relevant documentation in `/docs/`
- Add release notes if significant changes
- Update version number in package.json if needed

### 6. Git Workflow
```bash
git status                       # Check changes
git add .                        # Stage changes
git commit -m "descriptive message"  # Commit with clear message
git push origin branch-name      # Push to remote branch
```

### 7. Pre-Release Verification
For releases:
- Test global installation: `npm install -g ./`
- Verify all CLI commands work as expected
- Test on clean environment if possible
- Update version number and release notes

## Common Gotchas to Avoid
- **Never test with global `lct` during development** - use `node` directly
- **Check file permissions** on generated problem files
- **Verify module exports** are properly structured
- **Test template variable substitution** works correctly
- **Ensure cross-platform compatibility** (Windows/macOS/Linux paths)