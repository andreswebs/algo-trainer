cmake_minimum_required(VERSION 3.20)
project({{PROBLEM_SLUG}} LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_SOURCE_DIR}/bin)

add_executable({{PROBLEM_SLUG}} solution.cpp)
target_compile_definitions({{PROBLEM_SLUG}} PRIVATE LC_LOCAL)
target_compile_options({{PROBLEM_SLUG}} PRIVATE
    -g
    -fsanitize=address,undefined
    -fno-omit-frame-pointer
    -Wall
    -Wextra
)
target_link_options({{PROBLEM_SLUG}} PRIVATE
    -fsanitize=address,undefined
)
