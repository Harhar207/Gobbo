  /* Gobbo MVP — browser-only prompt coach and coding-agent log analyzer.
 * No network calls, analytics, or external runtime dependencies are used.
 */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const appState = { lastAnalysis: null, lastPrompt: '' };
  let toastTimeout;

  function showToast(message) {
    const toast = $('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => toast.classList.remove('show'), 2500);
  }
  function escapeText(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
  }
  function wordCount(text) { return (text.trim().match(/\S+/g) || []).length; }
  function downloadText(filename, content) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove();
    URL.revokeObjectURL(url);
  }
  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const area = document.createElement('textarea'); area.value = text; area.style.position = 'fixed'; area.style.opacity = '0';
      document.body.appendChild(area); area.select();
      const ok = document.execCommand('copy'); area.remove();
      if (!ok) throw new Error('Clipboard unavailable');
    }
  }

  // Simple same-page view navigation, including URL hashes for sharing/bookmarking.
  function showView(id, updateHash = true) {
    const valid = ['prompt-coach', 'session-analyzer'];
    const view = valid.includes(id) ? id : 'prompt-coach';
    document.querySelectorAll('[data-panel]').forEach((panel) => {
      const active = panel.dataset.panel === view;
      panel.hidden = !active; panel.classList.toggle('active', active);
    });
    document.querySelectorAll('[data-view]').forEach((link) => link.classList.toggle('active', link.dataset.view === view));
    if (updateHash && window.location.hash !== `#${view}`) history.replaceState(null, '', `#${view}`);
  }
  document.querySelectorAll('[data-view]').forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault(); showView(link.dataset.view);
  }));
  showView(location.hash.slice(1), false);

  const taskPresets = {
    general: { name: 'Engineering task', steps: ['Inspect the relevant code and summarize the current behavior before editing.', 'Propose the smallest safe change, then implement it.', 'Run relevant checks and report any that could not be run.'] },
    bug: { name: 'Bug fix', steps: ['Reproduce or trace the failure before making changes.', 'Identify the root cause and explain why it produces the observed behavior.', 'Make the smallest targeted fix and add or update a regression test.', 'Run relevant tests; call out remaining uncertainty.'] },
    feature: { name: 'Feature implementation', steps: ['Inspect existing architecture and conventions before designing the change.', 'Outline a small implementation plan and identify files likely to change.', 'Implement the feature consistently with existing patterns.', 'Add tests for the expected behavior and relevant edge cases.'] },
    refactor: { name: 'Refactoring', steps: ['Identify the current behavior and public interfaces that must stay stable.', 'Make incremental changes without mixing unrelated cleanup.', 'Add or preserve tests to demonstrate behavioral equivalence.', 'Run the relevant test suite and summarize any risk.'] },
    review: { name: 'Code review', steps: ['Prioritize correctness, security, data loss, regressions, and maintainability.', 'Report only actionable findings, ordered by severity, with file and line references when available.', 'Explain the impact and a concrete remediation for each finding.', 'If no material findings are found, say so and note untested areas.'] },
    test: { name: 'Testing task', steps: ['Inspect existing tests, fixtures, and test conventions.', 'Identify important success cases, failure cases, and boundary conditions.', 'Add focused tests that fail for the target issue before the fix when practical.', 'Run the relevant tests and summarize coverage gaps.'] },
    performance: { name: 'Performance task', steps: ['Find or establish the slow path before optimizing.', 'Explain the likely bottleneck and any evidence supporting it.', 'Prefer measurable, low-risk changes over speculative rewrites.', 'Compare before/after measurements when possible and check correctness.'] }
  };
  function scorePrompt(text) {
    const signals = [
      { label: 'Goal stated', ok: /\b(fix|build|create|implement|add|remove|refactor|review|optimi[sz]e|investigate|debug|test|explain|update)\b/i.test(text) },
      { label: 'Context or location', ok: /\b(file|folder|module|class|function|component|service|repository|repo|codebase|currently|existing|in the)\b/i.test(text) },
      { label: 'Expected behavior', ok: /\b(should|expected|instead|when|must|so that|behave|return|display|allow)\b/i.test(text) },
      { label: 'Constraints / scope', ok: /\b(only|avoid|without|do not|don't|keep|minimal|constraint|compatible|backward|unrelated)\b/i.test(text) },
      { label: 'Validation requested', ok: /\b(test|tests|verify|validate|check|lint|build|regression|acceptance criteria)\b/i.test(text) },
      { label: 'Failure / example', ok: /\b(error|fails?|failure|bug|crash|timeout|example|reproduc|stack trace|logs?)\b/i.test(text) }
    ];
    const details = Math.min(12, Math.floor(wordCount(text) / 12));
    const score = Math.min(100, Math.round(signals.filter((s) => s.ok).length / signals.length * 84 + details));
    return { score, signals };
  }
  function createEnhancedPrompt(raw, taskType, detailLevel) {
    const text = raw.trim();
    const preset = taskPresets[taskType] || taskPresets.general;
    const scored = scorePrompt(text);
    const original = text || '[Add your task description here]';
    let instruction = 'Work incrementally. If a key requirement is ambiguous, state your assumption or ask a focused question before making a risky change.';
    if (detailLevel === 'concise') instruction = 'Keep the change focused. In your final response, summarize the change, tests, and any remaining risk in a few bullets.';
    if (detailLevel === 'thorough') instruction = 'Work step by step. Explicitly consider edge cases, compatibility, failure handling, and security where relevant. Explain trade-offs and list any assumptions.';
    const sections = [
      `# Task: ${preset.name}`,
      '## Goal and context',
      original,
      '## Approach',
      ...preset.steps.map((step, i) => `${i + 1}. ${step}`),
      '## Constraints',
      '- Follow the repository\'s existing style, architecture, and naming conventions.',
      '- Keep the scope limited to this task; do not make unrelated changes.',
      '- Do not claim a test or command passed unless you actually ran it.',
      '## Acceptance criteria',
      '- The requested behavior is implemented and the reason for the change is clear.',
      '- Relevant tests or checks pass, or any blockers are explicitly reported.',
      '- The final response summarizes files changed, key decisions, validation performed, and remaining risks.',
      '## Working instructions',
      instruction
    ];
    const missing = scored.signals.filter((s) => !s.ok).map((s) => s.label.toLowerCase());
    if (missing.length) sections.push('## Details to fill in if known', ...missing.map((s) => `- Add ${s}.`));
    return { output: sections.join('\n'), ...scored };
  }
  $('load-prompt-example').addEventListener('click', () => {
    $('prompt-input').value = 'Fix the retry logic in the payment service. If the provider times out, the job may retry and the customer can sometimes be charged twice. Please inspect the current flow before changing it. We need to preserve the existing API and add a regression test for timeout retries.';
    $('task-type').value = 'bug'; $('detail-level').value = 'thorough'; showToast('Example prompt loaded.');
  });
  $('enhance-prompt').addEventListener('click', () => {
    const raw = $('prompt-input').value;
    if (!raw.trim()) { $('prompt-input').focus(); showToast('Describe your task first.'); return; }
    const result = createEnhancedPrompt(raw, $('task-type').value, $('detail-level').value);
    appState.lastPrompt = result.output;
    $('enhanced-output').value = result.output;
    $('prompt-result-panel').hidden = false;
    $('quality-score').textContent = result.score;
    $('quality-meter-fill').style.width = `${result.score}%`;
    $('quality-summary').textContent = result.score >= 70 ? 'Several useful signals are present' : 'Add context to reduce guesswork';
    $('prompt-word-count').textContent = `${wordCount(result.output)} words · editable output`;
    $('checklist-items').innerHTML = result.signals.map((s) => `<span class="check-item ${s.ok ? '' : 'missing'}">${s.ok ? '✓' : '＋'} ${escapeText(s.label)}</span>`).join('');
    $('prompt-result-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('enhanced-output').addEventListener('input', () => { $('prompt-word-count').textContent = `${wordCount($('enhanced-output').value)} words · editable output`; });
  $('copy-prompt').addEventListener('click', async () => {
    try { await copyText($('enhanced-output').value); showToast('Prompt copied to clipboard.'); }
    catch { showToast('Copy failed. Select the prompt and copy it manually.'); }
  });
  $('download-prompt').addEventListener('click', () => downloadText('gobbo-enhanced-prompt.txt', $('enhanced-output').value));

  // Parse a mixed JSONL/plain-text session without assuming any vendor-specific schema.
  const ERROR_RE = /\b(error|exception|failed|failure|traceback|timed out|timeout|not found|cannot read|permission denied|fatal)\b/i;
  const WARN_RE = /\b(warn|warning|deprecated|retry|retries|retrying)\b/i;
  const TOOL_RE = /\b(tool|function_call|tool_use|tool_result|read_file|write_file|edit_file|bash|terminal|execute_command|run_command|grep|glob|search|browser|computer|apply_patch|shell|command)\b/i;
  const FILE_RE = /(?:^|[\s"'])([\w./@-]+\.(?:js|jsx|ts|tsx|py|java|cpp|cc|h|hpp|cs|go|rs|json|yaml|yml|md|html|css|sql))(?:[:\s"']|$)/i;
  function parseInput(text) {
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    const entries = [];
    let parsedJson = 0;
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        parsedJson++;
        const flat = flattenJson(obj);
        entries.push({ raw: line, text: flat, obj, error: ERROR_RE.test(flat), warning: WARN_RE.test(flat), tool: TOOL_RE.test(flat), file: (flat.match(FILE_RE) || [])[1] || null });
      } catch {
        entries.push({ raw: line, text: line, obj: null, error: ERROR_RE.test(line), warning: WARN_RE.test(line), tool: TOOL_RE.test(line), file: (line.match(FILE_RE) || [])[1] || null });
      }
    }
    return { lines, entries, parsedJson, chars: text.length, roughTokens: Math.ceil(text.length / 4) };
  }
  function flattenJson(value, depth = 0) {
    if (depth > 7 || value == null) return value == null ? '' : String(value);
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return value.map((v) => flattenJson(v, depth + 1)).join(' ');
    return Object.entries(value).map(([k, v]) => `${k} ${flattenJson(v, depth + 1)}`).join(' ');
  }
  function countOccurrences(text, regex) { return (text.match(regex) || []).length; }
  function buildAnalysis(text) {
    const result = parseInput(text);
    const fullText = result.entries.map((e) => e.text).join('\n');
    const errorCount = result.entries.filter((e) => e.error).length;
    const warningCount = result.entries.filter((e) => e.warning).length;
    const toolCount = result.entries.filter((e) => e.tool).length;
    const uniqueFiles = [...new Set(result.entries.map((e) => e.file).filter(Boolean))];
    const repeated = new Map();
    for (const entry of result.entries.filter((e) => e.error)) {
      const normalized = entry.text.toLowerCase().replace(/\b\d+\b/g, '#').replace(/\s+/g, ' ').slice(0, 140);
      if (normalized) repeated.set(normalized, (repeated.get(normalized) || 0) + 1);
    }
    const repeatedErrors = [...repeated.entries()].filter(([, n]) => n > 1).sort((a,b) => b[1]-a[1]).slice(0,3);
    const categories = [
      { name: 'Errors', count: errorCount, kind: 'error' },
      { name: 'Warnings / retries', count: warningCount, kind: 'error' },
      { name: 'Tool mentions', count: toolCount, kind: 'tool' },
      { name: 'File references', count: uniqueFiles.length, kind: 'tool' },
      { name: 'JSONL records', count: result.parsedJson, kind: 'tool' }
    ];
    const insights = [];
    if (!text.trim()) insights.push({ icon: '!', tone: 'warn', title: 'No content to inspect', detail: 'Paste a log or load the sample session to get started.' });
    else {
      if (errorCount > 0) insights.push({ icon: '!', tone: 'warn', title: `${errorCount} line(s) contain error signals`, detail: 'Review the surrounding context to distinguish an actual failure from a mention of an error.' });
      else insights.push({ icon: '✓', tone: '', title: 'No obvious error keywords found', detail: 'This is not proof that the run succeeded; errors may use other wording or be encoded in fields this heuristic misses.' });
      if (repeatedErrors.length) insights.push({ icon: '↻', tone: 'warn', title: 'Potential repeated failure pattern', detail: `A normalized error-like line appears ${repeatedErrors[0][1]} times. Check whether the agent is retrying without new information.` });
      if (toolCount > result.entries.length * .55 && result.entries.length > 4) insights.push({ icon: '⌁', tone: '', title: 'Tool activity appears frequently', detail: 'Consider checking whether each tool call advances the task or repeats an earlier search or inspection.' });
      if (!/\b(test|tests|testing|pytest|jest|xunit|unit test|test suite)\b/i.test(fullText)) insights.push({ icon: '✓', tone: '', title: 'No clear test signal detected', detail: 'If this was a code change, ask the agent to run relevant tests and state which checks actually ran.' });
      if (uniqueFiles.length) insights.push({ icon: '⌗', tone: '', title: `${uniqueFiles.length} unique file reference(s) spotted`, detail: `Examples: ${uniqueFiles.slice(0,4).join(', ')}${uniqueFiles.length > 4 ? ', …' : ''}. This is based on filename-pattern matching.` });
      if (insights.length < 2) insights.push({ icon: 'i', tone: '', title: 'Small sample, limited confidence', detail: 'Inspect the source log format and treat these findings as hints, not a grading system.' });
    }
    const recommendations = [];
    if (errorCount) recommendations.push({ tag: 'DEBUG', title: 'Ask for a root-cause summary', text: 'Have the agent identify the first meaningful failure, separate symptoms from causes, and list evidence before attempting another fix.' });
    if (repeatedErrors.length || warningCount > 2) recommendations.push({ tag: 'LOOP CHECK', title: 'Set a stopping condition', text: 'Ask the agent to stop after repeated failures, summarize what changed, and propose a different diagnostic step rather than retrying blindly.' });
    if (!/\b(test|tests|testing|pytest|jest|xunit|unit test|test suite)\b/i.test(fullText)) recommendations.push({ tag: 'VALIDATION', title: 'Make verification explicit', text: 'Include a concrete acceptance checklist and require the agent to report test commands and their results honestly.' });
    if (toolCount > 5) recommendations.push({ tag: 'EFFICIENCY', title: 'Make exploration purposeful', text: 'Ask for a brief plan, relevant-file shortlist, and an explanation when new exploration materially changes the plan.' });
    if (!recommendations.length) recommendations.push({ tag: 'NEXT RUN', title: 'Capture the desired outcome', text: 'Record the original task, expected behavior, relevant files, and final validation so the next session can be compared with this one.' });
    if (recommendations.length < 3) recommendations.push({ tag: 'CONTEXT', title: 'Provide reproducible details', text: 'When possible, include a minimal reproduction, exact error text, relevant environment, and constraints on unrelated changes.' });
    return { ...result, errorCount, warningCount, toolCount, uniqueFiles, repeatedErrors, categories, insights: insights.slice(0,5), recommendations: recommendations.slice(0,3) };
  }
  function renderAnalysis(analysis) {
    $('analysis-results').hidden = false;
    $('metric-events').textContent = analysis.entries.length.toLocaleString();
    $('metric-errors').textContent = analysis.errorCount.toLocaleString();
    $('metric-error-foot').textContent = `${analysis.warningCount} warning / retry line(s)`;
    $('metric-tools').textContent = analysis.toolCount.toLocaleString();
    $('metric-tokens').textContent = analysis.roughTokens.toLocaleString();
    $('insights-list').innerHTML = analysis.insights.map((item) => `<article class="insight"><span class="insight-icon ${item.tone}">${escapeText(item.icon)}</span><div><b>${escapeText(item.title)}</b><p>${escapeText(item.detail)}</p></div></article>`).join('');
    const maxCount = Math.max(1, ...analysis.categories.map((c) => c.count));
    $('activity-breakdown').innerHTML = analysis.categories.map((item) => `<div class="activity-row"><span class="activity-label">${escapeText(item.name)}</span><div class="activity-track"><div class="activity-fill ${item.kind === 'error' ? 'error-fill' : ''}" style="width:${Math.max(item.count ? 3 : 0, item.count / maxCount * 100)}%"></div></div><span class="activity-count">${item.count}</span></div>`).join('');
    $('recommendations-list').innerHTML = analysis.recommendations.map((item) => `<article class="recommendation"><span>${escapeText(item.tag)}</span><b>${escapeText(item.title)}</b><p>${escapeText(item.text)}</p></article>`).join('');
  }
  $('load-sample').addEventListener('click', async () => {
    try {
      const response = await fetch('sample-data/sample-session.jsonl');
      if (!response.ok) throw new Error('Sample file missing');
      $('log-input').value = await response.text();
      $('log-input-status').textContent = `${wordCount($('log-input').value)} words loaded from sample data`;
      showToast('Sample session loaded. Select Analyze session.');
    } catch {
      // Also works when opened using file:// where fetch is blocked.
      $('log-input').value = sampleDataFallback;
      $('log-input-status').textContent = 'Built-in sample loaded';
      showToast('Sample session loaded. Select Analyze session.');
    }
  });
  const sampleDataFallback = `{"type":"user","message":"Fix retry bug in payment service; provider timeout can cause duplicate charge. Please add regression test."}\n{"type":"tool_use","name":"read_file","path":"src/payment/retry.ts"}\n{"type":"tool_result","message":"Retry policy retries on timeout; idempotency key is not persisted."}\n{"type":"tool_use","name":"grep","query":"idempotency"}\n{"type":"tool_result","message":"src/payment/charge.ts: idempotency key generated for each attempt"}\n{"type":"assistant","message":"Implementing a stable idempotency key across retries."}\n{"type":"tool_use","name":"edit_file","path":"src/payment/retry.ts"}\n{"type":"tool_result","message":"Error: TypeError: cannot read property 'key' of undefined in retry.ts:42"}\n{"type":"assistant","message":"The test failed with TypeError: cannot read property 'key' of undefined. Inspect fixture setup before retrying."}\n{"type":"tool_use","name":"read_file","path":"tests/payment/retry.test.ts"}\n{"type":"tool_result","message":"Fixture did not include idempotency metadata."}\n{"type":"tool_use","name":"edit_file","path":"tests/payment/retry.test.ts"}\n{"type":"assistant","message":"Added a timeout retry regression test. Need run tests."}\n{"type":"tool_use","name":"bash","command":"npm test -- retry.test.ts"}\n{"type":"tool_result","message":"Tests passed: 8 passed, 0 failed."}`;
  $('log-input').addEventListener('input', () => {
    $('log-input-status').textContent = $('log-input').value.trim() ? `${$('log-input').value.split(/\r?\n/).filter((s) => s.trim()).length} non-empty line(s) ready` : 'No session loaded yet';
  });
  $('log-file').addEventListener('change', async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      $('log-input').value = await file.text();
      $('log-input-status').textContent = `${file.name} · ${file.size.toLocaleString()} bytes`;
      showToast('File loaded locally. Select Analyze session.');
    } catch { showToast('Could not read this file. Try a plain-text log or JSONL file.'); }
    event.target.value = '';
  });
  $('analyze-session').addEventListener('click', () => {
    const text = $('log-input').value;
    if (!text.trim()) { $('log-input').focus(); showToast('Paste a log or load sample data first.'); return; }
    appState.lastAnalysis = buildAnalysis(text);
    renderAnalysis(appState.lastAnalysis);
    $('analysis-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
    showToast('Session analyzed in this browser.');
  });
  $('download-report').addEventListener('click', () => {
    const a = appState.lastAnalysis;
    if (!a) return;
    const lines = [
      'GOBBO SESSION ANALYSIS', '=======================', '',
      `Non-empty lines/events: ${a.entries.length}`, `Error signals: ${a.errorCount}`, `Warning/retry signals: ${a.warningCount}`, `Tool-like lines: ${a.toolCount}`, `Approximate tokens (characters / 4): ${a.roughTokens}`, `JSONL records parsed: ${a.parsedJson}`, `Unique filename references: ${a.uniqueFiles.length}`, '',
      'INSIGHTS', ...a.insights.map((i) => `- ${i.title}: ${i.detail}`), '', 'RECOMMENDATIONS', ...a.recommendations.map((r) => `- ${r.title}: ${r.text}`), '',
      'LIMITATION: Pattern-based estimate. Not vendor-specific telemetry. Review the source log and validate findings independently.'
    ];
    downloadText('gobbo-session-report.txt', lines.join('\n'));
  });
})();
