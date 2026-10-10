# GobboAI — AI Coding Efficiency Coach

A browser-only prototype for two practical workflows:

1. **Prompt coach:** turn a rough engineering request into a clearer, editable task brief with context, constraints, steps, and acceptance criteria.
2. **Session analyzer:** inspect pasted text/JSONL coding-agent logs for common error signals, tool-like mentions, file references, and rough text-size estimates.

GobboAI is intentionally a static site: no backend, no API key, no build step, and no required account. Your prompt and pasted log content are processed in your browser tab. This is a learning prototype, not official Claude/Codex/Cursor telemetry and not a production-grade evaluator.

## Run locally

**Option A — easiest:** open `index.html` in a browser, then click **Open the free prototype**. Prompt coaching works offline. The sample-data button uses a built-in fallback when the browser blocks local file fetches.

**Option B — local web server (recommended):** from this folder run:

```bash
python -m http.server 8000
```

Then visit <http://localhost:8000>. Node.js is not required.

## Publish for free

### GitHub Pages

1. Create a new **public** GitHub repository (for example, `gobboai-coding-coach`). Do not upload credentials, work logs, or private company code.
2. Copy the contents of this folder into the repository root and commit them.
3. Open **Settings → Pages**.
4. Under build/deployment, select **Deploy from a branch**, choose `main` and `/(root)`, and save.
5. Wait for GitHub Pages to publish the site. Open the URL shown in Settings → Pages.
6. Edit `index.html`: update the GitHub links so they point to your actual repository. Search for `https://github.com/`.

### Cloudflare Pages

1. Push this folder to a GitHub repository.
2. In Cloudflare, choose **Workers & Pages → Create → Pages → Connect to Git** (the UI wording can change).
3. Select the repository.
4. As this is a static site, leave the build command empty and set the build output directory to `/` or the repository root as requested by the current dashboard.
5. Deploy and open the generated Pages URL.

Exact dashboard labels can change. Both hosting options support static HTML/CSS/JS, so this project needs no server-side configuration.

## Project map

```text
.
├── index.html                     # Public landing page
├── app.html                       # Working prototype UI
├── assets/
│   ├── site.css                   # Landing page styles + shared design system
│   ├── app.css                    # Workspace styles
│   └── favicon.svg
├── js/
│   ├── landing.js
│   └── app.js                     # Prompt coach and session analyzer logic
├── sample-data/
│   └── sample-session.jsonl
├── docs/
│   ├── PRODUCT_BRIEF.md
│   └── DEPLOYMENT_CHECKLIST.md
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

## Current MVP behavior

### Prompt coach
- Select a task type and output detail.
- Builds a repeatable prompt structure from local templates.
- Shows simple completeness signals for goal, context, expected behavior, constraints, validation, and failure details.
- Allows editing, copying, and downloading the generated prompt.

### Session analyzer
- Reads pasted plain text or JSONL, or a local file selected by the user.
- Uses keyword patterns to flag possible errors/warnings and tool-like mentions.
- Estimates text tokens as `characters / 4` (a rough size heuristic, **not** a tokenizer or billable token count).
- Provides possible follow-up actions and downloadable text reports.

## Known limitations and next steps

- The prompt coach is template-based; it does not use a language model to rewrite or validate prompts.
- The session analyzer is schema-agnostic and heuristic. It may double-count a line or miss provider-specific events.
- Metrics are not comparable across tools/runs yet, and there is no persistence, account system, backend, or telemetry.
- The GitHub source link on the landing page is a placeholder alert until you update it.

Recommended next steps: add a few opt-in test fixtures from public/synthetic logs, write parser unit tests, document supported event formats, and only then add optional model-powered suggestions with explicit user consent and secret redaction.

## Privacy and safe use

The app does not submit user-entered prompt or log text to a backend. When you click the sample-data button on a hosted version, the browser fetches the included public sample file; the CSS also loads fonts from Google Fonts while online. You can remove the `@import` line in `assets/site.css` for a system-font stack without the external font request. The static host receives ordinary page and asset requests, but this app does not upload your entered prompt/log content.

Do not paste API keys, access tokens, personal data, or proprietary work logs into any prototype unless you have authorization and have reviewed its code and data flow.

## License

MIT. See [LICENSE](LICENSE).
