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

- Page: cream `#faf9f5`; cards: white; text: deep forest `#163526`.
- Primary action: forest green `#244d3b`; hover/secondary accent: sage `#477a61`;
  selected surfaces: light sage `#e5efe7`.
- Headings: system sans at weight 750; body: system sans; unit numbers and metadata:
  system monospace.
- Primary component borders: 1.5px; cards: 12px radius; controls: 8px radius.
- Feedback is 120–150ms. Reduced-motion preferences disable nonessential transitions.
- Coarse pointers receive 46px controls; narrow panels reduce padding while preserving
  readable vocabulary, Chinese explanations, examples, and memory tips.

## Compact study layout

- Vocabulary keeps the English word, IPA, definition, and example centered and immediately
  readable; Chinese meaning and memory guidance are separate, user-controlled disclosures.
- The five persistent vocabulary and expression actions share one non-wrapping grid. Icon-only actions keep
  accessible names and tooltips, with larger targets for coarse pointers.
- Speaking practice shows one situation, one single-line response field, and essential actions.
  Scenario goals, keyword banks, and starter prompts remain available in course data and AI
  context but are not repeated in the visible practice card.
- Source metadata, verified-clip rules, authentication, and saved progress remain internal and
  surface only when the learner needs to act or recover from an error.

## Icons

- Controls use a local, reusable inline-SVG set inspired by Lucide's rounded line style:
  19px default size, 2px strokes, round line caps, and round joins.
- Icons inherit the control color, require no CDN or icon font, and remain decorative beside
  accessible button names. Review stars fill only when the saved review state is active.
