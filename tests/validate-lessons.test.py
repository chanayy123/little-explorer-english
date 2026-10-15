"""Negative curriculum guards, runnable without third-party packages."""
import copy
import importlib.util
import json
import xml.etree.ElementTree as ET
from pathlib import Path
root = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('validator', root / 'scripts/validate_lessons.py')
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
data = json.loads((root / 'dist/assets/lessons.json').read_text())
symbols = {s.attrib['id'] for s in ET.parse(root / 'dist/assets/lesson-art.svg').iter() if s.tag.endswith('symbol')}
def course(d, identifier):
    return next(c for c in d['lessons'] if c['id'] == identifier)
def rejects(label, mutate):
    altered = copy.deepcopy(data)
    mutate(altered)
    try:
        mod.validate_library(altered, symbols)
    except (AssertionError, KeyError):
        print('PASS reject:', label)
        return
    raise AssertionError('Accepted invalid curriculum: ' + label)
friday='2026-10-16-flower'
weekend='2026-10-17-delivery'
rejects('duplicate primary date', lambda d: course(d,'2026-10-16-review').pop('supplemental'))
rejects('missing Friday', lambda d: d['lessons'].remove(course(d,friday)))
rejects('wrong weekday type', lambda d: course(d,friday).update(type='delivery'))
rejects('wrong weekend type', lambda d: course(d,weekend).update(type='word'))
rejects('unknown illustration', lambda d: course(d,friday).update(art='missing-art'))
rejects('old progress key', lambda d: course(d,'2026-10-08-block').update(storageKey='wrong'))
rejects('foreign week reference', lambda d: course(d,weekend)['reviewOf'].__setitem__(0,'2026-10-08-block'))
rejects('unlearned distractor', lambda d: course(d,weekend)['missions'][0]['options'].__setitem__(1,'book'))
rejects('duplicate mission word', lambda d: course(d,weekend)['missions'][0].update(word='water'))
rejects('missing mission', lambda d: course(d,weekend)['missions'].pop())
rejects('no scene change', lambda d: course(d,weekend)['missions'][0].update(after=course(d,weekend)['missions'][0]['before']))
rejects('unknown instruction pattern', lambda d: course(d,weekend)['missions'][0].update(instruction='Build a castle.'))
rejects('new English target', lambda d: course(d,weekend)['missions'][0].update(target='garden'))
print('PASS 13 negative curriculum cases')
