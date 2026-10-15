"""Check the daily curriculum, legacy compatibility, review references and artwork."""
import json
import re
import xml.etree.ElementTree as ET
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DAILY_ADVENTURE_START = date(2026, 10, 15)


def validate_library(data, symbols):
    """Validate a library against known SVG symbol IDs; return vocabulary count."""
    assert data['version'] == 1, 'Unsupported course library version'
    assert data['timeZone'] == 'Asia/Shanghai' and data['releaseTime'] == '00:00'
    lessons = data['lessons']
    assert lessons and len({c['id'] for c in lessons}) == len(lessons), 'Duplicate course ID'
    assert all(c['id'] for c in lessons), 'Missing course ID'
    assert [c['date'] for c in lessons] == sorted(c['date'] for c in lessons), 'Courses must be chronological'
    by_id = {c['id']: c for c in lessons}
    by_date = defaultdict(list)
    for course in lessons:
        day = date.fromisoformat(course['date'])
        assert day.isoformat() == course['date'], f'Non-ISO course date: {course["id"]}'
        assert isinstance(course.get('supplemental', False), bool), f'Invalid supplemental flag: {course["id"]}'
        if course.get('supplemental'):
            assert course['type'] == 'review' and day.weekday() == 4 and day >= DAILY_ADVENTURE_START, f'Only legacy Friday reviews may be supplemental: {course["id"]}'
        by_date[course['date']].append(course)
    for key, courses in by_date.items():
        primary = [c for c in courses if not c.get('supplemental')]
        assert len(primary) == 1, f'Each date needs exactly one default lesson: {key}'
        assert len(courses) <= 2, f'At most one supplemental review is allowed: {key}'
        if len(courses) == 2:
            assert any(c.get('supplemental') for c in courses), f'Duplicate date without supplemental review: {key}'
    # Once the new rhythm begins, every prepared day has one default activity.
    last_day = max(date.fromisoformat(key) for key in by_date)
    current = DAILY_ADVENTURE_START
    while current <= last_day:
        assert current.isoformat() in by_date, f'Missing daily activity: {current}'
        current += timedelta(days=1)

    legacy = by_id.get('2026-10-08-block')
    assert legacy and legacy['type'] == 'block' and legacy['date'] == '2026-10-08', 'Original block course must remain available'
    assert legacy['storageKey'] == 'little-explorer-block-v1', 'Do not change legacy block storage'
    known = set()
    for c in lessons:
        day = date.fromisoformat(c['date'])
        assert c['type'] in ['block', 'word', 'review', 'delivery'] and c['title'] and c['theme'] and c['minutes']
        if day >= DAILY_ADVENTURE_START and not c.get('supplemental'):
            expected = 'word' if day.weekday() < 5 else 'delivery'
            assert c['type'] == expected, f'Expected {expected} for {c["id"]}'
        elif day < DAILY_ADVENTURE_START:
            assert day.weekday() < 5 and c['type'] != 'delivery', f'Unexpected legacy weekend activity: {c["id"]}'
        refs = c.get('reviewOf', [])
        assert len(refs) == len(set(refs)), f'Duplicate review reference: {c["id"]}'
        for ref in refs:
            assert ref in by_id and by_id[ref]['date'] < c['date'], f'Bad review reference: {ref}'
            assert by_id[ref]['type'] in ['block', 'word'], f'Review references must point to vocabulary: {ref}'
        if c['type'] in ['block', 'word']:
            assert re.fullmatch('[a-z]+', c['word']) and c['word'] not in known, f'Duplicate or invalid new word: {c["id"]}'
            assert c['art'] in symbols, f'Missing word artwork: {c["art"]}'
            known.add(c['word'])
        if c['type'] == 'word':
            assert len(c['phrases']) == 2 and all(p['text'] and p['translation'] and p['action'] for p in c['phrases'])
            assert len(c['choices']) == 3 and len(set(c['choices'])) == 3 and c['word'] in c['choices']
            assert all(x in symbols for x in c['choices']), f'Missing choice artwork: {c["id"]}'
            assert all(c[x] for x in ['phonics', 'ipa', 'realTask', 'context', 'meaning'])
            if c['word'] == 'water':
                assert all(not re.search(r'\ba water\b', p['text'], re.I) for p in c['phrases'])
        if c['type'] == 'review':
            assert c['questions'] and c['practical'] and re.fullmatch('[a-z]+', c['writeWord'])
            reviewed = {by_id[x]['word'] for x in refs}
            assert c['writeWord'] in reviewed
            for q in c['questions']:
                assert q['kind'] in ['picture', 'text'] and q['prompt'] and q['speak']
                assert len(q['options']) == 3 and len(set(q['options'])) == 3 and q['answer'] in q['options']
                if q['kind'] == 'picture':
                    assert q['answer'] in reviewed and all(x in symbols for x in q['options'])
                else:
                    assert any(re.search(r'\b' + re.escape(w) + r'\b', q['speak'], re.I) for w in reviewed)
        if c['type'] == 'delivery':
            assert day.weekday() in [5, 6], f'Delivery activities belong on weekends: {c["id"]}'
            monday = day - timedelta(days=day.weekday())
            week_days = {(monday + timedelta(days=i)).isoformat() for i in range(5)}
            assert len(refs) == 5, f'Delivery needs five weekday references: {c["id"]}'
            assert {by_id[ref]['date'] for ref in refs} == week_days, f'Delivery must review its own Monday–Friday words: {c["id"]}'
            assert all(by_id[ref]['type'] == 'word' and not by_id[ref].get('supplemental') for ref in refs)
            week_words = {by_id[ref]['word'] for ref in refs}
            missions = c['missions']
            expected_stage_ids = [m['word'] + '-delivery' for m in missions]
            legacy_delivery_ids = {'2026-10-17-delivery', '2026-10-18-delivery', '2026-10-24-delivery', '2026-10-25-delivery'}
            if c['id'] not in legacy_delivery_ids or 'growthStageIds' in c:
                assert c.get('growthStageIds') == expected_stage_ids, f'Declare stable delivery growth stage IDs: {c["id"]}'
            assert len(missions) == 5 and {m['word'] for m in missions} == week_words, f'Delivery missions must cover all five weekly words once: {c["id"]}'
            for mission in missions:
                word, options = mission['word'], mission['options']
                assert len(options) == 3 and len(set(options)) == 3 and word in options, f'Invalid delivery choices: {c["id"]}/{word}'
                assert set(options) <= week_words, f'Delivery cannot introduce unlearned choice words: {c["id"]}/{word}'
                assert all(option in symbols for option in options), f'Missing delivery artwork: {c["id"]}/{word}'
                for field in ['target', 'before', 'after', 'help']:
                    value = mission[field]
                    assert isinstance(value, str) and re.search(r'[\u3400-\u9fff]', value) and not re.search('[A-Za-z]', value), f'Delivery {field} must be a Chinese instruction: {c["id"]}/{word}'
                assert mission['before'] != mission['after'], f'Delivery must change the scene: {c["id"]}/{word}'
                assert mission['instruction'] == f'Find the {word}.', f'Use the shared simple English listening instruction: {c["id"]}/{word}'
    # Saturday and Sunday reuse the interaction, but have distinct scene missions.
    for c in lessons:
        if c['type'] != 'delivery' or date.fromisoformat(c['date']).weekday() != 6:
            continue
        saturday = (date.fromisoformat(c['date']) - timedelta(days=1)).isoformat()
        prior = next((item for item in by_date[saturday] if item['type'] == 'delivery'), None)
        assert prior, f'Sunday needs its Saturday companion: {c["id"]}'
        saturday_missions = {m['word']: m for m in prior['missions']}
        assert all(m['before'] != saturday_missions[m['word']]['before'] and m['after'] != saturday_missions[m['word']]['after'] for m in c['missions']), f'Give Sunday new scenes: {c["id"]}'
    return len(known)


def main():
    data = json.loads((ROOT / 'dist/assets/lessons.json').read_text())
    art = ET.parse(ROOT / 'dist/assets/lesson-art.svg')
    symbol_ids = [s.attrib.get('id') for s in art.iter() if s.tag.endswith('symbol')]
    assert len(symbol_ids) == len(set(symbol_ids)), 'Duplicate illustration symbol ID'
    known_count = validate_library(data, set(symbol_ids))
    supplemental_count = sum(bool(c.get('supplemental')) for c in data['lessons'])
    print(f'Validated {len(data["lessons"])} courses ({supplemental_count} supplemental), {known_count} distinct new words, daily scheduling, illustrations and review references.')


if __name__ == '__main__':
    main()
