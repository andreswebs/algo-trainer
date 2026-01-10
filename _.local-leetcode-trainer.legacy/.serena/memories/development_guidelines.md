# Development Guidelines and Design Patterns

## Core Development Principles

### 1. Learning-First Philosophy
- **Deep Understanding Over Quick Fixes**: Focus on teaching algorithmic concepts
- **Progressive Guidance**: Build hints and explanations that escalate thoughtfully
- **Pattern Recognition**: Help users identify common algorithmic patterns
- **Complexity Analysis**: Always include time/space complexity discussions

### 2. AI-Enhanced Experience
- **Proactive Teaching**: AI provides guidance without explicit requests
- **Contextual Feedback**: Responses adapt to user's current approach and skill level
- **Seamless Integration**: AI features built into every command, not separate modes
- **YAML-Driven Configuration**: Teaching scripts use YAML for flexibility

### 3. Code Architecture Patterns

#### Module Organization
- **Single Responsibility**: Each script handles one primary function
- **Clear Interfaces**: Well-defined module exports and imports
- **Error Boundaries**: Comprehensive error handling with recovery strategies
- **User-Friendly Feedback**: Emoji-enhanced console output for better UX

#### Template System
- **Language-Agnostic**: Consistent template patterns across all supported languages
- **Placeholder Variables**: Use `{{variableName}}` syntax for substitution
- **Extensible Design**: Easy to add new languages and templates

#### Testing Strategy
- **Co-located Tests**: Test files alongside solution files
- **Standardized Interface**: `runAllTests()` function pattern
- **Clear Test Structure**: Consistent test case format with descriptive names

### 4. AI Teaching Design Patterns

#### Progressive Hint System
```yaml
# Example trainer.yaml structure
steps:
  - type: intro          # Problem introduction
  - type: think         # Thinking prompts
  - type: hint          # Progressive hints
  - type: optimize      # Optimization guidance
  - type: reflect       # Learning reflection
```

#### Contextual Guidance
- **Code Analysis**: AI understands user's current approach
- **Adaptive Responses**: Hints adjust based on user's skill level and attempts
- **Pattern Teaching**: Focus on algorithmic patterns, not just solutions

### 5. File Naming and Organization Standards
- **Kebab-case**: For file and directory names
- **Descriptive Names**: Clear indication of functionality
- **Consistent Structure**: Parallel organization across difficulty levels
- **Problem-Centric**: Each problem gets its own directory with all related files

### 6. Error Handling and User Experience
- **Graceful Degradation**: System works even if AI features fail
- **Clear Error Messages**: User-friendly explanations with actionable guidance
- **Recovery Strategies**: Fallback options when primary features unavailable
- **Progress Preservation**: Don't lose user work due to system errors

### 7. Multi-Language Support Strategy
- **Template-Based Generation**: Language-specific templates with variable substitution
- **Consistent Testing**: Standardized testing approach across languages
- **Flexible Configuration**: Easy to add new language support
- **Cross-Platform Compatibility**: Commands work on Windows, macOS, and Linux

### 8. Performance and Scalability
- **Caching Strategy**: Cache AI responses and problem data
- **Offline Capability**: Core functionality works without internet
- **Incremental Loading**: Load problems and features on demand
- **Resource Efficiency**: Minimal system resource usage