# Podcast Youci course library

Static course data for the Podcast Youci browser extension. GitHub Pages serves one
UTF-8 JSON document per ListenLeap episode from:

`https://yuwenying1003-lang.github.io/podcast-youci-library/courses/<episode-id>.json`

The extension can therefore receive new courses without being rebuilt or reinstalled.

## Version 3 application

- Remote UI: `https://yuwenying1003-lang.github.io/podcast-youci-library/app/`
- Cornell 7: append `?podcastId=8b77ac948ba43d5d084d03e194ce7ecb`
- Extension source: `extensions/` (one shared bridge, two platform manifests)
- Architecture and security: [docs/architecture-v3.md](docs/architecture-v3.md)
- Interface design and attribution: [docs/design-system.md](docs/design-system.md)
- Messaging contract: [docs/message-protocol.md](docs/message-protocol.md)
- Upgrade/testing: [docs/migration-v3.md](docs/migration-v3.md) and [docs/test-report.md](docs/test-report.md)

Ordinary UI changes under `app/` and course changes under `courses/` are published by
GitHub Pages and do not require an extension reinstall. Changes to the bridge, manifest,
permissions, or protocol do require a new extension package.

## Add a course

1. Extract the episode ID from the ListenLeap podcast URL.
2. Create `courses/<episode-id>.json` following [docs/course-schema.md](docs/course-schema.md).
3. Keep quotations short and sourced. Mark constructed examples as `adapted`; do not
   publish full copyrighted transcripts without permission.
4. Do not invent timestamps. Unit boundaries are navigation ranges, not verified
   exact-sentence ranges.
5. Run `python scripts/validate_courses.py`.
6. Commit and push. The validation workflow must pass before relying on the update.

## Validation and publishing

The validator checks every course for JSON syntax, filename/episode-ID agreement,
required metadata and learning collections, time formats and ordering, unit references,
explicit duplicate IDs, and source labels. GitHub Actions runs it on pushes and pull
requests. GitHub Pages is configured to publish the `main` branch root.

## Guided Speaking Practice

Every reusable pattern provides daily-life, social-conversation, and work-communication
prompts with a goal, keyword bank, sentence starter, and hidden reference answer. “Check
My Sentence” sends the learner's sentence to the authenticated Cloudflare Worker; Gemini
returns structured feedback without treating the reference answer as the only valid answer.
The Gemini key remains in Cloudflare Secrets. The API enforces Access-based sign-in,
short-lived sessions, input limits, burst rate limits, and a daily per-user quota.

## Troubleshooting

- **404 for a course:** confirm the lowercase episode ID and filename match exactly,
  the file is on `main`, and the Pages deployment has completed.
- **Course rejected by the extension:** fetch the JSON URL directly, run the validator,
  and check the browser console for schema or network errors.
- **Stale content:** hard-refresh or disable the browser cache temporarily; Pages/CDN
  updates can lag behind a commit.
- **CORS failure:** confirm the request uses the public `github.io` URL, not a GitHub
  repository/blob URL, and inspect the response for `Access-Control-Allow-Origin`.
- **Pages not deployed:** in repository Settings → Pages, select **Deploy from a branch**,
  branch **main**, directory **/(root)**, then inspect the Pages Actions run.

Build both installable packages with `python scripts/package_extensions.py`. CI publishes
the ZIPs as a workflow artifact after validation and protocol tests pass.

The original archive instructions are retained in `README.archive.md` for provenance.
