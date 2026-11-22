# Security policy

WillaAI runs an AI agent that can execute commands and edit files on your computer, so security issues matter a lot here. Thank you for helping keep users safe.

## Supported versions

Only the latest release gets security fixes.

| Version | Supported |
|---|---|
| 0.2.x | ✅ |
| < 0.2 (the old Python/Node version) | ❌ |

## Reporting a vulnerability

**Please don't open a public issue for security problems.**

Report it privately through GitHub instead: go to the [Security tab](https://github.com/8monish/WillaAI/security) and click **Report a vulnerability**. Only the maintainers can see the report.

Please include:

- what the problem is and what an attacker could do with it
- the steps to reproduce it, or a proof of concept
- the WillaAI version and your operating system

What to expect:

- an acknowledgement within **3 days**
- an assessment and a plan within **10 days**
- a fix released as soon as it's ready, with credit to you in the release notes (unless you'd rather stay anonymous)

Please give us a reasonable time to release a fix before you disclose the problem publicly.

## What counts as a vulnerability

In scope, for example:

- a way for a web page, a model response or a file's contents to run commands **without** the user's approval while **Command approvals** is set to **Ask**
- escaping the app's content security policy, or running script in the UI from model output (for example through the Markdown renderer)
- API keys or chat data leaking to anyone other than the provider the user picked
- problems in the release builds or the release pipeline

Not vulnerabilities:

- the agent running commands while approvals are set to **Auto**. That's the documented behaviour of that mode
- what the `agy` or `codex` CLIs do. They run their own tool loops; report those to their projects
- a model giving bad advice, or prompt injection that still stops at the approval prompt

## How WillaAI handles your data

- **API keys** are saved in a `settings.json` file in your OS config folder (for example `~/.config/com.zerosones.willa/` on Linux). They're stored as plain text, protected only by your user account's file permissions. Moving them to the OS keychain is on the roadmap.
- **Chats and memories** stay on your machine, in the app's data folder. There's no WillaAI server and no telemetry.
- **Network:** the app only connects to the model provider you choose (or your local Ollama or custom endpoint), and sends that provider your messages plus the outputs of the tools the agent runs.
- **Commands** run with your user account's permissions. With **Ask** on, every command and file write waits for you to approve it.

## Release integrity

- Commits and release tags are signed and show as **Verified** on GitHub.
- Every release includes `SHA256SUMS.txt`, so you can check that your download matches what CI built.
- Installers aren't code-signed by Apple or Microsoft yet, which is why macOS and Windows warn on first launch. Only download WillaAI from this repository's Releases page.
