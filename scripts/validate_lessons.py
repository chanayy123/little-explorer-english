"""Check curriculum shape, vocabulary, assets and chronological review references."""
import json
import re
import xml.etree.ElementTree as ET
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / 'dist/assets/lessons.json').read_text())
assert data['timeZone'] == 'Asia/Shanghai' and data['releaseTime'] == '00:00'
lessons = data['lessons']
assert lessons and len({c['id'] for c in lessons}) == len(lessons)
assert len({c['date'] for c in lessons}) == len(lessons)
by_id = {c['id']: c for c in lessons}
art = ET.parse(ROOT / 'dist/assets/lesson-art.svg')
symbols = {s.attrib.get('id') for s in art.iter() if s.tag.endswith('symbol')}
known = set()
for c in sorted(lessons, key=lambda x: x['date']):
    day = date.fromisoformat(c['date'])
    assert day.weekday() < 5, f'Unexpected weekend lesson: {c["id"]}'
    assert c['type'] in ['block', 'word', 'review'] and c['title'] and c['theme']
    for ref in c.get('reviewOf', []):
        assert ref in by_id and by_id[ref]['date'] < c['date'], f'Bad review reference: {ref}'
    if c['type'] in ['block', 'word']:
        assert re.fullmatch('[a-z]+', c['word']) and c['word'] not in known
        assert c['art'] in symbols
        known.add(c['word'])
    if c['type'] == 'word':
        assert len(c['phrases']) == 2 and all(p['text'] and p['translation'] and p['action'] for p in c['phrases'])
        assert len(c['choices']) == 3 and len(set(c['choices'])) == 3 and c['word'] in c['choices']
        assert all(x in symbols for x in c['choices'])
        assert all(c[x] for x in ['phonics', 'ipa', 'realTask', 'context', 'meaning'])
        if c['word'] == 'water':
            assert all(not re.search(r'\ba water\b', p['text'], re.I) for p in c['phrases'])
    if c['type'] == 'review':
        assert c['questions'] and c['practical'] and re.fullmatch('[a-z]+', c['writeWord'])
        reviewed = {by_id[x].get('word') for x in c['reviewOf']}
        assert c['writeWord'] in reviewed
        for q in c['questions']:
            assert q['kind'] in ['picture', 'text'] and q['prompt'] and q['speak']
            assert len(q['options']) == 3 and len(set(q['options'])) == 3 and q['answer'] in q['options']
            if q['kind'] == 'picture':
                assert q['answer'] in reviewed and all(x in symbols for x in q['options'])
            else:
                assert any(re.search(r'\b' + re.escape(w) + r'\b', q['speak'], re.I) for w in reviewed if w)
print(f'Validated {len(lessons)} courses, {len(known)} distinct new words, all illustrations and review references.')
