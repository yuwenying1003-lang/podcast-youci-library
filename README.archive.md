# Course library

Publish as public GitHub Pages (Settings > Pages > deploy from branch > main / root).
One course per file: `courses/<ListenLeap id>.json`. `meta.episodeId` must exactly match the filename and target URL.

Each course JSON requires `units` (array of `{start,end,title,preview,question}`), `vocab` (array of `{unit,word,cn,definition,tip,example}`), `expressions` (array of `{time,text,cn,definition,example}`) and `patterns` (array of arrays of `{text,cn,example,prompt}`). Times use mm:ss. Keep original quotes limited and verified; examples otherwise labeled adapted.

Update JSON on GitHub; reload course on tablet.
