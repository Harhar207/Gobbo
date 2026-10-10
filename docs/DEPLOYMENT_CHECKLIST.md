# Deployment checklist

## Before publishing
- [ ] Replace generic GitHub links in `index.html` with the repository URL.
- [ ] Confirm the project name and description are accurate.
- [ ] Review all content for employer names, private code, or confidential details.
- [ ] Test at desktop and mobile widths.
- [ ] Open `app.html` directly and verify prompt coach functions.
- [ ] Run with `python -m http.server 8000` and test loading sample JSONL.
- [ ] Analyze the included sample and download a report.
- [ ] Test upload with a harmless `.txt` or `.jsonl` file.
- [ ] Read the privacy section and README; do not claim the tool uses AI or official agent telemetry.

## After publishing
- [ ] Open the published landing page and app URL in a private/incognito window.
- [ ] Verify the sample JSONL can load on the hosted version.
- [ ] Test the browser console for errors.
- [ ] Add a clear repository About description and topics.
- [ ] Add a short demo GIF or screenshots only after the live app is working.
- [ ] Invite a few developers to try it and collect feedback without collecting their private logs.
