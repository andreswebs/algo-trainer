#pragma once

#include <iostream>
#include <string>
#include <vector>
#include <queue>
#include <tuple>
#include <concepts>
#include <type_traits>
#include <stdexcept>
#include <utility>
#include <ranges>
#include <algorithm>
#include <cstddef>
#include <exception>
#include <fstream>
using namespace std;

struct TreeNode
{
    int val;
    TreeNode *left = nullptr;
    TreeNode *right = nullptr;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode *left, TreeNode *right)
        : val(x), left(left), right(right) {}
    // Iterative teardown: a recursive `delete left; delete right;` overflows
    // the stack on degenerate trees (e.g. a 5*10^4 right-leaning chain). We
    // detach children before pushing them onto the worklist so the dtor of
    // each popped node finds null children and does no further recursion.
    ~TreeNode()
    {
        vector<TreeNode *> work;
        if (left) { work.push_back(left); left = nullptr; }
        if (right) { work.push_back(right); right = nullptr; }
        while (!work.empty())
        {
            TreeNode *n = work.back();
            work.pop_back();
            if (n->left) { work.push_back(n->left); n->left = nullptr; }
            if (n->right) { work.push_back(n->right); n->right = nullptr; }
            delete n;
        }
    }
};
struct ListNode
{
    int val;
    ListNode *next = nullptr;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
    // Iterative teardown: a recursive `delete next` overflows the stack on
    // long chains. Detach each successor before deleting so the dtor body of
    // each freed node sees a null `next` and exits without recursing.
    ~ListNode()
    {
        ListNode *cur = next;
        next = nullptr;
        while (cur)
        {
            ListNode *nxt = cur->next;
            cur->next = nullptr;
            delete cur;
            cur = nxt;
        }
    }
};

template <typename T>
concept has_to_string = requires(T t) {
    { t.to_string() } -> same_as<std::string>;
};
template <typename T>
concept tuple_like = requires(T t) { typename tuple_size<T>::type; };

template <typename T>
void print_impl(ostream &os, const T &val, bool write_newline)
{
    if constexpr (same_as<T, char>)
        os << '"' << val << '"';
    else if constexpr (same_as<T, bool>)
        os << (val ? "true" : "false");
    else if constexpr (same_as<T, string>)
        os << '"' << val << '"';
    else if constexpr (is_arithmetic_v<T>)
        os << val;
    else if constexpr (has_to_string<T>)
        os << '"' << val.to_string() << '"';
    else if constexpr (same_as<T, TreeNode *>)
    {
        // Note: this BFS print emits trailing `null` slots for the leaves
        // on the last level (e.g. `[1,2,3,null,null,null,null]`). LeetCode
        // tolerates the same on input, and round-tripping through `parse`
        // produces an identical tree. The output is intentionally noisier
        // than the canonical LeetCode form — do not "fix" it.
        queue<TreeNode *> q;
        os << '[';
        if (val)
        {
            q.push(val);
            os << val->val;
        }
        while (!q.empty())
        {
            auto cur = q.front();
            q.pop();
            if (cur->left)
            {
                q.push(cur->left);
                os << ',' << cur->left->val;
            }
            else
                os << ",null";
            if (cur->right)
            {
                q.push(cur->right);
                os << ',' << cur->right->val;
            }
            else
                os << ",null";
        }
        os << ']';
    }
    else if constexpr (tuple_like<T>)
    {
        os << '{';
        apply(
            [&, c = 0](auto &&...args) mutable
            {
                ((c++ ? os << ',' : os, print_impl(os, args, false)), ...);
            },
            val);
        os << '}';
    }
    else if constexpr (same_as<T, ListNode *>)
    {
        auto cur = val;
        os << '[';
        while (cur)
        {
            if (cur != val)
                os << ',';
            os << cur->val;
            cur = cur->next;
        }
        os << ']';
    }
    else if constexpr (ranges::range<T>)
    {
        os << '[';
        for (auto it = val.begin(); it != val.end(); it++)
        {
            if (it != val.begin())
                os << ',';
            // vector<bool> yields a proxy reference, not bool&. Materialize
            // a real bool so the static dispatch in print_impl matches.
            if constexpr (same_as<typename T::value_type, bool>)
            {
                bool b = *it;
                print_impl(os, b, false);
            }
            else
                print_impl(os, *it, false);
        }
        os << ']';
    }
    else
        static_assert(false, "printing for type not supported");
    if (write_newline)
        os << '\n';
}

#define CONCAT_IMPL(x, y) x##y
#define CONCAT(x, y) CONCAT_IMPL(x, y)
#define NUM_ARGS_IMPL(_1, _2, _3, _4, _5, _6, _7, _8, _9, _10, N, ...) N
#define NUM_ARGS(...) NUM_ARGS_IMPL(__VA_ARGS__, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1)
#define DBG_VAL(x) \
    [&]() {                                                                      \
    auto val = x;                                                              \
    cerr << "[" << #x << " = ";                                                \
    print_impl(cerr, val, false);                                              \
    cerr << "] "; }()
#define DBG_1(x) DBG_VAL(x)
#define DBG_2(x, ...) DBG_VAL(x), DBG_1(__VA_ARGS__)
#define DBG_3(x, ...) DBG_VAL(x), DBG_2(__VA_ARGS__)
#define DBG_4(x, ...) DBG_VAL(x), DBG_3(__VA_ARGS__)
#define DBG_5(x, ...) DBG_VAL(x), DBG_4(__VA_ARGS__)
#define DBG_6(x, ...) DBG_VAL(x), DBG_5(__VA_ARGS__)
#define DBG_7(x, ...) DBG_VAL(x), DBG_6(__VA_ARGS__)
#define DBG_8(x, ...) DBG_VAL(x), DBG_7(__VA_ARGS__)
#define DBG_9(x, ...) DBG_VAL(x), DBG_8(__VA_ARGS__)
#define DBG_10(x, ...) DBG_VAL(x), DBG_9(__VA_ARGS__)

// supports up to 10 arguments debugging at one time
#define dbg(...) CONCAT(DBG_, NUM_ARGS(__VA_ARGS__))(__VA_ARGS__)

template <typename T>
T parse(istream &is)
{
    T ans;
    char ch;
    is >> ws;
    if constexpr (same_as<T, char>)
    {
        if (!(is >> ch) || ch != '"')
            throw runtime_error("Expected '\"' before char");
        if (!(is >> ans))
            throw runtime_error("Failed to parse char");
        if (!(is >> ch) || ch != '"')
            throw runtime_error("Expected '\"' after char");
    }
    else if constexpr (same_as<T, bool>)
    {
        // Read alpha chars only so that a trailing ',' or ']' (e.g. inside
        // `[true,false]`) does not get glued onto the token by `is >> s`.
        string s;
        char c;
        while (is && isalpha(static_cast<unsigned char>(is.peek())))
        {
            is.get(c);
            s += c;
        }
        if (s.empty())
            throw runtime_error("Failed to parse bool");
        if (s != "true" && s != "false")
            throw runtime_error("Expected 'true' or 'false' for bool, got: " + s);
        ans = (s == "true");
    }
    else if constexpr (same_as<T, string>)
    {
        if (!(is >> ch) || ch != '"')
            throw runtime_error("Expected '\"' before string");
        if (!getline(is, ans, '"'))
            throw runtime_error("Failed to parse string or missing closing '\"'");
    }
    else if constexpr (is_arithmetic_v<T>)
    {
        if (!(is >> ans))
            throw runtime_error("Failed to parse numeric value");
    }
    else if constexpr (same_as<T, TreeNode *>)
    {
        // Level-order parse using a queue of "open" parents waiting to have
        // their children filled. A dummy node seeds the queue so the very
        // first token attaches as `dummy->right`, which then becomes the
        // real root (returned via `dummy->right`). The `right` flag tracks
        // which slot of `q.front()` we're filling next: it starts true (we
        // are filling the dummy's right slot, i.e. the root) and then
        // alternates left, right, left, right, ... for every subsequent
        // parent in BFS order. We pop the parent from the queue once its
        // right slot has been processed (whether or not the slot held
        // `null`). A `null` token consumes a slot — toggling `right` and
        // possibly popping — but does not create a node and does not
        // enqueue.
        if (!(is >> ch) || ch != '[')
            throw runtime_error("Expected '[' at start of TreeNode array");
        is >> ws;
        if (is.peek() == ']')
        {
            is >> ch;
            ans = nullptr;
        }
        else
        {
            bool right = true;
            auto dummy = new TreeNode{};
            queue<TreeNode *> q;
            q.push(dummy);

            try
            {
                while (is && is.peek() != ']')
                {
                    is >> ws;
                    string token;
                    char c;
                    while (is && (c = is.peek()) != ',' && c != ']')
                    {
                        token += c;
                        is.get();
                    }
                    if (token.empty())
                        throw runtime_error("Empty token in TreeNode array");

                    if (token != "null")
                    {
                        int val;
                        try
                        {
                            val = stoi(token);
                        }
                        catch (...)
                        {
                            throw runtime_error("Invalid integer in TreeNode array: " +
                                                token);
                        }
                        auto new_node = new TreeNode{val};
                        if (right)
                            q.front()->right = new_node;
                        else
                            q.front()->left = new_node;
                        q.push(new_node);
                    }
                    if (right)
                        q.pop();
                    right = !right;

                    if (is.peek() == ',')
                        is >> ch;
                }
                if (!is || is.peek() != ']')
                    throw runtime_error("Expected ']' at end of TreeNode array");
                is >> ch; // skip ']'
                ans = dummy->right;
                dummy->right = nullptr;
                delete dummy;
            }
            catch (...)
            {
                dummy->right = nullptr;
                delete dummy;
                throw;
            }
        }
    }
    else if constexpr (same_as<T, ListNode *>)
    {
        // The dummy/sentinel lets us append uniformly via `cur->next = ...`
        // without special-casing the empty list: returning `dummy->next`
        // yields `nullptr` for `[]` and the real head otherwise.
        auto dummy = new ListNode{};
        auto cur = dummy;
        if (!(is >> ch) || ch != '[')
            throw runtime_error("Expected '[' at start of ListNode array");
        is >> ws;
        if (is.peek() != ']')
        {
            try
            {
                while (true)
                {
                    cur->next = new ListNode{parse<int>(is)};
                    cur = cur->next;
                    is >> ws;
                    if (is.peek() == ']')
                        break;
                    if (!(is >> ch) || ch != ',')
                        throw runtime_error("Expected ',' between ListNode elements");
                }
            }
            catch (...)
            {
                dummy->next = nullptr;
                delete dummy;
                throw;
            }
        }
        if (!(is >> ch) || ch != ']')
            throw runtime_error("Expected ']' at end of ListNode array");
        ans = dummy->next;
        dummy->next = nullptr;
        delete dummy;
    }
    else if constexpr (ranges::range<T>)
    {
        if (!(is >> ch) || ch != '[')
            throw runtime_error("Expected '[' at start of array");
        is >> ws;
        if (is.peek() != ']')
        {
            while (true)
            {
                if (!is || is.peek() == EOF)
                    throw runtime_error("Unexpected EOF in array");
                ans.emplace_back(parse<typename T::value_type>(is));
                is >> ws;
                if (!is)
                    throw runtime_error("Stream error while parsing array");
                if (is.peek() == ']')
                    break;
                if (!(is >> ch) || ch != ',')
                    throw runtime_error("Expected ',' between array elements");
            }
        }
        if (!(is >> ch) || ch != ']')
            throw runtime_error("Expected ']' at end of array");
    }
    else if constexpr (tuple_like<T>)
    {
        char ch;
        if (!(is >> ch) || ch != '{')
            throw runtime_error("Expected '{' at start of tuple");
        ans = [&]<size_t... Idx>(index_sequence<Idx...>)
        {
            T result;
            ((Idx > 0 ? (void)(is >> ws, is >> ch) : (void)0,
              get<Idx>(result) = parse<tuple_element_t<Idx, T>>(is)),
             ...);
            return result;
        }(make_index_sequence<tuple_size_v<T>>{});
        if (!(is >> ch) || ch != '}')
            throw runtime_error("Expected '}' at end of tuple");
    }
    else
        static_assert(false, "parsing for type not supported");
    return ans;
}

template <typename Solution, typename R, typename... Ts>
void run(R (Solution::*fn)(Ts...), int argc = 0, char **argv = nullptr)
{
    ifstream file_stream;
    if (argc > 1)
    {
        file_stream.open(argv[1]);
        if (!file_stream)
        {
            cerr << "Error: could not open input file: " << argv[1] << endl;
            return;
        }
    }
    istream &is = file_stream.is_open() ? file_stream : cin;

    if constexpr (sizeof...(Ts) == 0)
    {
        Solution s;
        if constexpr (same_as<R, void>)
            (s.*fn)();
        else
            print_impl(cout, (s.*fn)(), true);
    }
    else
    {
        int test_num = 0;
        while (is >> ws && !is.eof())
        {
            test_num++;
            tuple<Solution, decay_t<Ts>...> args;
            get<0>(args) = Solution{};
            try
            {
                [&]<size_t... Idx>(index_sequence<Idx...>)
                {
                    ([&]()
                     { get<Idx + 1>(args) = (is >> ws, parse<decay_t<Ts>>(is)); }(),
                     ...);
                }(index_sequence_for<Ts...>{});
            }
            catch (const exception &e)
            {
                cerr << "Error (test " << test_num << "): " << e.what() << endl;
                return;
            }

            if (test_num > 1)
                cout << "---\n";

            if constexpr (same_as<R, void>)
            {
                apply(fn, args);
                []<size_t... Idx>(auto &&args, index_sequence<Idx...>)
                {
                    ((cout << "#" << (Idx + 1) << ": ",
                      print_impl(cout, get<Idx + 1>(args), true)),
                     ...);
                }(args, index_sequence_for<Ts...>{});
            }
            else
            {
                auto res = apply(fn, args);
                print_impl(cout, res, true);
            }
        }
    }
}
