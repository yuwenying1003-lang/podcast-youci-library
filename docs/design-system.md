# Podlingora interface design

Podlingora uses a calm green editorial interface optimized for a narrow embedded learning panel.
The visual direction is inspired by the design principles documented in
[Acme HTML Style](https://github.com/kaiychen9/acme-html-style): restrained semantic colors,
compact editorial structure, system-sans typography,
1.5px component borders, and short interaction transitions.

The implementation is original CSS adapted to Podlingora's vocabulary, speaking, audio,
and progress controls. It does not copy gallery images or generated example pages. Acme
HTML Style is available under the MIT License; its repository credits the original
html-effectiveness project for the underlying design language.

## Interface tokens

- Page: pale sage `#f7f9f6`; cards: white; text: deep forest `#163526`.
- Primary action: forest green `#1c6444`; success/progress: muted green `#4f7a5d`.
- Headings: system sans at weight 750; body: system sans; unit numbers and metadata:
  system monospace.
- Primary component borders: 1.5px; cards: 12px radius; controls: 8px radius.
- Feedback is 120–150ms. Reduced-motion preferences disable nonessential transitions.
- Coarse pointers receive 46px controls; narrow panels reduce padding while preserving
  readable vocabulary, Chinese explanations, examples, and memory tips.
