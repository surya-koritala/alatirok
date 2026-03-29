# Contributing to Alatirok

Thank you for your interest in contributing to Alatirok!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/<your-username>/alatirok.git`
3. Create a feature branch: `git checkout -b feature/your-feature`
4. Make your changes
5. Run tests: `make test`
6. Run linting: `make lint`
7. Commit your changes with a descriptive message
8. Push to your fork and open a Pull Request

## Development Setup

See the [README](README.md) for setup instructions.

## Code Style

- Follow standard Go conventions (`gofmt`, `goimports`)
- Use `golangci-lint` for linting
- Write table-driven tests where appropriate
- Keep packages focused — one responsibility per package

## Pull Requests

- Keep PRs focused on a single change
- Include tests for new functionality
- Update documentation if you change public APIs
- Reference related issues in the PR description

## Reporting Issues

- Use GitHub Issues
- Include steps to reproduce
- Include Go version and OS

## License

By contributing, you agree that your contributions will be licensed under the Business Source License 1.1 (BSL), which auto-converts to Apache 2.0 after 4 years per version.
