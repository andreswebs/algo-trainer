//! Tests for {{PROBLEM_TITLE}}
//!
//! Date: {{DATE}}

mod solution;
use solution::{{FUNCTION_NAME}};

#[cfg(test)]
mod tests {
    use super::*;

    /// Examples from the problem description
    mod examples {
{{EXAMPLES}}
    }

    /// Edge cases
    mod edge_cases {
        use super::*;

        #[test]
        #[ignore = "TODO: Add edge case tests"]
        fn test_edge_case() {
            // TODO: Add edge case tests
        }
    }
}
