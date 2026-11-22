# Contributing to WillaAI

Thanks for wanting to help! Bug reports, ideas and pull requests are all welcome.

## Ways to help

- **Found a bug?** [Open an issue](https://github.com/8monish/WillaAI/issues/new/choose) with the steps to reproduce it.
- **Have an idea?** Open a feature request issue first, so we can agree on the approach before you write code.
- **Found a security problem?** Don't open an issue. Follow [SECURITY.md](SECURITY.md) instead.

## Set up

You need Rust (stable, 1.90 or newer), Node 20+ and pnpm, plus the [Tauri system dependencies](https://tauri.app/start/prerequisites/) for your OS.

```bash
git clone https://github.com/8monish/WillaAI.git
cd WillaAI
pnpm install
pnpm tauri dev
```

## Before you open a pull request

Run the same checks CI runs:

```bash
pnpm build
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
```

Then:

1. Create a branch from `main`.
2. Keep the pull request focused on one change, and explain what it does and why.
3. Add or update tests in `src-tauri/` when you change Rust behaviour.
4. Update `README.md` if you change something users see, and add a line under **Unreleased** in `CHANGELOG.md`.

## Commit messages

Use short, [Conventional Commits](https://www.conventionalcommits.org/) style messages:

```
feat: add Telegram remote control
fix: stop the terminal losing its cwd after an error
docs: explain where settings are stored
ci: cache the pnpm store
```

## Code style

- **Rust:** run `cargo fmt` (settings are in `src-tauri/rustfmt.toml`), and fix every clippy warning.
- **TypeScript:** keep components small, and keep IPC calls in `src/lib/api.ts`.
- **Safety first:** anything that runs commands or writes files must go through the approval flow. Never add a path that skips it.

## Releases (maintainers)

1. Bump the version in `package.json`, `src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json`.
2. Move the **Unreleased** notes in `CHANGELOG.md` under the new version.
3. Tag and push: `git tag -s vX.Y.Z -m "WillaAI vX.Y.Z" && git push origin vX.Y.Z`.
4. CI builds every installer into a draft release. Check it, then publish it.

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE). Please follow the [Code of Conduct](CODE_OF_CONDUCT.md).
