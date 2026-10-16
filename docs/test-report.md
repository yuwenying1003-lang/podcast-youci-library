# v3 test report

## Automated

- Course syntax, IDs, required collections, time ordering, unit references, source
  labels, duplicate explicit IDs, and verified clip bounds: covered by Python validation.
- Podcast ID rejection, action allowlist, protocol/version/request matching, unknown
  course behavior, and course-ID mismatch: covered by Node tests.
- Both MV3 manifests and shared-source packaging: checked by the packaging script.
- Guided scenarios require daily, social, and work variants with goals, 2–4 keywords,
  starters, and reference answers; AI input/output contracts and frontend key isolation
  are covered by Node tests.

## Static/manual inspection passed

- Remote UI does not bundle or silently substitute Cornell 7.
- Message target origins, event origins, and source windows are explicit.
- Exact-sentence controls remain disabled without verified `clip` metadata.
- Range playback stops from `timeupdate`, clears its range, and does not use a tight loop.
- Panel shadow DOM and pointer-event boundary isolate ListenLeap controls.

## Manual checklist (required before broad rollout)

- Chrome and Edge: load unpacked package; open Cornell 7; resize/collapse/switch sides;
  change units; use TTS; test native ListenLeap controls; verify range stop with a future
  authorized test clip.
- Course switching: navigate between ListenLeap IDs without reloading and confirm the
  iframe changes to the matching ID or explicit no-course state.
- Android Yandex on Xiaomi Pad in desktop-site mode: repeat panel, touch resize, TTS voice,
  audio, refresh, and progress-persistence tests.
- Confirm whether ListenLeap replaces its audio element during navigation and whether
  subtitle highlighting remains synchronized after direct seeking.
- Sign in through Cloudflare Access and submit a natural answer, a fixable answer, and an
  incorrect answer to confirm live Gemini classifications and daily quota reporting.

Real Chrome, Edge, and Yandex device results are not claimed until this checklist is run.
