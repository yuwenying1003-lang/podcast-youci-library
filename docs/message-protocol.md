# Message protocol v1

The iframe sends requests only to `https://app.listenleap.com`; the content script
accepts them only from its iframe window and
`https://yuwenying1003-lang.github.io`. The iframe accepts responses only from its
parent window and `https://app.listenleap.com`.

Every request contains `protocol: "podcast-youci"`, `version: 1`, a unique `requestId`,
an allowlisted `action`, the active `podcastId`, and an object `payload`. The bridge
rejects mismatched podcast IDs and never uses `"*"` as a target origin.

Actions: `AUDIO_PLAY`, `AUDIO_PAUSE`, `AUDIO_SEEK`, `AUDIO_PLAY_RANGE`,
`AUDIO_PLAY_UNIT`, `AUDIO_GET_STATE`, `AUDIO_SET_RATE`, `AUDIO_CLEAR_RANGE`,
`PANEL_COLLAPSE`, `PROGRESS_GET`, and `PROGRESS_SET`.

Responses contain the same protocol/version/request ID, `type: "RESPONSE"`, `success`,
and either `payload` or `{error: {code, message}}`. The web client times out requests
after five seconds. Exact ranges are additionally limited to 90 seconds by the bridge.
