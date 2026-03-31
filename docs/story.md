## The story

This is a work-in-progress. I started this repo to test the capabilities of Cursor with the `Claude Opus 4.5` model and investigate orchestrating agents in parallel. This is essentially an experiment for `$WORK`, but may turn out to be a useful pedagogical tool. The story is as follows.

I had recently started on a project which gave me access to Cursor and `Claude Opus 4.5`, and I felt I needed a deep dive into their capabilities.

This repo was originally a fork of [karote00/local-leetcode-trainer](https://github.com/karote00/local-leetcode-trainer), which I found when looking for a way to run LeetCode problems locally.

I begun testing how well Cursor with `Opus 4.5` can convert it to Deno + TypeScript and implement various improvements to the CLI. I begun with a couple of careful planning and research sessions, creating new specs as output. When I was ready, I started to spin up agents in parallel in YOLO mode. This approach quickly exhausted my available credits for the model, and at this point I switched tools. The experience was boring and tiring, watching the agents grind through my task list, and then reviewing a lot of output. I soon lost focus. This was day 2 of the experiment.

On the next day, after I had exhausted my tokens for Cursor, I switched to other tools. First I briefly tried `Gemini 3 Pro` through the Goose CLI. It gave me slightly worse results than `Opus 4.5` (for example, it insisted on overwriting the Serena memory files with crap related to the current task), and I was quickly rate-limited.

Then I went on with GitHub Copilot using `Claude Sonnet 4`, but the output even worse than the two previous models (it made more mistakes, more failed tests, backed itself into a corner and made me start from scratch on a feature one time). At this point, I stopped caring and stopped reading attentively through generated code, and just started vibing the whole thing. I started a new approach:

I did a deep planning session for each major sub-system, before starting the implementation of it. For those sessions I used `Opus 4.5` again. This gave me a tasks.md file for each sub-system, with small tasks that could be parallelized. Then I started assigning those as issues directly to the Copilot remote agent on GitHub. I made sure everything passed linting and had some test coverage, but didn't bother to read the details. I just briefly skimmed the PRs before merging.
