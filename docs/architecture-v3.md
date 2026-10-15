# Podcast Youci v3 architecture

The extension is a stable, privileged integration shell. It detects the current
ListenLeap podcast, owns a shadow-DOM panel, embeds the allowlisted GitHub Pages app,
and controls only the page's HTML5 audio. It never evaluates remotely downloaded code
inside the extension context.

The `/app/` site owns all learning presentation, navigation, TTS, and course loading.
It fetches `/courses/<podcastId>.json` with `cache: no-store`; the refresh button adds a
cache-busting query. An unknown ID renders an explicit no-course state and never loads
Cornell 7 as a fallback.

One content script is packaged with two MV3 manifests. Desktop and Yandex Android thus
share all behavior; only product naming differs. The default panel width is 35% on
desktop and 40% at tablet widths. Width, side, and visibility persist per browser.

Audio ranges are event-driven through `timeupdate`. Unit ranges may be approximate.
Exact playback is exposed only for an item whose `clip` has `verified: true`, non-empty
`quote`, and valid start/end times no more than 90 seconds apart. Clearing or completing
a range restores ordinary continuous playback.

Progress uses versioned, podcast-scoped local storage in the remote app. The extension
also implements `PROGRESS_GET`/`PROGRESS_SET` in `chrome.storage.local` as the stable
bridge for browsers where embedded storage proves unreliable. Android persistence must
still be verified on a real Yandex device before switching the app to that fallback.
