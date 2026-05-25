# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |
| < 1.0   | :x:                |

TokenArena is in active beta. Security fixes are applied only to the `main` branch.

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, use one of the following methods:

- **GitHub Security Advisories** (preferred): Go to [github.com/poco-ai/TokenArena/security/advisories/new](https://github.com/poco-ai/TokenArena/security/advisories/new) and submit a private security advisory.
- **Email**: Send a report to the maintainers. Include a clear description of the vulnerability, affected versions, steps to reproduce, and potential impact.

### What to include

- Description of the vulnerability
- Affected component(s) (`cli/`, `web/`, or both)
- Steps to reproduce
- Known exploits or proof-of-concept (if available)
- Suggested fix (optional)

### Response timeline

We aim to acknowledge reports within **48 hours** and provide an initial assessment within **5 business days**.

| Stage | Expected timeframe |
| ----- | ------------------ |
| Acknowledgment | 48 hours |
| Initial triage | 5 business days |
| Status updates | Every 7 days until resolved |
| Fix (if accepted) | Depends on severity and complexity |

If the vulnerability is confirmed, we will work on a fix and coordinate a responsible disclosure. We ask that you do not publicly disclose the issue until a fix has been released.

## Security Measures

This project uses the following automated security tools:

- **Dependabot**: Scans dependencies for known vulnerabilities on a weekly schedule. Alerts and automatic PRs are enabled.
- **CodeQL**: Static analysis for JavaScript/TypeScript, runs on every push and pull request to `main`.
- **Secret scanning**: Enabled to detect accidentally committed secrets and credentials.
- **pnpm overrides**: Used to patch transitive dependencies that are pinned to vulnerable versions by upstream packages and cannot be resolved through normal upgrades.

## Secure Development Practices

- Dependencies must pass `pnpm check`, `pnpm build`, and `pnpm test:cli` / `pnpm test:web` before merging.
- The Husky pre-commit hook enforces linting and formatting checks.
- API keys and secrets are never committed to the repository. The CLI stores local config in `~/.tokenarena/`.
- All new environment variables must be documented in `.env.example`, `docker-compose.yml`, and `README.md`.
