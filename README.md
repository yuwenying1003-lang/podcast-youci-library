# Podcast Youci course library

Static course data for the Podcast Youci browser extension. GitHub Pages serves one
UTF-8 JSON document per ListenLeap episode from:

`https://yuwenying1003-lang.github.io/podcast-youci-library/courses/<episode-id>.json`

The extension can therefore receive new courses without being rebuilt or reinstalled.

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

The original archive instructions are retained in `README.archive.md` for provenance.
