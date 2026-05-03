/*
 * {{PROBLEM_TITLE}}
 *
 * ## Difficulty
 * {{PROBLEM_DIFFICULTY}}
 *
 * ## Tags
 * {{TAGS}}
 *
 * ## Companies
 * {{COMPANIES}}
 *
 * ## Constraints
 * {{CONSTRAINTS}}
 *
 * ## Problem
 * {{PROBLEM_DESCRIPTION}}
 *
 * See: {{LEETCODE_URL}}
 * Date: {{DATE}}
 *
 * Run locally:
 *   cmake -S . -B build && cmake --build build
 *   ./bin/{{PROBLEM_SLUG}} input.txt
 *
 * The Solution class below is paste-compatible with the LeetCode editor.
 * The harness around it (leetcode.hpp + main) is local-only and stripped
 * out by the LC_LOCAL guard when submitting.
 */

using namespace std;

#ifdef LC_LOCAL
#include "leetcode.hpp"
#else
#define dbg(...)
#endif

class Solution {
public:
    /*
     * ## Approach
     * TODO: Describe your approach in detail
     *
     * ## Algorithm
     * 1. TODO: Step 1
     * 2. TODO: Step 2
     *
     * ## Complexity Analysis
     * - Time:  O(?) — TODO: explain
     * - Space: O(?) — TODO: explain
     */
    {{SIGNATURE}} {
        // TODO: Implement your solution here
        throw std::runtime_error("Not implemented");
    }
};

#ifdef LC_LOCAL
int main(int argc, char **argv) {
    run(&Solution::{{FUNCTION_NAME}}, argc, argv);
}
#endif
