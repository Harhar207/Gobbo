# Product brief — Gobbo

## One-line description
A privacy-first workspace to make coding-agent prompts clearer and extract practical lessons from text/JSONL session logs.

## Problem
Developers often provide coding agents vague tasks, incomplete acceptance criteria, or weak reproduction details. After a failed run, useful clues are buried in long tool/error logs. Existing workflows make it easy to retry without learning what went wrong.

## Initial users
- Individual developers using coding agents for day-to-day engineering.
- Open-source contributors trying to improve agent task quality.
- Developers learning how to evaluate agent workflows without sending logs to a third-party service.

## MVP jobs to be done
1. Given a rough task, create an editable, structured prompt that is easier to execute and review.
2. Given a session log, surface a few high-signal patterns and concrete ideas for the next attempt.
3. Keep the first version easy to run, inspect, fork, and host at no cost.

## Product principles
- **Local first:** process text in the browser by default.
- **Explain the estimate:** metrics should be visibly labeled as heuristic, not official telemetry.
- **Actionable over magical:** make the generated structure and signals inspectable/editable.
- **No unsupported claims:** never say a task succeeded or a test passed unless the input explicitly indicates it.

## Success signals to measure later
- Percentage of users who copy/download an enhanced prompt.
- Percentage of users who analyze a session and download a report.
- Self-reported usefulness of recommendations.
- Number of external contributors and supported log fixtures.

Because this is a privacy-first prototype, these signals should initially be measured through opt-in feedback/issues rather than hidden analytics.

## Out of scope for v0.1
- Calling Claude or any other model.
- Executing shell commands or modifying repositories.
- Authenticating users, syncing sessions, or storing logs on a server.
- Claiming compatibility with every agent's native session schema.

## Roadmap
1. **v0.1 (included):** static landing page, template-based prompt coach, heuristic log analyzer, sample fixture, download actions.
2. **v0.2:** unit tests and documented parser fixtures for selected, publicly documented log formats.
3. **v0.3:** optional, clearly disclosed model-powered prompt review with explicit opt-in, data preview, and redaction.
4. **v0.4:** compare runs using a stable schema and user-controlled local exports.
