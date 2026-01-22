# algo-trainer

A CLI tool for practicing algorithmic problems offline. Work through coding challenges with hints, progress tracking, and AI-assisted teaching.

**Note**: This is an experiment in AI spec-driven development. Don't take it too seriously. See the [story](docs/STORY.md) for more context.

## Installation

Requires [Deno](https://deno.land/) 2.x or later.

```sh
deno install --allow-read --allow-write --allow-env --allow-net --name algo-trainer jsr:@andreswebs/algo-trainer
```

Or build from source:

```sh
git clone https://github.com/andreswebs/algo-trainer.git
cd algo-trainer
deno task build
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

Type check and lint:

```sh
deno task check
deno task lint
```

Run tests:

```sh
deno task test
```

## Authors

**Andre Silva** - [@andreswebs](https://github.com/andreswebs)

## License

This project is licensed under the [GPL-3.0-or-later](LICENSE).
