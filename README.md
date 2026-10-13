# algo-trainer

A CLI tool for practicing algorithmic problems offline. Work through coding challenges with hints, progress tracking, and AI-assisted teaching.

**Note**: This is an experiment in AI spec-driven development. Don't take it too seriously. See the [story](docs/story.md) for more context.

## Installation

Requires [Bun](https://bun.sh/) 1.4.3 or later. There is no published package; build the binary from source:

```sh
git clone https://github.com/andreswebs/algo-trainer.git
cd algo-trainer
bun install
bun run build
cp ./bin/algo-trainer ~/.local/bin # or somewhere else in your PATH
```

## Usage

Initialize a workspace:

```sh
algo-trainer init
```

Start a challenge:

```sh
algo-trainer challenge
```

List available problems:

```sh
algo-trainer list
```

Get a hint:

```sh
algo-trainer hint
```

Mark a problem complete:

```sh
algo-trainer complete
```

View your progress:

```sh
algo-trainer progress
```

## Configuration

Config files follow XDG Base Directory specification:

- Config: `~/.config/algo-trainer/`
- Cache: `~/.cache/algo-trainer/`
- Data: `~/.local/share/algo-trainer/`

Set your preferred language:

```sh
algo-trainer config set language python
```

Available languages: python, typescript, javascript, go, rust, java, cpp.

## Development

Install dependencies:

```sh
bun install
```

Type check, check formatting and lint, and run the tests (run this before and after every change):

```sh
bun run verify
```

Other commands:

```sh
bun run dev                # run the CLI in watch mode
bun test                   # run the tests
bun run test:watch         # run the tests in watch mode
bun run format             # format with Biome
bun run lint:fix           # apply Biome lint fixes
bun run generate-problems  # regenerate src/data/problems.generated.ts
bun run build              # build bin/algo-trainer
./scripts/smoke.sh "${PWD}/bin/algo-trainer"  # smoke test the built binary
```

## Authors

**Andre Silva** - [@andreswebs](https://github.com/andreswebs)

## License

This project is licensed under the [GPL-3.0-or-later](LICENSE).
