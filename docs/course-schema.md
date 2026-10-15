# Course JSON schema

Each file is named `courses/<episode-id>.json`. `meta.episodeId` must equal the filename
stem. The machine-readable companion is [course.schema.json](course.schema.json).

Required top-level fields:

- `meta`: `episodeId`, `title`, and a verification/provenance note.
- `units`: ordered navigation sections with `start`, `end`, `title`, `preview`, and
  `question`.
- `vocab`: vocabulary records. Current content supports both time-addressed legacy
  records and unit-addressed records.
- `expressions`: phrase records with `time`, `text`, translation, definition, and example.
- `patterns`: one array per learning unit, containing speaking/example-sentence prompts.

Times use `MM:SS` (minutes may exceed 59). Unit `start`/`end` values identify broad
sections only. An exact-sentence playback control must require separately verified start
and end bounds; a single `time` value or unit boundary is not an exact sentence range.

Use `example_source: "adapted"` for constructed learning examples. Use
`transcript_verified: true` only after checking the wording against an authorized source.
Unknown extra fields are allowed for backward-compatible extension evolution.
