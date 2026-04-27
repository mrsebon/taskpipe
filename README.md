# taskpipe

A lightweight CLI task runner that chains shell commands with conditional logic and retry support.

## Installation

```bash
npm install -g taskpipe
```

## Usage

Define your pipeline in a `taskpipe.yml` file:

```yaml
pipeline:
  - name: lint
    run: npm run lint

  - name: test
    run: npm test
    retry: 3
    on_failure: stop

  - name: build
    run: npm run build
    depends_on: test
```

Then run it from your terminal:

```bash
taskpipe run
```

You can also run a specific task by name:

```bash
taskpipe run --task build
```

### Options

| Flag | Description |
|------|-------------|
| `--task <name>` | Run a specific task |
| `--dry-run` | Print commands without executing |
| `--verbose` | Show detailed output |
| `--config <path>` | Path to config file (default: `taskpipe.yml`) |

## Requirements

- Node.js 16+

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](LICENSE)