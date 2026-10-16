# Podlingora interface design

Podlingora uses a warm editorial interface optimized for a narrow embedded learning panel.
The visual direction is inspired by the design principles documented in
[Acme HTML Style](https://github.com/kaiychen9/acme-html-style): warm ivory surfaces,
terracotta accents, restrained semantic colors, serif headings, system-sans body text,
1.5px component borders, and short interaction transitions.

The implementation is original CSS adapted to Podlingora's vocabulary, speaking, audio,
and progress controls. It does not copy gallery images or generated example pages. Acme
HTML Style is available under the MIT License; its repository credits the original
html-effectiveness project for the underlying design language.

## Interface tokens

- Page: warm ivory `#faf9f5`; cards: white; text: warm near-black `#141413`.
- Primary action: terracotta `#d97757`; success/progress: muted olive `#788c5d`.
- Headings: system serif at weight 500; body: system sans; unit numbers and metadata:
  system monospace.
- Primary component borders: 1.5px; cards: 12px radius; controls: 8px radius.
- Feedback is 120–150ms. Reduced-motion preferences disable nonessential transitions.
- Coarse pointers receive 46px controls; narrow panels reduce padding while preserving
  readable vocabulary, Chinese explanations, examples, and memory tips.
