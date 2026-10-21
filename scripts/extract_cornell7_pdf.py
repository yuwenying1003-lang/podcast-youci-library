"""Recover PDF paragraphs without inventing sentence timestamps or fixing speech."""
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.tools' / 'pdf-extract'))
import pymupdf

pdfs = list((ROOT / 'source-materials').glob('*Cornell*.pdf'))
if len(pdfs) != 1:
    raise RuntimeError(f'Expected one Cornell PDF, found {len(pdfs)}')
pdf = pdfs[0]
doc = pymupdf.open(pdf)
coverage = json.loads((ROOT / 'reports/cornell7-coverage-index.json').read_text(encoding='utf-8'))
pages, segments, alignment = [], [], []
for page_number, page in enumerate(doc, 1):
    blocks = sorted(page.get_text('blocks'), key=lambda block: (block[1], block[0]))
    paragraphs = []
    for block in blocks:
        raw = block[4].strip()
        if raw == 'ListenLeap' or raw.startswith('www.listleap.com'):
            continue
        paragraphs.append((' '.join(raw.split()), raw, [round(v, 2) for v in block[:4]]))
    expected = [s for s in coverage['segments'] if s['page'] == page_number]
    alignment.append({'page': page_number, 'pdf_paragraphs': len(paragraphs), 'indexed_segments': len(expected), 'count_matches': len(paragraphs) == len(expected)})
    pages.append({'page': page_number, 'raw_text': page.get_text()})
    for i, (text, raw, bbox) in enumerate(paragraphs):
        segments.append({'page': page_number, 'paragraph_on_page': i + 1, 'segment': expected[i]['segment'] if len(paragraphs) == len(expected) else None, 'text': text, 'raw_text': raw, 'bbox': bbox, 'kind': 'title' if page_number == 1 and i == 0 else 'transcript', 'alignment_status': 'page_count_and_order_matched' if len(paragraphs) == len(expected) else 'requires_alignment_review'})
result = {'source_file': pdf.name, 'source_sha256': hashlib.sha256(pdf.read_bytes()).hexdigest(), 'page_count': len(doc), 'extraction': 'PyMuPDF text blocks; whitespace normalized only; headers excluded; title retained as historical segment 1; no transcript wording corrections or timestamps', 'alignment': alignment, 'pages': pages, 'transcript': {'segments': segments}}
out = ROOT / 'reports/cornell7-transcript-recovered.json'
out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'pages': len(doc), 'paragraphs': len(segments), 'mismatched_pages': [a for a in alignment if not a['count_matches']]}, indent=2))
