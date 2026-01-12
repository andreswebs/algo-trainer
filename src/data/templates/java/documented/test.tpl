/**
 * Tests for {{PROBLEM_TITLE}}
 *
 * @date {{DATE}}
 */

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Disabled;
import static org.junit.jupiter.api.Assertions.*;

@DisplayName("{{PROBLEM_TITLE}}")
class SolutionTest {
    private final Solution solution = new Solution();

    /**
     * Examples from the problem description
     */
    @Nested
    @DisplayName("Examples")
    class Examples {
{{EXAMPLES}}
    }

    /**
     * Edge cases
     */
    @Nested
    @DisplayName("Edge Cases")
    class EdgeCases {
        @Test
        @Disabled("TODO: Add edge case tests")
        void shouldHandleEdgeCase() {
            // TODO: Add edge case tests
        }
    }
}
