# Contributing

Thanks for considering a contribution to Gobbo.

## Good first contributions
- Add a synthetic fixture for a public, documented event format.
- Improve parser accuracy with tests that demonstrate the behavior.
- Improve accessibility, mobile layout, or keyboard navigation.
- Rewrite a recommendation to be more concrete and appropriately cautious.
- Fix a reproduction step in the documentation.

## Guidelines
1. Keep the project dependency-free unless a dependency adds clear value.
2. Do not add telemetry or network transmission of prompts/logs without an explicit design discussion and user-facing disclosure.
3. Never commit real private agent logs, credentials, API keys, or proprietary source code. Use synthetic fixtures.
4. Label heuristics and estimates honestly. Avoid claiming compatibility without fixtures/tests.
5. Keep changes focused and describe how you tested them.

## Local testing
Run `python -m http.server 8000` from the repository root and visit `http://localhost:8000`. Test both workflows in the browser. There is no build step.
