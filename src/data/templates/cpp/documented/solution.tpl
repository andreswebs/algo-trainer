/*
 * {{PROBLEM_TITLE}} ({{PROBLEM_DIFFICULTY}})
 * Tags: {{TAGS}}
 * See: {{LEETCODE_URL}}
 * Date: {{DATE}}
 *
 * The Solution class below is paste-compatible with the LeetCode editor.
 * The harness around it (leetcode.hpp + main) is local-only and stripped
 * out by the LC_LOCAL guard when submitting.
 *
 * Run locally:
 *   cmake -S . -B build && cmake --build build
 *   ./bin/{{PROBLEM_SLUG}} input.txt
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
     * TODO: Describe your approach here
     *
     * ## Complexity
     * - Time: O(?)
     * - Space: O(?)
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
