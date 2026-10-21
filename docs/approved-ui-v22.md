# Approved UI v2.2 integration

The online learning panel follows the approved compact prototype while keeping
the existing production services.

## Production adapters retained

- Original audio: `AudioClient` and the versioned extension message protocol.
  Unit playback uses `AUDIO_PLAY_UNIT`; a sentence segment is only rendered when
  its course item contains a verified `clip`, then uses `AUDIO_PLAY_RANGE`.
- English pronunciation: `TtsService`, including the selected voice, rate, and
  cancellation of previous speech.
- AI feedback: `SpeakingFeedbackClient` and the existing Cloudflare Access
  session. The UI does not contain a fallback score or simulated response.
- Existing progress: `ProgressStore` remains unchanged. The UI adds
  `progress.ui` for the selected section/filter without changing ratings,
  lessons, notes, drafts, feedback history, or completion fields.

## Collection storage

`podlingora-learning-collection-v1` is a global browser-local collection. Each
entry has a stable podcast/type/normalized-text ID plus episode and Unit source.
It does not replace the existing per-podcast progress key. The collection area
is fixed at 170px (160px on narrow screens) and scrolls internally.

## Data and scaling

Unit navigation is generated from `course.units` and horizontally scrolls. No
Unit or item count is fixed. Words and Phrases use bounded scrolling lists;
Chunks use a bounded selector and production AI detail panel. Optional
`recap_zh`, `difficulty`, `collocations`, `memory_trick`, `mental_image`, and
`mnemonic_type` fields can enrich a course without breaking legacy JSON.

The Cornell 7 course retains its eleven semantic Units and adds cautious Chinese
recaps. It still has no verified sentence-level clips, so no original-segment
button is presented for those items.
